import { log } from "../../shared/logger";
import type { Settings } from "../../shared/settings";
import { findCardSearchInput } from "../cardmarket/page";
import { h } from "../lib/dom";
import { type AutoListRequest, openAutoListDialog } from "./auto-list-dialog";
import { showProgressToast } from "./progress-toast";
import { runAutoList } from "./run-auto-list";

const BUTTON_MARKER = "data-bcm-auto-list";

let running = false;

const start = async (
  { entries, autoSelect }: AutoListRequest,
  getSettings: () => Settings,
): Promise<void> => {
  running = true;
  const controller = new AbortController();
  const toast = showProgressToast(entries.length, () => controller.abort());

  try {
    const result = await runAutoList(entries, {
      autoSelect,
      getSettings,
      signal: controller.signal,
      onProgress: toast.update,
    });
    toast.finish(result);
  } catch (error) {
    log.warn("Auto list stopped because of an error", error);
    toast.fail("Stopped because of an error. See the console for details.");
  } finally {
    running = false;
  }
};

/** Adds the Auto list button to the right of the card search field. */
export const mountAutoListButton = (getSettings: () => Settings): void => {
  const search = findCardSearchInput();
  if (!search || document.querySelector(`[${BUTTON_MARKER}]`)) return;

  const button = h("button", {
    className: "btn btn-success btn-sm",
    text: "Auto list",
    attrs: {
      type: "button",
      [BUTTON_MARKER]: "",
      title: "Add a whole decklist to this wants list",
    },
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (running) return;
    openAutoListDialog({
      autoSelectDefault: getSettings().autoSelectOnAutoList,
      onStart: (request) => void start(request, getSettings),
    });
  });

  // Put the input and the button on one row, inside the autocomplete wrapper
  // so the suggestion list keeps its position.
  const row = h("div", { className: "bcm-search-row" });
  search.before(row);
  row.append(search, button);
};
