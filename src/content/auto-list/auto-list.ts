import { log } from "../../shared/logger";
import { requestClipboardText } from "../../shared/messages";
import {
  formatPocket,
  loadPocket,
  pocketTotals,
  removeFromPocket,
} from "../../shared/pocket";
import type { Settings } from "../../shared/settings";
import { findCardSearchInput } from "../cardmarket/page";
import { h } from "../lib/dom";
import { plural } from "../../shared/format";
import {
  type AutoListRequest,
  type DecklistSource,
  openAutoListDialog,
} from "./auto-list-dialog";
import { showProgressToast } from "./progress-toast";
import { runAutoList } from "./run-auto-list";

const BUTTON_MARKER = "data-bcm-auto-list";

let running = false;

const start = async (
  { entries, autoSelect, source }: AutoListRequest,
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
    // Cards that reached the wants list leave the pocket. Skipped cards stay.
    if (source === "pocket") {
      await removeFromPocket(result.added.map((entry) => entry.name));
    }
    toast.finish(result);
  } catch (error) {
    log.warn("Auto list stopped because of an error", error);
    toast.fail("Stopped because of an error. See the console for details.");
  } finally {
    running = false;
  }
};

const openDialog = (
  getSettings: () => Settings,
  source: DecklistSource,
  initialText = "",
) => {
  if (running) return;
  openAutoListDialog({
    autoSelectDefault: getSettings().autoSelectOnAutoList,
    source,
    initialText,
    onStart: (request) => void start(request, getSettings),
  });
};

const readClipboard = async (): Promise<string | null> => {
  try {
    const response = await requestClipboardText();
    if (response.ok) return response.text;
    log.warn("Could not read the clipboard:", response.error);
  } catch (error) {
    log.warn("Could not reach the background worker:", error);
  }
  return null;
};

type MenuItem = {
  label: string;
  detail?: string;
  disabled?: boolean;
  run: () => void;
};

/**
 * Small menu below the split button's arrow. Arrow keys move between items,
 * and Escape or a click outside closes it.
 */
const createMenu = (anchor: HTMLElement, toggle: HTMLButtonElement) => {
  const menu = h("div", {
    className: "bcm-menu",
    attrs: { role: "menu", "aria-label": "Auto list sources" },
  });
  menu.hidden = true;
  anchor.append(menu);

  const items = () =>
    Array.from(
      menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );

  const close = (focusToggle = false) => {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutside, true);
    if (focusToggle) toggle.focus();
  };

  const onOutside = (event: Event) => {
    if (!anchor.contains(event.target as Node)) close();
  };

  menu.addEventListener("keydown", (event) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    } else if (event.key === "Tab") {
      close();
    }
  });

  const open = (entries: MenuItem[]) => {
    menu.replaceChildren(
      ...entries.map((item) => {
        const button = h(
          "button",
          {
            className: "bcm-menu__item",
            attrs: { type: "button", role: "menuitem" },
          },
          [
            h("span", { text: item.label }),
            item.detail
              ? h("span", { className: "bcm-menu__detail", text: item.detail })
              : "",
          ],
        );
        button.disabled = Boolean(item.disabled);
        button.addEventListener("click", () => {
          close();
          item.run();
        });
        return button;
      }),
    );
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", onOutside, true);
    items()[0]?.focus();
  };

  return { open, close, isOpen: () => !menu.hidden };
};

/**
 * Adds the Auto list split button to the right of the card search field.
 * The main part opens the decklist dialog. The arrow opens a menu with the
 * clipboard and the pocket as sources.
 */
export const mountAutoListButton = (getSettings: () => Settings): void => {
  const search = findCardSearchInput();
  if (!search || document.querySelector(`[${BUTTON_MARKER}]`)) return;

  const mainButton = h("button", {
    className: "btn btn-success btn-sm",
    text: "Auto list",
    attrs: { type: "button", title: "Add a whole decklist to this wants list" },
  });
  const toggle = h("button", {
    className: "btn btn-success btn-sm bcm-split__toggle",
    attrs: {
      type: "button",
      "aria-label": "More ways to Auto list",
      "aria-haspopup": "menu",
      "aria-expanded": "false",
    },
  });
  const group = h(
    "div",
    { className: "bcm-split", attrs: { [BUTTON_MARKER]: "" } },
    [mainButton, toggle],
  );
  const menu = createMenu(group, toggle);

  mainButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDialog(getSettings, "paste");
  });

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.isOpen()) return menu.close();

    void loadPocket().then((pocket) => {
      const { cards } = pocketTotals(pocket);
      menu.open([
        {
          label: "Paste a decklist",
          run: () => openDialog(getSettings, "paste"),
        },
        {
          label: "From clipboard",
          run: () => {
            void readClipboard().then((text) =>
              openDialog(
                getSettings,
                text === null ? "clipboard-failed" : "clipboard",
                text ?? "",
              ),
            );
          },
        },
        {
          label: "From pocket",
          detail: cards ? plural(cards, "card") : "Empty",
          disabled: cards === 0,
          run: () => openDialog(getSettings, "pocket", formatPocket(pocket)),
        },
      ]);
    });
  });

  // Put the input and the button on one row, inside the autocomplete wrapper
  // so the suggestion list keeps its position.
  const row = h("div", { className: "bcm-search-row" });
  search.before(row);
  row.append(search, group);
};
