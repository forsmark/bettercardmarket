import { addToPocket } from "../../shared/pocket";
import type { Settings } from "../../shared/settings";
import {
  findWantsTable,
  readWantsTableRows,
  type WantsTableRow,
} from "../cardmarket/page";
import { h } from "../lib/dom";
import { euros, plural } from "../../shared/format";
import {
  addPriceColumn,
  estimateOf,
  loadPrices,
  type PriceResult,
} from "./prices";
import { watchSelection } from "./selection";

const MARKER = "data-bcm-wants-list";
const FEEDBACK_MS = 4_000;

type Totals = { wants: number; cards: number; price: number; unpriced: number };

/**
 * Adds a toolbar to a wants list page. It shows the price estimate of the
 * whole list and of the checked wants, and adds checked wants to the pocket.
 */
export const mountWantsList = async (settings: Settings): Promise<void> => {
  const table = findWantsTable();
  if (!table || table.hasAttribute(MARKER)) return;
  const rows = readWantsTableRows(table);
  if (!rows.length) return;
  table.setAttribute(MARKER, "");

  const showPrices = settings.showPrices;
  const results = new Map<string, PriceResult>();
  let selected = new Set<string>();
  let pricesFailed = false;

  // Toolbar markup
  const listTotal = h("span", { className: "bcm-toolbar__total" });
  const listDetail = h("span", { className: "bcm-toolbar__detail" });
  const selectionTotal = h("span", { className: "bcm-toolbar__total" });
  const selectionDetail = h("span", { className: "bcm-toolbar__detail" });
  const feedback = h("span", {
    className: "bcm-toolbar__feedback",
    attrs: { role: "status" },
  });
  const pocketButton = h("button", {
    className: "btn btn-outline-light btn-sm",
    text: "Add to pocket",
    attrs: {
      type: "button",
      title:
        "Collect the checked cards. Open the pocket from the toolbar icon.",
    },
  });

  const toolbar = h(
    "section",
    {
      className: "bcm-toolbar",
      attrs: { "aria-label": "Better CardMarket" },
    },
    [
      h("div", { className: "bcm-toolbar__row" }, [
        listTotal,
        listDetail,
        showPrices
          ? h("span", {
              className: "bcm-toolbar__source",
              text: "Cheapest allowed printing. Cardmarket prices from Scryfall, updated daily.",
            })
          : "",
      ]),
      h("div", { className: "bcm-toolbar__row" }, [
        selectionTotal,
        selectionDetail,
        h("span", { className: "bcm-toolbar__actions" }, [
          feedback,
          pocketButton,
        ]),
      ]),
    ],
  );
  (table.closest(".table-responsive") ?? table).before(toolbar);

  const totalsOf = (subset: readonly WantsTableRow[]): Totals =>
    subset.reduce<Totals>(
      (t, row) => {
        const estimate = estimateOf(results.get(row.wantId));
        return {
          wants: t.wants + 1,
          cards: t.cards + row.amount,
          price: t.price + (estimate ?? 0),
          unpriced:
            t.unpriced +
            (results.has(row.wantId) && estimate === null ? row.amount : 0),
        };
      },
      { wants: 0, cards: 0, price: 0, unpriced: 0 },
    );

  const describe = (totals: Totals, loading: boolean): [string, string] => {
    const detail = [
      plural(totals.wants, "want"),
      plural(totals.cards, "card"),
      totals.unpriced ? `${totals.unpriced} without a price` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (!showPrices) return ["", detail];
    if (pricesFailed) return ["Prices unavailable", detail];
    if (loading) return ["Loading prices…", detail];
    return [euros(totals.price), detail];
  };

  const render = () => {
    const loading = showPrices && results.size < rows.length;
    const [total, detail] = describe(totalsOf(rows), loading);
    listTotal.textContent = showPrices ? `Estimated total ${total}` : "";
    listDetail.textContent = loading
      ? `${results.size} of ${plural(rows.length, "want")} loaded`
      : detail;

    const chosen = rows.filter((row) => selected.has(row.wantId));
    if (chosen.length) {
      const chosenLoading =
        showPrices && chosen.some((row) => !results.has(row.wantId));
      const [price, chosenDetail] = describe(totalsOf(chosen), chosenLoading);
      selectionTotal.textContent = showPrices
        ? `Selected ${price}`
        : "Selected";
      selectionDetail.textContent = chosenDetail;
    } else {
      selectionTotal.textContent = "";
      selectionDetail.textContent =
        "Check wants to see their total or add them to the pocket.";
    }
    pocketButton.disabled = chosen.length === 0;
  };

  let feedbackTimer: number | undefined;
  pocketButton.addEventListener("click", () => {
    const chosen = rows.filter((row) => selected.has(row.wantId));
    void addToPocket(
      chosen.map((row) => ({
        wantId: row.wantId,
        name: row.cardName,
        quantity: row.amount,
        estimate: showPrices ? estimateOf(results.get(row.wantId)) : null,
      })),
    ).then(({ added, skipped }) => {
      feedback.textContent = [
        added ? `Added ${plural(added, "want")} to the pocket.` : "",
        skipped ? `${skipped} already in the pocket.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => {
        feedback.textContent = "";
      }, FEEDBACK_MS);
    });
  });

  watchSelection(table, rows, (next) => {
    selected = next;
    render();
  });

  if (!showPrices) return;

  const renderCell = addPriceColumn(table, rows);
  render();
  pricesFailed = !(await loadPrices(rows, (row, result) => {
    results.set(row.wantId, result);
    renderCell(row, result);
    render();
  }));
  render();
};
