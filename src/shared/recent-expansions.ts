/**
 * The expansion list of the last card that Auto Select ran on. The content
 * script stores it, and the settings page uses it to preview the rules.
 */
export type RecentExpansions = {
  card: string;
  names: string[];
  seenAt: number;
};

const KEY = "recentExpansions";

const isRecentExpansions = (value: unknown): value is RecentExpansions => {
  const v = value as Partial<RecentExpansions> | undefined;
  return (
    typeof v?.card === "string" &&
    Array.isArray(v.names) &&
    typeof v.seenAt === "number"
  );
};

export const saveRecentExpansions = (value: RecentExpansions): Promise<void> =>
  chrome.storage.local.set({ [KEY]: value });

export const loadRecentExpansions =
  async (): Promise<RecentExpansions | null> => {
    const stored = (await chrome.storage.local.get(KEY))[KEY];
    return isRecentExpansions(stored) ? stored : null;
  };

export const subscribeToRecentExpansions = (
  listener: (value: RecentExpansions | null) => void,
): (() => void) => {
  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local" || !(KEY in changes)) return;
    const next: unknown = changes[KEY]?.newValue;
    listener(isRecentExpansions(next) ? next : null);
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
};
