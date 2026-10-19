import { cardKey } from "./card-names";

/**
 * The pocket collects cards from one or more wants lists, so they can be
 * added to another list later with Auto list. It lives in local storage.
 */
export type PocketEntry = {
  name: string;
  quantity: number;
  /** Sum of the price estimates of the added wants. Null if one had none. */
  estimate: number | null;
  /** Wants that were added, so the same want is not added twice. */
  wantIds: string[];
};

export type PocketItem = {
  wantId: string;
  name: string;
  quantity: number;
  estimate: number | null;
};

const KEY = "pocket";

const isEntry = (value: unknown): value is PocketEntry => {
  const v = value as Partial<PocketEntry> | null;
  return (
    typeof v?.name === "string" &&
    typeof v.quantity === "number" &&
    (typeof v.estimate === "number" || v.estimate === null) &&
    Array.isArray(v.wantIds)
  );
};

const normalize = (value: unknown): PocketEntry[] =>
  Array.isArray(value) ? value.filter(isEntry) : [];

/**
 * Adds wants to the pocket. Cards with the same name share one entry. Wants
 * that are already in the pocket are skipped.
 */
export const mergeIntoPocket = (
  pocket: readonly PocketEntry[],
  items: readonly PocketItem[],
): { pocket: PocketEntry[]; added: number; skipped: number } => {
  const entries = pocket.map((e) => ({ ...e, wantIds: [...e.wantIds] }));
  const byKey = new Map(entries.map((e) => [cardKey(e.name), e]));
  const known = new Set(entries.flatMap((e) => e.wantIds));
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    if (known.has(item.wantId)) {
      skipped += 1;
      continue;
    }
    known.add(item.wantId);
    added += 1;

    const entry = byKey.get(cardKey(item.name));
    if (entry) {
      entry.quantity += item.quantity;
      entry.estimate =
        entry.estimate === null || item.estimate === null
          ? null
          : entry.estimate + item.estimate;
      entry.wantIds.push(item.wantId);
    } else {
      const created: PocketEntry = {
        name: item.name,
        quantity: item.quantity,
        estimate: item.estimate,
        wantIds: [item.wantId],
      };
      entries.push(created);
      byKey.set(cardKey(item.name), created);
    }
  }

  return { pocket: entries, added, skipped };
};

/** Removes the entries for `names`, for example after Auto list added them. */
export const removeFromPocketList = (
  pocket: readonly PocketEntry[],
  names: readonly string[],
): PocketEntry[] => {
  const keys = new Set(names.map(cardKey));
  return pocket.filter((e) => !keys.has(cardKey(e.name)));
};

export type PocketTotals = {
  cards: number;
  estimate: number;
  /** Cards whose entry has no estimate. */
  unpricedCards: number;
};

export const pocketTotals = (pocket: readonly PocketEntry[]): PocketTotals =>
  pocket.reduce(
    (totals, e) => ({
      cards: totals.cards + e.quantity,
      estimate: totals.estimate + (e.estimate ?? 0),
      unpricedCards:
        totals.unpricedCards + (e.estimate === null ? e.quantity : 0),
    }),
    { cards: 0, estimate: 0, unpricedCards: 0 },
  );

/** One "<quantity> <name>" line per entry, the format Auto list reads. */
export const formatPocket = (pocket: readonly PocketEntry[]): string =>
  pocket.map((e) => `${e.quantity} ${e.name}`).join("\n");

export const loadPocket = async (): Promise<PocketEntry[]> =>
  normalize((await chrome.storage.local.get(KEY))[KEY]);

const savePocket = (pocket: PocketEntry[]): Promise<void> =>
  chrome.storage.local.set({ [KEY]: pocket });

export const addToPocket = async (items: readonly PocketItem[]) => {
  const result = mergeIntoPocket(await loadPocket(), items);
  await savePocket(result.pocket);
  return result;
};

export const removeFromPocket = async (names: readonly string[]) =>
  savePocket(removeFromPocketList(await loadPocket(), names));

export const clearPocket = (): Promise<void> =>
  chrome.storage.local.remove(KEY);

export const subscribeToPocket = (
  listener: (pocket: PocketEntry[]) => void,
): (() => void) => {
  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === "local" && KEY in changes) {
      listener(normalize(changes[KEY]?.newValue));
    }
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
};
