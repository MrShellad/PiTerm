import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { SessionMonitorData } from "@/store/useMonitorStore";
import { MonitorSyncPayload } from "../types";

const inflightSessionDataRequests = new Map<
  string,
  Promise<Partial<SessionMonitorData>>
>();

const isExpectedMonitorError = (err: unknown) => {
  const message = String(err).toLowerCase();
  return message.includes("ssh connection not active")
    || message.includes("ssh background session not ready")
    || message.includes("ssh background session unavailable");
};

export const MonitorDataService = {
  fetchSessionData: async (
    sessionId: string
  ): Promise<Partial<SessionMonitorData>> => {
    const existingRequest = inflightSessionDataRequests.get(sessionId);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      try {
        return await invoke<Partial<SessionMonitorData>>(
          "get_ssh_combined_info",
          { id: sessionId }
        );
      } catch (err) {
        if (!isExpectedMonitorError(err)) {
          console.error("Error fetching monitor data:", err);
        }
        return {};
      } finally {
        inflightSessionDataRequests.delete(sessionId);
      }
    })();

    inflightSessionDataRequests.set(sessionId, request);
    return request;
  },

  startPolling: (
    sessionId: string,
    intervalMs: number,
    onDataFetched: (updates: Partial<SessionMonitorData>) => void
  ) => {
    let disposed = false;

    const fetchData = async () => {
      if (!sessionId || disposed) return;

      const updates = await MonitorDataService.fetchSessionData(sessionId);
      if (disposed) return;

      if (Object.keys(updates).length > 0) {
        onDataFetched(updates);
        emit("monitor:sync-data", {
          sessionId,
          data: updates,
        } as MonitorSyncPayload);
      }
    };

    void fetchData();
    const intervalId = setInterval(() => {
      void fetchData();
    }, intervalMs);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  },
};
