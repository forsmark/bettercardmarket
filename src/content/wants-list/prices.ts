import { cardKey } from "../../shared/card-names";
import {
  type CardPrintsMap,
  estimateWant,
  type WantEstimate,
} from "../../shared/card-prices";
import { log } from "../../shared/logger";
import { requestCardPrints } from "../../shared/messages";
import type { WantsTableRow } from "../cardmarket/page";
import { h } from "../lib/dom";
import { euros } from "../../shared/format";
import { loadWantDetails } from "./want-details";

export type PriceResult = WantEstimate | "no-price" | "error";

export const estimateOf = (result: PriceResult | undefined): number | null =>
  typeof result === "object" ? result.totalPrice : null;

const requestPrints = (rows: readonly WantsTableRow[]) =>
  requestCardPrints([...new Set(rows.map((row) => row.cardName))])
    .then((response): CardPrintsMap | null => {
      if (response.ok) return response.prints;
      log.warn("Could not load Scryfall prices:", response.error);
      return null;
    })
    .catch((error: unknown) => {
      log.warn("Could not reach the background worker:", error);
      return null;
    });

/**
 * Estimates each want: the cheapest allowed printing times the quantity.
 * Calls `onResult` as each want finishes. Returns false when Scryfall
 * prices could not be loaded.
 */
export const loadPrices = async (
  rows: readonly WantsTableRow[],
  onResult: (row: WantsTableRow, result: PriceResult) => void,
): Promise<boolean> => {
  const printsPromise = requestPrints(rows);
  const pending: Promise<void>[] = [];

  await loadWantDetails(rows, (row, details) => {
    pending.push(
      printsPromise.then((prints) => {
        let result: PriceResult = "error";
        if (prints && !(details instanceof Error)) {
          result =
            estimateWant({
              amount: row.amount,
              foil: details.foil,
              productIds: details.productIds,
              allProductIds: details.allProductIds,
              prints: prints[cardKey(row.cardName)] ?? [],
            }) ?? "no-price";
        }
        onResult(row, result);
      }),
    );
  });
  await Promise.all(pending);
  return (await printsPromise) !== null;
};

/** Adds an "Est. price" column before "Buy Price". */
export const addPriceColumn = (
  table: HTMLTableElement,
  rows: readonly WantsTableRow[],
): ((row: WantsTableRow, result: PriceResult) => void) => {
  table.tHead
    ?.querySelector("th.buyPrice")
    ?.before(h("th", { className: "bcm-price-col", text: "Est. price" }));

  const cells = new Map(
    rows.map((row) => {
      const cell = h("td", {
        className: "bcm-price bcm-price--pending",
        text: "…",
      });
      row.buyPriceCell.before(cell);
      return [row.wantId, cell];
    }),
  );

  return (row, result) => {
    const cell = cells.get(row.wantId);
    if (!cell) return;
    cell.replaceChildren();
    cell.classList.remove("bcm-price--pending");

    if (typeof result !== "object") {
      cell.append(h("span", { className: "bcm-price__missing", text: "–" }));
      cell.title =
        result === "error"
          ? "Could not load this want. See the console for details."
          : "Scryfall has no Cardmarket price for the allowed printings.";
      return;
    }

    cell.append(
      h("span", {
        className: "bcm-price__total",
        text: euros(result.totalPrice),
      }),
    );
    if (row.amount > 1) {
      cell.append(
        h("span", {
          className: "bcm-price__unit",
          text: `${row.amount} × ${euros(result.unitPrice)}`,
        }),
      );
    }
    cell.title = `Cheapest allowed printing: ${result.setName}`;
  };
};
