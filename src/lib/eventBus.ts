type Handler<T = any> = (event: T) => void;

class TypedEventBus<Events extends Record<string, any>> {
  private listeners: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof Events>(key: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key]!.add(handler);
    return () => this.off(key, handler);
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof Events>(key: K, handler: Handler<Events[K]>): void {
    this.listeners[key]?.delete(handler);
    if (this.listeners[key]?.size === 0) {
      delete this.listeners[key];
    }
  }

  /**
   * Emit an event, notifying all active subscribers.
   */
  emit<K extends keyof Events>(key: K, payload: Events[K]): void {
    this.listeners[key]?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${String(key)}":`, error);
      }
    });
  }

  /**
   * Subscribe to an event, but only trigger the handler once.
   */
  once<K extends keyof Events>(key: K, handler: Handler<Events[K]>): () => void {
    const onceHandler = (payload: Events[K]) => {
      this.off(key, onceHandler);
      handler(payload);
    };
    return this.on(key, onceHandler);
  }

  /**
   * Get the current count of listeners for an event (useful for verification and boundary tests).
   */
  listenerCount<K extends keyof Events>(key: K): number {
    return this.listeners[key]?.size || 0;
  }

  /**
   * Clear all listeners (useful for testing cleanup).
   */
  clearAll(): void {
    this.listeners = {};
  }
}

// Global AppEvents Type Registry
export interface AppEvents {
  // Terminal connection and state events
  'terminal:reconnect': { sessionId: string };
  'terminal:inactive-error': { sessionId: string; reason?: string };

  // File system and transfer events
  'fs:file-uploaded': { sessionId: string; path: string; fileName: string };
  'fs:refresh-directory': { sessionId: string; path?: string };

  // Global UI events
  'system:toast': { type: 'success' | 'error' | 'info'; message: string };
}

export const eventBus = new TypedEventBus<AppEvents>();
