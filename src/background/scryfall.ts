import { cardKey } from "../shared/card-names";
import {
  buildPrintQueries,
  type CardPrintsMap,
  groupPrints,
  PRICE_CACHE_KEYS,
  type PrintPrice,
} from "../shared/card-prices";

const API = "https://api.scryfall.com";
/** Scryfall allows 2 search requests per second. Stay a little below. */
const MIN_REQUEST_GAP_MS = 550;
/** Scryfall blocks a client for 30 seconds after a 429 response. */
const RATE_LIMIT_PAUSE_MS = 31_000;
/** Scryfall updates prices once a day. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = PRICE_CACHE_KEYS[0];

type CacheEntry = { fetchedAt: number; prints: PrintPrice[] };
type PrintCache = Record<string, CacheEntry>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// All Scryfall requests go through one queue, so that tabs that load prices
// at the same time still keep the rate limit.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const scheduled = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
};

type SearchPage = { data?: unknown[]; has_more?: boolean; next_page?: string };

const fetchPage = async (url: string, retry = true): Promise<SearchPage> => {
  // Browsers do not allow a custom User-Agent. Scryfall accepts the browser's
  // own User-Agent for in-browser use. The Accept header is required.
  const response = await scheduled(() =>
    fetch(url, { headers: { Accept: "application/json" } }),
  );
  if (response.status === 429 && retry) {
    lastRequestAt = Date.now() + RATE_LIMIT_PAUSE_MS;
    return fetchPage(url, false);
  }
  // Scryfall answers 404 when a search finds no cards.
  if (response.status === 404) return { data: [] };
  if (!response.ok) {
    throw new Error(`Scryfall answered ${response.status}`);
  }
  return (await response.json()) as SearchPage;
};

const searchPrints = async (query: string): Promise<unknown[]> => {
  const params = new URLSearchParams({ q: query, unique: "prints" });
  let url: string | undefined = `${API}/cards/search?${params.toString()}`;
  const cards: unknown[] = [];
  while (url) {
    const page = await fetchPage(url);
    cards.push(...(page.data ?? []));
    url = page.has_more ? page.next_page : undefined;
  }
  return cards;
};

const readCache = async (): Promise<PrintCache> =>
  ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as
    PrintCache | undefined) ?? {};

const writeCache = async (cache: PrintCache): Promise<void> => {
  const now = Date.now();
  const fresh = Object.fromEntries(
    Object.entries(cache).filter(([, e]) => now - e.fetchedAt < CACHE_TTL_MS),
  );
  await chrome.storage.local.set({ [CACHE_KEY]: fresh });
};

/**
 * Returns all printings of each card in `names`, keyed by `cardKey(name)`.
 * Uses cached data that is less than a day old.
 */
export const getCardPrints = async (
  names: readonly string[],
): Promise<CardPrintsMap> => {
  const now = Date.now();
  const cache = await readCache();
  const keys = [...new Set(names.map(cardKey))];
  const namesByKey = new Map(names.map((name) => [cardKey(name), name]));
  const missing = keys.filter((key) => {
    const entry = cache[key];
    return !entry || now - entry.fetchedAt >= CACHE_TTL_MS;
  });

  const found: CardPrintsMap = {};
  for (const query of buildPrintQueries(
    missing.map((key) => namesByKey.get(key) ?? key),
  )) {
    for (const [key, prints] of Object.entries(
      groupPrints(await searchPrints(query)),
    )) {
      (found[key] ??= []).push(...prints);
    }
  }
  // Store empty results too, so that unknown names are not searched again
  // until the cache expires.
  for (const key of missing) {
    cache[key] = { fetchedAt: now, prints: found[key] ?? [] };
  }
  if (missing.length) await writeCache(cache);

  return Object.fromEntries(keys.map((key) => [key, cache[key]?.prints ?? []]));
};
