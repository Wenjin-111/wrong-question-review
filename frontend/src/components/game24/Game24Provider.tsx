import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsApi } from '../../api/settings';

interface Game24ContextValue {
  enabled: boolean;
  loading: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

const Game24Context = createContext<Game24ContextValue | null>(null);

export function Game24Provider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getGame24Enabled()
      .then(({ data }) => {
        if (!cancelled) setEnabledState(data.enabled);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    try {
      await settingsApi.updateGame24Enabled(value);
      return true;
    } catch {
      setEnabledState((prev) => !prev);
      return false;
    }
  }, []);

  return (
    <Game24Context.Provider value={{ enabled, loading, setEnabled }}>
      {children}
    </Game24Context.Provider>
  );
}

export function useGame24(): Game24ContextValue {
  const context = useContext(Game24Context);
  if (!context) {
    throw new Error('useGame24 must be used within a Game24Provider');
  }
  return context;
}
