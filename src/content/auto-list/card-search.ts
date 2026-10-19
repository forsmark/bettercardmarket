import { log } from "../../shared/logger";
import {
  AUTOCOMPLETE_ITEM_SELECTOR,
  findAutocompleteResults,
} from "../cardmarket/page";
import {
  dispatch,
  dispatchKey,
  isVisible,
  setInputValue,
  sleep,
  waitFor,
} from "../lib/dom";

/** Lowercases, removes accents and turns punctuation into single spaces. */
export const normalizeCardName = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Picks the suggestion that best matches `wanted`: an exact match first, then
 * a name that starts with it (double-faced cards), then a name that contains
 * it. Returns null when nothing matches, so a stale list is never used.
 */
export const pickSuggestion = <T>(
  suggestions: readonly { label: string; value: T }[],
  wanted: string,
): T | null => {
  const target = normalizeCardName(wanted);
  if (!target) return null;

  const named = suggestions.map((s) => ({
    ...s,
    name: normalizeCardName(s.label),
  }));
  const match =
    named.find((s) => s.name === target) ??
    named.find((s) => s.name.startsWith(`${target} `)) ??
    named.find((s) => s.name.includes(target));
  return match?.value ?? null;
};

/** Types `name` into the card search the same way a person would. */
export const typeCardSearch = async (
  input: HTMLInputElement,
  name: string,
): Promise<void> => {
  input.focus();

  setInputValue(input, "");
  dispatch(input, "change");
  await sleep(60);

  // Cardmarket starts the search from an inline onkeyup handler.
  setInputValue(input, name);
  dispatchKey(input, "a");
  await sleep(60);

  // A trailing space makes the autocomplete refresh even for the same text.
  setInputValue(input, `${name} `);
  dispatchKey(input, " ");
};

const findVisibleSuggestions = (): HTMLAnchorElement[] => {
  const container = findAutocompleteResults();
  if (!container?.classList.contains("show") || !isVisible(container)) {
    return [];
  }
  return Array.from(
    container.querySelectorAll<HTMLAnchorElement>(AUTOCOMPLETE_ITEM_SELECTOR),
  ).filter(isVisible);
};

/**
 * Waits for a suggestion that matches `name` and clicks it. Returns the card
 * name as Cardmarket shows it, or null when nothing matched.
 */
export const chooseSuggestion = async (
  name: string,
  signal?: AbortSignal,
): Promise<string | null> => {
  const suggestion = await waitFor(
    () =>
      pickSuggestion(
        findVisibleSuggestions().map((a) => ({
          label: a.textContent,
          value: a,
        })),
        name,
      ),
    { timeoutMs: 8_000, signal },
  );

  if (!suggestion) {
    log.warn("No matching suggestion for", name);
    return null;
  }

  const cardName = suggestion.textContent.trim();
  log.debug("Choosing suggestion", cardName);
  suggestion.click();
  return cardName;
};
