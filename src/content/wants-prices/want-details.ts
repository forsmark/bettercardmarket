import { type FoilFilter, PRICE_CACHE_KEYS } from "../../shared/card-prices";
import { log } from "../../shared/logger";
import type { WantsTableRow } from "../cardmarket/page";

export type WantDetails = {
  /** Product ids of the selected expansions. Empty means "Any". */
  productIds: number[];
  /** Product ids of every printing that the want could use. */
  allProductIds: number[];
  foil: FoilFilter;
};

const CACHE_KEY = PRICE_CACHE_KEYS[1];
/** New printings appear over time, which matters for "Any" wants. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Edit pages are about 100 KB. Keep the load on Cardmarket low. */
const CONCURRENCY = 2;

type CacheEntry = {
  signature: string;
  fetchedAt: number;
  details: WantDetails;
};
type DetailsCache = Record<string, CacheEntry>;

const FOIL_VALUES: Record<string, FoilFilter> = { Y: "yes", N: "no" };

/** Reads the expansion product ids and the foil setting from an Edit page. */
export const parseWantEditPage = (html: string): WantDetails | null => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const select = doc.querySelector<HTMLSelectElement>(
    'select[name="idProduct[]"]',
  );
  if (!select) return null;

  const options = Array.from(select.options).filter((o) =>
    /^\d+$/.test(o.value),
  );
  const foil = doc.querySelector<HTMLSelectElement>('select[name="isFoil"]');
  return {
    productIds: options.filter((o) => o.selected).map((o) => Number(o.value)),
    allProductIds: options.map((o) => Number(o.value)),
    foil: FOIL_VALUES[foil?.value ?? ""] ?? "any",
  };
};

const fetchDetails = async (row: WantsTableRow): Promise<WantDetails> => {
  const response = await fetch(row.editUrl, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Cardmarket answered ${response.status}`);
  const details = parseWantEditPage(await response.text());
  if (!details) throw new Error("Edit page has no expansion list");
  return details;
};

const readCache = async (): Promise<DetailsCache> =>
  ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as
    DetailsCache | undefined) ?? {};

/**
 * Loads the details of each want, from the cache when the row did not change,
 * else from its Edit page. Calls `onLoaded` as each want finishes.
 */
export const loadWantDetails = async (
  rows: readonly WantsTableRow[],
  onLoaded: (row: WantsTableRow, details: WantDetails | Error) => void,
): Promise<void> => {
  const now = Date.now();
  const cache = await readCache();
  const queue: WantsTableRow[] = [];

  for (const row of rows) {
    const entry = cache[row.wantId];
    if (
      entry?.signature === row.signature &&
      now - entry.fetchedAt < CACHE_TTL_MS
    ) {
      onLoaded(row, entry.details);
    } else {
      queue.push(row);
    }
  }

  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      try {
        const details = await fetchDetails(row);
        cache[row.wantId] = {
          signature: row.signature,
          fetchedAt: now,
          details,
        };
        onLoaded(row, details);
      } catch (error) {
        log.warn(`Could not load details of "${row.cardName}"`, error);
        onLoaded(
          row,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  };
  const fetchedAny = queue.length > 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (fetchedAny) {
    const fresh = Object.fromEntries(
      Object.entries(cache).filter(([, e]) => now - e.fetchedAt < CACHE_TTL_MS),
    );
    await chrome.storage.local.set({ [CACHE_KEY]: fresh });
  }
};
