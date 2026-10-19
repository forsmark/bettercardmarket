import {
  DEFAULT_EXCLUDED_GROUPS,
  isExpansionGroupId,
  isGroupMemberId,
  migrateLegacyExclusions,
} from "./expansion-groups";

export type Settings = {
  /** Ids of expansion groups that Auto Select skips. */
  excludedGroups: string[];
  /** Ids of group members, such as one franchise, that Auto Select allows. */
  includedMembers: string[];
  /** Name patterns that Auto Select skips, in addition to the groups. */
  customExclusions: string[];
  /** Name patterns that Auto Select always allows, even if excluded. */
  alwaysInclude: string[];
  /** Upper limit of expansions that Auto Select picks for one card. */
  maxSelectedExpansions: number;
  /** Default for "Auto-select expansions" in the Auto list dialog. */
  autoSelectOnAutoList: boolean;
  /** Show estimated prices on wants list pages. */
  showPrices: boolean;
  /** Write detailed logs to the page console. */
  debugLogging: boolean;
};

export const MAX_SELECTED_EXPANSIONS_RANGE = { min: 1, max: 100 } as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  excludedGroups: [...DEFAULT_EXCLUDED_GROUPS],
  includedMembers: [],
  customExclusions: [],
  alwaysInclude: [],
  maxSelectedExpansions: 20,
  autoSelectOnAutoList: true,
  showPrices: true,
  debugLogging: false,
});

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
/** Flat exclusion list from version 2.0. Converted on the next save. */
const LEGACY_KEY = "excludedExpansions" as const;
const STORAGE_KEYS: (keyof StoredSettings)[] = [...SETTING_KEYS, LEGACY_KEY];

type StoredSettings = { [K in keyof Settings | typeof LEGACY_KEY]?: unknown };

/** Trims entries, drops empty ones and removes case-insensitive duplicates. */
export const normalizePatternList = (value: readonly unknown[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const entry = String(item).trim();
    const key = entry.toLowerCase();
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
};

const asPatternList = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? normalizePatternList(value) : undefined;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asLimit = (value: unknown): number => {
  const number = Number(value);
  if (value === undefined || !Number.isFinite(number)) {
    return DEFAULT_SETTINGS.maxSelectedExpansions;
  }
  const { min, max } = MAX_SELECTED_EXPANSIONS_RANGE;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const readExclusions = (
  stored: StoredSettings,
): Pick<Settings, "excludedGroups" | "customExclusions"> => {
  if (Array.isArray(stored.excludedGroups)) {
    return {
      excludedGroups: stored.excludedGroups.filter(isExpansionGroupId),
      customExclusions: asPatternList(stored.customExclusions) ?? [],
    };
  }
  const legacy = asPatternList(stored[LEGACY_KEY]);
  if (legacy) return migrateLegacyExclusions(legacy);
  return {
    excludedGroups: [...DEFAULT_SETTINGS.excludedGroups],
    customExclusions: asPatternList(stored.customExclusions) ?? [],
  };
};

/** Converts any stored value into a complete, valid settings object. */
export const normalizeSettings = (stored: StoredSettings): Settings => ({
  ...readExclusions(stored),
  includedMembers: Array.isArray(stored.includedMembers)
    ? [...new Set(stored.includedMembers.filter(isGroupMemberId))]
    : [],
  alwaysInclude: asPatternList(stored.alwaysInclude) ?? [],
  maxSelectedExpansions: asLimit(stored.maxSelectedExpansions),
  autoSelectOnAutoList: asBoolean(
    stored.autoSelectOnAutoList,
    DEFAULT_SETTINGS.autoSelectOnAutoList,
  ),
  showPrices: asBoolean(stored.showPrices, DEFAULT_SETTINGS.showPrices),
  debugLogging: asBoolean(stored.debugLogging, DEFAULT_SETTINGS.debugLogging),
});

export const loadSettings = async (): Promise<Settings> =>
  normalizeSettings(await chrome.storage.sync.get(STORAGE_KEYS));

/** Merges `patch` into the stored settings and returns the result. */
export const saveSettings = async (
  patch: Partial<Settings>,
): Promise<Settings> => {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await chrome.storage.sync.set(next);
  await chrome.storage.sync.remove(LEGACY_KEY);
  return next;
};

export const resetSettings = async (): Promise<Settings> => {
  await chrome.storage.sync.remove(STORAGE_KEYS);
  return normalizeSettings({});
};

/**
 * Calls `listener` with the full settings after each change in sync storage.
 * Returns a function that removes the listener.
 */
export const subscribeToSettings = (
  listener: (settings: Settings) => void,
): (() => void) => {
  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "sync") return;
    if (!STORAGE_KEYS.some((key) => key in changes)) return;
    void loadSettings().then(listener);
  };

  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
};
