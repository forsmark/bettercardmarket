import { excludedExpansions } from "./constants";

export type Settings = {
  excludedExpansions: string[];
  autoSelectOnAutoList: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  excludedExpansions: [...excludedExpansions],
  autoSelectOnAutoList: true,
};

let cachedSettings: Settings = { ...DEFAULT_SETTINGS };

const normalizeExcluded = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.excludedExpansions];
  return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
};

const normalizeSettings = (value: Partial<Settings>): Settings => {
  return {
    excludedExpansions:
      value.excludedExpansions !== undefined
        ? normalizeExcluded(value.excludedExpansions)
        : [...DEFAULT_SETTINGS.excludedExpansions],
    autoSelectOnAutoList:
      value.autoSelectOnAutoList ?? DEFAULT_SETTINGS.autoSelectOnAutoList,
  };
};

export const getSettings = (): Settings => cachedSettings;

export const loadSettings = async (): Promise<Settings> => {
  if (!chrome?.storage?.sync) return cachedSettings;

  const stored = (await chrome.storage.sync.get(
    DEFAULT_SETTINGS,
  )) as Partial<Settings>;
  cachedSettings = normalizeSettings(stored);
  return cachedSettings;
};

export const saveSettings = async (value: Partial<Settings>): Promise<void> => {
  if (!chrome?.storage?.sync) {
    cachedSettings = normalizeSettings({ ...cachedSettings, ...value });
    return;
  }

  await chrome.storage.sync.set(value);
};

export const initSettings = async (
  onChange?: (settings: Settings) => void,
): Promise<void> => {
  await loadSettings();

  if (!chrome?.storage?.onChanged) return;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;

    const next: Partial<Settings> = { ...cachedSettings };

    if (changes.excludedExpansions) {
      next.excludedExpansions = changes.excludedExpansions
        .newValue as unknown as string[];
    }
    if (changes.autoSelectOnAutoList) {
      next.autoSelectOnAutoList = changes.autoSelectOnAutoList
        .newValue as unknown as boolean;
    }

    cachedSettings = normalizeSettings(next);
    if (onChange) onChange(cachedSettings);
  });
};
