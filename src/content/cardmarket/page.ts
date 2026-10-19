/**
 * Lookups for elements on the Cardmarket "Add cards to wants list" page.
 * Keep all Cardmarket ids and selectors in this file.
 */

const IDS = {
  addCardForm: "AddCardForm",
  cardSearch: "WantsCardSearch",
  autocompleteResults: "AddCardAutoCompleteResult",
  quantity: "WantsQuantity",
  metacard: "IdMetacardInput",
  expansionComboBox: "WantsExpansion",
  messageLog: "MessageLog",
} as const;

const getInput = (id: string): HTMLInputElement | null => {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el : null;
};

export const findCardSearchInput = (): HTMLInputElement | null =>
  getInput(IDS.cardSearch) ??
  document.querySelector<HTMLInputElement>(
    'input[type="text"][placeholder*="card name" i]',
  );

export const findAutocompleteResults = (): HTMLElement | null =>
  document.getElementById(IDS.autocompleteResults);

export const AUTOCOMPLETE_ITEM_SELECTOR = "a.autocomplete-link.dropdown-item";

export type AddCardForm = {
  form: HTMLElement;
  quantity: HTMLInputElement;
  /** Hidden input that holds the id of the selected card. */
  metacard: HTMLInputElement;
  submit: HTMLButtonElement;
};

export const findAddCardForm = (): AddCardForm | null => {
  const form = document.getElementById(IDS.addCardForm);
  const quantity = getInput(IDS.quantity);
  const metacard = getInput(IDS.metacard);
  const submit = form?.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  if (!form || !quantity || !metacard || !submit) return null;
  return { form, quantity, metacard, submit };
};

export type ExpansionComboBox = {
  root: HTMLElement;
  select: HTMLSelectElement;
  optionList: HTMLElement;
  /** Cardmarket inserts selected-expansion chips before this input. */
  chipAnchor: HTMLInputElement;
};

export const findExpansionComboBox = (): ExpansionComboBox | null => {
  const root = document.getElementById(IDS.expansionComboBox);
  const select = root?.querySelector("select");
  const optionList = root?.querySelector<HTMLElement>(".option-list");
  const chipAnchor = root?.querySelector<HTMLInputElement>(
    'input[name="idProductTempInput"]',
  );
  if (!root || !select || !optionList || !chipAnchor) return null;
  return { root, select, optionList, chipAnchor };
};

/**
 * Alerts in the message area. Cardmarket adds one after each "Add card", and
 * sometimes inserts an older alert again, so callers must check the text.
 */
export const findMessages = (): HTMLElement[] =>
  Array.from(
    document
      .getElementById(IDS.messageLog)
      ?.querySelectorAll<HTMLElement>(".alert") ?? [],
  );

/**
 * - "added": the card is a new want.
 * - "merged": Cardmarket merged it into an existing want for the same card,
 *   and warns that some details may be lost.
 * - "error": Cardmarket did not add the card.
 */
export type MessageKind = "added" | "merged" | "error";

export const getMessageKind = (message: HTMLElement): MessageKind =>
  message.classList.contains("alert-success")
    ? "added"
    : message.classList.contains("alert-info")
      ? "merged"
      : "error";

export const findExpansionLabel = (): HTMLLabelElement | null =>
  document.querySelector<HTMLLabelElement>(
    `label[for="${IDS.expansionComboBox}"]`,
  );

/** True on a single wants list, such as /en/Magic/Wants/25854112. */
export const isWantsListPage = (): boolean =>
  /^\/[a-z]{2}\/Magic\/Wants\/\d+\/?$/.test(window.location.pathname);

/** The table of wants on a wants list page. */
export const findWantsTable = (): HTMLTableElement | null =>
  document
    .querySelector('button[id^="deleteWant"]')
    ?.closest<HTMLTableElement>("table") ?? null;

/**
 * Parts of one row in the wants table. The Edit link leads to a page with the
 * product ids of the selected expansions.
 */
export type WantsTableRow = {
  row: HTMLTableRowElement;
  wantId: string;
  editUrl: string;
  cardName: string;
  amount: number;
  /** Changes when the user edits the want. */
  signature: string;
  /** New cells go before this cell. */
  buyPriceCell: HTMLTableCellElement;
};

const tooltipText = (el: Element): string =>
  el.getAttribute("aria-label") ??
  el.getAttribute("data-bs-original-title") ??
  el.getAttribute("data-bs-title") ??
  el.getAttribute("title") ??
  "";

export const readWantsTableRows = (table: HTMLTableElement): WantsTableRow[] =>
  Array.from(table.tBodies[0]?.rows ?? []).flatMap((row) => {
    const wantId = row.querySelector<HTMLInputElement>(
      'input[name="idWant"]',
    )?.value;
    const editLink = row.querySelector<HTMLAnchorElement>("td.action a[href]");
    const cardName = row.querySelector("td.name a")?.textContent.trim();
    const amount = Number(
      row.querySelector("td.amount")?.getAttribute("data-amount"),
    );
    const buyPriceCell = row.querySelector<HTMLTableCellElement>("td.buyPrice");
    if (!wantId || !editLink || !cardName || !buyPriceCell) return [];
    if (!Number.isInteger(amount) || amount < 1) return [];

    const expansions = Array.from(
      row.querySelectorAll("td.expansion .expansion-symbol"),
      tooltipText,
    );
    const flags = Array.from(row.querySelectorAll("td.min-size"), (td) =>
      td.textContent.trim(),
    );
    const signature = [
      amount,
      cardName,
      row.querySelector("td.expansion")?.textContent.trim(),
      ...expansions,
      ...flags,
    ].join("|");

    return [
      {
        row,
        wantId,
        editUrl: editLink.href,
        cardName,
        amount,
        signature,
        buyPriceCell,
      },
    ];
  });
