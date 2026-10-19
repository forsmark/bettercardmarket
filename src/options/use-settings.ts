import { useCallback, useEffect, useState } from "react";
import {
  loadSettings,
  normalizeSettings,
  resetSettings,
  saveSettings,
  type Settings,
  subscribeToSettings,
} from "../shared/settings";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

/**
 * Reads the settings from sync storage and keeps them current. Changes from
 * other tabs or devices also arrive here.
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  useEffect(() => {
    let active = true;
    void loadSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });
    const unsubscribe = subscribeToSettings(setSettings);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const persist = useCallback(async (write: () => Promise<Settings>) => {
    try {
      setSettings(await write());
      setSaveState({ kind: "saved", at: Date.now() });
    } catch (error) {
      setSaveState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      // Show the change at once, then confirm with the stored value.
      setSettings((current) =>
        current ? normalizeSettings({ ...current, ...patch }) : current,
      );
      void persist(() => saveSettings(patch));
    },
    [persist],
  );

  const reset = useCallback(() => void persist(resetSettings), [persist]);

  return { settings, saveState, update, reset };
};
