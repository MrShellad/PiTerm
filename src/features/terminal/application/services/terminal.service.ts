import { invoke } from '@tauri-apps/api/core';

const WRITE_BATCH_DELAY_MS = 8;
const WRITE_BATCH_MAX_CHARS = 4096;

type WriteWaiter = {
  resolve: () => void;
  reject: (err: unknown) => void;
};

type TerminalWriteQueue = {
  buffer: string;
  waiters: WriteWaiter[];
  timer: number | null;
  chain: Promise<void>;
};

const writeQueues = new Map<string, TerminalWriteQueue>();

const getWriteQueue = (id: string): TerminalWriteQueue => {
  let queue = writeQueues.get(id);
  if (!queue) {
    queue = {
      buffer: '',
      waiters: [],
      timer: null,
      chain: Promise.resolve(),
    };
    writeQueues.set(id, queue);
  }
  return queue;
};

const clearWriteTimer = (queue: TerminalWriteQueue) => {
  if (queue.timer !== null) {
    window.clearTimeout(queue.timer);
    queue.timer = null;
  }
};

const shouldFlushImmediately = (buffer: string, data: string) =>
  data.includes('\r') ||
  data.includes('\n') ||
  buffer.length >= WRITE_BATCH_MAX_CHARS;

const flushWriteQueue = (id: string): Promise<void> => {
  const queue = writeQueues.get(id);
  if (!queue) return Promise.resolve();

  clearWriteTimer(queue);
  if (!queue.buffer) return queue.chain;

  const payload = queue.buffer;
  const waiters = queue.waiters;
  queue.buffer = '';
  queue.waiters = [];

  queue.chain = queue.chain
    .catch(() => {})
    .then(() => invoke<void>('write_ssh', { id, data: payload }))
    .then(
      () => {
        waiters.forEach(({ resolve }) => resolve());
      },
      (err) => {
        waiters.forEach(({ reject }) => reject(err));
      }
    );

  return queue.chain;
};

const enqueueSshWrite = (id: string, data: string): Promise<void> => {
  if (!data) return Promise.resolve();

  const queue = getWriteQueue(id);
  const writePromise = new Promise<void>((resolve, reject) => {
    queue.waiters.push({ resolve, reject });
  });

  queue.buffer += data;

  if (shouldFlushImmediately(queue.buffer, data)) {
    void flushWriteQueue(id);
  } else if (queue.timer === null) {
    queue.timer = window.setTimeout(() => {
      void flushWriteQueue(id);
    }, WRITE_BATCH_DELAY_MS);
  }

  return writePromise;
};

const disposeSshWriteQueue = (id: string) => {
  const queue = writeQueues.get(id);
  if (!queue) return;

  clearWriteTimer(queue);
  queue.waiters.forEach(({ reject }) =>
    reject(new Error('SSH write queue disposed'))
  );
  writeQueues.delete(id);
};

export const TerminalService = {
  quickConnect: async (params: {
    id: string;
    ip: string;
    port: number;
    username: string;
    password?: string | null;
    privateKey?: string | null;
    passphrase?: string | null;
  }) => {
    disposeSshWriteQueue(params.id);
    return invoke('quick_connect', params);
  },

  connectSsh: async (serverId: string, sessionId: string) => {
    disposeSshWriteQueue(sessionId);
    return invoke('connect_ssh', { serverId, sessionId });
  },

  disconnectSsh: async (id: string) => {
    try {
      await flushWriteQueue(id);
    } catch {
      // Disconnect must still run if the pending shell write already failed.
    }

    try {
      return await invoke('disconnect_ssh', { id });
    } finally {
      disposeSshWriteQueue(id);
    }
  },

  writeSsh: (id: string, data: string) => enqueueSshWrite(id, data),

  flushSshWrites: (id: string) => flushWriteQueue(id),

  resizeSsh: async (id: string, rows: number, cols: number) => 
    invoke('resize_ssh', { id, rows, cols }),

  touchSshSession: async (id: string) =>
    invoke('touch_ssh_session', { id }),

  checkIsDir: async (id: string, path: string) => 
    invoke<boolean>('sftp_check_is_dir', { id, path }),
};
