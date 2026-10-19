import { cardKey } from "../../shared/card-names";
import {
  type CardPrintsMap,
  estimateWant,
  type WantEstimate,
} from "../../shared/card-prices";
import { log } from "../../shared/logger";
import { requestCardPrints } from "../../shared/messages";
import {
  findWantsTable,
  readWantsTableRows,
  type WantsTableRow,
} from "../cardmarket/page";
import { h } from "../lib/dom";
import { loadWantDetails } from "./want-details";

const MARKER = "data-bcm-prices";

const euros = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type RowResult = WantEstimate | "no-price" | "error";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const renderCell = (
  cell: HTMLTableCellElement,
  row: WantsTableRow,
  result: RowResult,
) => {
  cell.replaceChildren();
  cell.classList.remove("bcm-price--pending");

  if (result === "error" || result === "no-price") {
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
      text: euros.format(result.totalPrice),
    }),
  );
  if (row.amount > 1) {
    cell.append(
      h("span", {
        className: "bcm-price__unit",
        text: `${row.amount} × ${euros.format(result.unitPrice)}`,
      }),
    );
  }
  cell.title = `Cheapest allowed printing: ${result.setName}`;
};

/**
 * Adds an estimated price column and a total to the wants list. Prices are
 * Cardmarket prices from Scryfall's daily data. Each want uses its cheapest
 * allowed printing.
 */
export const mountWantsPrices = async (): Promise<void> => {
  const table = findWantsTable();
  if (!table || table.hasAttribute(MARKER)) return;
  const rows = readWantsTableRows(table);
  if (!rows.length) return;
  table.setAttribute(MARKER, "");

  // Column header, before "Buy Price".
  const buyPriceHeader = table.tHead?.querySelector("th.buyPrice");
  buyPriceHeader?.before(
    h("th", { className: "bcm-price-col", text: "Est. price" }),
  );

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

  const summary = h("div", {
    className: "bcm-price-summary",
    attrs: { role: "status" },
  });
  const status = h("span", { className: "bcm-price-summary__total" });
  const detail = h("span", { className: "bcm-price-summary__detail" });
  summary.append(
    status,
    detail,
    h("span", {
      className: "bcm-price-summary__source",
      text: "Cheapest allowed printing. Cardmarket prices from Scryfall, updated daily.",
    }),
  );
  (table.closest(".table-responsive") ?? table).before(summary);

  const results = new Map<string, RowResult>();
  let scryfallFailed = false;
  const totalCards = rows.reduce((sum, row) => sum + row.amount, 0);

  const updateSummary = () => {
    const estimates = [...results.values()].filter(
      (r): r is WantEstimate => typeof r === "object",
    );
    const total = estimates.reduce((sum, e) => sum + e.totalPrice, 0);
    const missingCards = rows
      .filter((row) => {
        const result = results.get(row.wantId);
        return result !== undefined && typeof result !== "object";
      })
      .reduce((sum, row) => sum + row.amount, 0);

    status.textContent = scryfallFailed
      ? "Could not load prices from Scryfall. Reload the page to try again."
      : results.size < rows.length
        ? `Loading prices… ${results.size} of ${plural(rows.length, "want")}`
        : `Estimated total ${euros.format(total)}`;
    detail.textContent = [
      plural(totalCards, "card"),
      missingCards ? `${missingCards} without a price` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };
  updateSummary();

  const printsPromise = requestCardPrints([
    ...new Set(rows.map((row) => row.cardName)),
  ])
    .then((response): CardPrintsMap | null => {
      if (response.ok) return response.prints;
      log.warn("Could not load Scryfall prices:", response.error);
      return null;
    })
    .catch((error: unknown) => {
      log.warn("Could not reach the background worker:", error);
      return null;
    })
    .then((prints) => {
      scryfallFailed = prints === null;
      return prints;
    });

  await loadWantDetails(rows, (row, details) => {
    void printsPromise.then((prints) => {
      const cell = cells.get(row.wantId);
      if (!cell) return;

      let result: RowResult = "error";
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
      results.set(row.wantId, result);
      renderCell(cell, row, result);
      updateSummary();
    });
  });
};
