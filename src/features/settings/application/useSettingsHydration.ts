import { useEffect, useState } from 'react';
import { useSettingsStore } from './useSettingsStore';

export const useSettingsHydration = () => {
  const [hydrated, setHydrated] = useState(() =>
    useSettingsStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
};
