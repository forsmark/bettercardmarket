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
