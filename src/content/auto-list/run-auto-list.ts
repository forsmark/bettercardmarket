import { log } from "../../shared/logger";
import type { Settings } from "../../shared/settings";
import { autoSelectExpansions } from "../auto-select/auto-select";
import {
  snapshotOptions,
  waitForExpansionOptions,
} from "../auto-select/expansion-combo-box";
import {
  type AddCardForm,
  findAddCardForm,
  findCardSearchInput,
  findMessages,
  getMessageKind,
  type MessageKind,
} from "../cardmarket/page";
import { dispatch, setInputValue, sleep, waitFor } from "../lib/dom";
import { frontFaceName, normalizeCardName } from "../../shared/card-names";
import { chooseSuggestion, typeCardSearch } from "./card-search";
import type { DeckEntry } from "./decklist";

export type SkippedEntry = DeckEntry & { reason: string };

export type AddedEntry = DeckEntry & {
  /** Cardmarket merged the card into an existing want for the same card. */
  merged: boolean;
};

export type AutoListResult = {
  added: AddedEntry[];
  skipped: SkippedEntry[];
  cancelled: boolean;
};

export type AutoListProgress = {
  index: number;
  total: number;
  entry: DeckEntry;
  step: "searching" | "adding";
};

type RunOptions = {
  autoSelect: boolean;
  getSettings: () => Settings;
  signal: AbortSignal;
  onProgress: (progress: AutoListProgress) => void;
};

class SkipEntry extends Error {}

/**
 * Returns the "Add card" form. Cardmarket re-renders parts of the form after
 * each card pick, so code must not keep these elements between steps.
 */
const requireForm = (): AddCardForm => {
  const form = findAddCardForm();
  if (!form) throw new SkipEntry("Add card form not found");
  return form;
};

/** Waits for the hidden card id to change after a suggestion is chosen. */
const waitForCardSelected = (previousId: string, signal: AbortSignal) =>
  waitFor(
    () => {
      const id = findAddCardForm()?.metacard.value;
      return id && id !== previousId;
    },
    { timeoutMs: 10_000, signal },
  );

/**
 * Clicks "Add card" and waits for Cardmarket's message about `cardName`, or
 * for an error message. The wait ignores cancellation, because the request is
 * already sent.
 */
const submitAndConfirm = async (cardName: string): Promise<MessageKind> => {
  const previous = new Set(findMessages());
  const wanted = normalizeCardName(cardName);
  requireForm().submit.click();

  const message = await waitFor(
    () =>
      findMessages().find(
        (m) =>
          !previous.has(m) &&
          (getMessageKind(m) === "error" ||
            normalizeCardName(m.textContent).includes(wanted)),
      ),
    { timeoutMs: 10_000 },
  );

  if (!message) throw new SkipEntry("No confirmation from Cardmarket");
  const kind = getMessageKind(message);
  if (kind === "error") {
    throw new SkipEntry(message.textContent.trim() || "Cardmarket error");
  }
  return kind;
};

const addEntry = async (
  entry: DeckEntry,
  search: HTMLInputElement,
  { autoSelect, getSettings, signal }: RunOptions,
  onAdding: () => void,
): Promise<AddedEntry> => {
  const started = performance.now();
  const step = (name: string) =>
    log.debug(
      `${entry.name}: ${name} after ${Math.round(performance.now() - started)} ms`,
    );

  const previousOptions = snapshotOptions();
  const previousId = requireForm().metacard.value;

  // Cardmarket's search does not always find "Front // Back" names, so
  // type the front face and match the suggestion against the full name.
  await typeCardSearch(search, frontFaceName(entry.name));
  const cardName = await chooseSuggestion(entry.name, signal);
  if (!cardName) throw new SkipEntry("No matching card");
  step("suggestion chosen");
  if (!(await waitForCardSelected(previousId, signal))) {
    throw new SkipEntry("Card selection did not load");
  }
  step("card selected");

  // Wait even without Auto Select, so "Add card" never sends the expansion
  // list of the previous card.
  const comboBox = await waitForExpansionOptions(previousOptions, { signal });
  if (signal.aborted) throw new SkipEntry("Cancelled");
  if (!comboBox) throw new SkipEntry("Expansions did not load");
  step("expansions loaded");

  const { quantity } = requireForm();
  setInputValue(quantity, String(entry.quantity));
  dispatch(quantity, "change");
  if (autoSelect) autoSelectExpansions(getSettings());

  onAdding();
  await sleep(100);
  const kind = await submitAndConfirm(cardName);
  step(kind);
  return { ...entry, merged: kind === "merged" };
};

/** Adds each entry to the open wants list, one at a time. */
export const runAutoList = async (
  entries: readonly DeckEntry[],
  options: RunOptions,
): Promise<AutoListResult> => {
  const result: AutoListResult = { added: [], skipped: [], cancelled: false };
  const search = findCardSearchInput();

  if (!search || !findAddCardForm()) {
    log.warn("Add card form not found");
    result.skipped = entries.map((e) => ({ ...e, reason: "Form not found" }));
    return result;
  }

  for (const [index, entry] of entries.entries()) {
    if (options.signal.aborted) {
      result.cancelled = true;
      break;
    }

    const report = (step: AutoListProgress["step"]) =>
      options.onProgress({ index, total: entries.length, entry, step });
    report("searching");

    try {
      result.added.push(
        await addEntry(entry, search, options, () => report("adding")),
      );
    } catch (error) {
      if (!(error instanceof SkipEntry)) throw error;
      // Waits end early on cancel. That is not a reason to skip the card.
      if (options.signal.aborted) {
        result.cancelled = true;
        break;
      }
      log.warn(`Skipped "${entry.name}": ${error.message}`);
      result.skipped.push({ ...entry, reason: error.message });
    }
  }

  log.debug("Auto list finished", result);
  return result;
};
