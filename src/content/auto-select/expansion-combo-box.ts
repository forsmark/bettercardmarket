import { log } from "../../shared/logger";
import {
  type ExpansionComboBox,
  findExpansionComboBox,
} from "../cardmarket/page";
import { dispatch, h, sleep } from "../lib/dom";
import type { ExpansionOption } from "../../shared/expansion-rules";

/**
 * Cardmarket's expansion picker is a custom combo box: a hidden <select> holds
 * the form value, a <ul> shows the options, and "chips" show the selection.
 * Synthetic clicks on the <ul> items do not select anything, so this module
 * updates all three parts directly.
 */

type ListedExpansion = ExpansionOption & { item: HTMLElement };

/** Width of the "x" that Cardmarket draws on the right edge of a chip. */
const CHIP_REMOVE_HIT_WIDTH = 26;

export const readExpansionOptions = (
  comboBox: ExpansionComboBox,
): ListedExpansion[] =>
  Array.from(comboBox.optionList.children).flatMap((item) => {
    const id = item.getAttribute("data-option-value");
    if (!id || !(item instanceof HTMLElement)) return [];
    const name = (
      item.querySelector(".fullExpansionName-span")?.textContent ??
      item.textContent
    ).trim();
    return [{ id, name, item }];
  });

const findChips = (comboBox: ExpansionComboBox): HTMLAnchorElement[] =>
  Array.from(
    comboBox.root.querySelectorAll<HTMLAnchorElement>(
      "a.selected-item[data-val]",
    ),
  );

/** Builds a chip with the same markup as Cardmarket's own chips. */
const createChip = (expansion: ListedExpansion): HTMLAnchorElement => {
  const chip = h("a", {
    className: "selected-item",
    attrs: { href: "#", "data-val": expansion.id },
  });

  for (const child of expansion.item.children) {
    const copy = child.cloneNode(true) as HTMLElement;
    // Bootstrap adds these when it creates the tooltip on the list item.
    copy.removeAttribute("aria-label");
    copy.removeAttribute("data-bs-original-title");
    if (copy.matches("[data-bs-toggle]")) copy.title = expansion.name;
    chip.append(copy);
  }

  return chip;
};

const deselect = (
  comboBox: ExpansionComboBox,
  option: HTMLOptionElement,
  chip: HTMLAnchorElement,
): void => {
  option.selected = false;
  comboBox.optionList
    .querySelector(`li[data-option-value="${CSS.escape(option.value)}"]`)
    ?.classList.remove("selected");
  chip.remove();
  dispatch(comboBox.select, "change");
};

/** Adds `expansions` to the current selection. */
export const selectExpansions = (
  comboBox: ExpansionComboBox,
  expansions: readonly ListedExpansion[],
): void => {
  const byId = new Map(expansions.map((e) => [e.id, e]));

  // Drop chips for ids we are about to add again, so repeated runs do not
  // create duplicates.
  for (const chip of findChips(comboBox)) {
    if (byId.has(chip.dataset.val ?? "")) chip.remove();
  }

  for (const option of comboBox.select.options) {
    const expansion = byId.get(option.value);
    if (!expansion) continue;

    option.selected = true;
    expansion.item.classList.add("selected");

    const chip = createChip(expansion);
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      const fromRight = chip.getBoundingClientRect().right - event.clientX;
      if (fromRight >= CHIP_REMOVE_HIT_WIDTH) return;
      event.stopPropagation();
      deselect(comboBox, option, chip);
    });
    comboBox.chipAnchor.before(chip);
  }

  dispatch(comboBox.select, "change");
};

/** Identifies the current option list. It changes when another card loads. */
export type OptionsSnapshot = { root: HTMLElement | null; signature: string };

export const snapshotOptions = (): OptionsSnapshot => {
  const comboBox = findExpansionComboBox();
  return {
    root: comboBox?.root ?? null,
    signature: comboBox
      ? Array.from(comboBox.select.options, (o) => o.value).join(",")
      : "",
  };
};

/**
 * Waits until the expansion picker differs from `previous`, has options, and
 * stays the same for `stableMs`. After a card is picked, Cardmarket replaces
 * the whole picker element, so this looks it up again on each check.
 * Returns the new picker, or null on timeout.
 */
export const waitForExpansionOptions = async (
  previous: OptionsSnapshot,
  {
    stableMs = 350,
    timeoutMs = 10_000,
    signal,
  }: { stableMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ExpansionComboBox | null> => {
  const deadline = Date.now() + timeoutMs;
  let last: OptionsSnapshot | undefined;
  let stableSince = Date.now();

  while (Date.now() < deadline && !signal?.aborted) {
    const current = snapshotOptions();
    const changed =
      current.root !== previous.root ||
      current.signature !== previous.signature;

    if (current.root !== last?.root || current.signature !== last.signature) {
      last = current;
      stableSince = Date.now();
    } else if (
      changed &&
      current.signature !== "" &&
      Date.now() - stableSince >= stableMs
    ) {
      log.debug("Expansion options ready");
      return findExpansionComboBox();
    }
    await sleep(100);
  }

  log.warn("Timed out while waiting for the expansion options");
  return null;
};
