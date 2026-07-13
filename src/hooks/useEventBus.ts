import { useEffect, useRef } from 'react';
import { eventBus, AppEvents } from '@/lib/eventBus';

/**
 * A React hook that safely subscribes to an event bus event and unsubscribes when the component unmounts.
 * 
 * @param event The event key to subscribe to
 * @param handler The callback function that handles the event payload
 */
export function useEventBus<K extends keyof AppEvents>(
  event: K,
  handler: (payload: AppEvents[K]) => void
) {
  const handlerRef = useRef(handler);

  // Keep the handler ref up-to-date to prevent stale closures and avoid re-subscribing on every render
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = eventBus.on(event, (payload) => {
      handlerRef.current(payload);
    });
    return () => {
      unsubscribe();
    };
  }, [event]);
}
