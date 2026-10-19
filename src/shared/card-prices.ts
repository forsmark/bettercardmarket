import { cardKey, frontFaceName } from "./card-names";

/** Price data of one printing, as Scryfall reports it from Cardmarket. */
export type PrintPrice = {
  /** Cardmarket product id (idProduct). */
  cardmarketId: number;
  setName: string;
  eur: number | null;
  eurFoil: number | null;
};

/** Printings per card, keyed by `cardKey(name)`. */
export type CardPrintsMap = Record<string, PrintPrice[]>;

export type CardPricesRequest = { type: "get-card-prices"; names: string[] };

export type CardPricesResponse =
  { ok: true; prints: CardPrintsMap } | { ok: false; error: string };

export type FoilFilter = "any" | "yes" | "no";

/** Storage keys of the price caches, so the settings page can clear them. */
export const PRICE_CACHE_KEYS = ["scryfallPrints", "wantDetails"] as const;

/** Scryfall limits a search query to 1000 characters. */
const MAX_QUERY_LENGTH = 900;

const exactName = (name: string) =>
  `!"${frontFaceName(name).replace(/["\\]/g, "\\$&")}"`;

/**
 * Builds Scryfall search queries that find all printings of `names`, with as
 * many names per query as the length limit allows.
 */
export const buildPrintQueries = (names: readonly string[]): string[] => {
  const queries: string[] = [];
  let terms: string[] = [];

  const flush = () => {
    if (terms.length) queries.push(`(${terms.join(" or ")})`);
    terms = [];
  };

  for (const name of names) {
    const term = exactName(name);
    const length = terms.reduce((sum, t) => sum + t.length + 4, 2);
    if (terms.length && length + term.length > MAX_QUERY_LENGTH) flush();
    terms.push(term);
  }
  flush();
  return queries;
};

type ScryfallCard = {
  name?: unknown;
  set_name?: unknown;
  cardmarket_id?: unknown;
  prices?: { eur?: unknown; eur_foil?: unknown };
};

const toPrice = (value: unknown): number | null => {
  const number = typeof value === "string" ? Number.parseFloat(value) : NaN;
  return Number.isFinite(number) ? number : null;
};

/**
 * Converts Scryfall card objects into printings per card. Drops printings
 * without a Cardmarket id, because they cannot match a want.
 */
export const groupPrints = (cards: readonly unknown[]): CardPrintsMap => {
  const result: CardPrintsMap = {};
  for (const item of cards) {
    const card = item as ScryfallCard;
    if (typeof card.name !== "string") continue;
    if (typeof card.cardmarket_id !== "number") continue;

    const key = cardKey(card.name);
    (result[key] ??= []).push({
      cardmarketId: card.cardmarket_id,
      setName: typeof card.set_name === "string" ? card.set_name : "",
      eur: toPrice(card.prices?.eur),
      eurFoil: toPrice(card.prices?.eur_foil),
    });
  }
  return result;
};

const unitPrice = (print: PrintPrice, foil: FoilFilter): number | null => {
  if (foil === "no") return print.eur;
  if (foil === "yes") return print.eurFoil;
  const prices = [print.eur, print.eurFoil].filter((p) => p !== null);
  return prices.length ? Math.min(...prices) : null;
};

export type WantEstimate = {
  unitPrice: number;
  totalPrice: number;
  setName: string;
};

/**
 * Estimates a want as the cheapest allowed printing times the quantity. A want
 * without selected expansions allows every printing. Returns null when no
 * allowed printing has a price.
 */
export const estimateWant = ({
  amount,
  foil,
  productIds,
  allProductIds,
  prints,
}: {
  amount: number;
  foil: FoilFilter;
  productIds: readonly number[];
  allProductIds: readonly number[];
  prints: readonly PrintPrice[];
}): WantEstimate | null => {
  const allowed = new Set(productIds.length ? productIds : allProductIds);
  let best: { price: number; print: PrintPrice } | null = null;

  for (const print of prints) {
    if (!allowed.has(print.cardmarketId)) continue;
    const price = unitPrice(print, foil);
    if (price !== null && (!best || price < best.price)) {
      best = { price, print };
    }
  }

  if (!best) return null;
  return {
    unitPrice: best.price,
    totalPrice: best.price * amount,
    setName: best.print.setName,
  };
};
