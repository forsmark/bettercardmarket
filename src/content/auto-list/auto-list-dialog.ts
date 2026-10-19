import { openOptionsPage } from "../../shared/messages";
import { h } from "../lib/dom";
import { type DeckEntry, parseDecklist } from "./decklist";

/** Where the decklist in the dialog came from. */
export type DecklistSource =
  "paste" | "clipboard" | "clipboard-failed" | "pocket";

export type AutoListRequest = {
  entries: DeckEntry[];
  autoSelect: boolean;
  source: DecklistSource;
};

const HELP: Record<DecklistSource, string> = {
  paste:
    "Paste a decklist with one card per line. Set codes, comments and section headers are ignored.",
  clipboard:
    "This is the text from your clipboard. Check it, then click Start.",
  "clipboard-failed":
    "Could not read the clipboard. Paste the decklist here with Ctrl+V or Cmd+V.",
  pocket:
    "These are the cards in your pocket. Cards that Auto list adds leave the pocket.",
};

const PLACEHOLDER = "4 Arbor Elf\n2x Lightning Bolt\n1 Sol Ring (CMM) 400";

const describe = (entries: readonly DeckEntry[]): string => {
  if (!entries.length) return "No cards yet";
  const copies = entries.reduce((sum, e) => sum + e.quantity, 0);
  const cards = entries.length === 1 ? "1 card" : `${entries.length} cards`;
  return `${cards}, ${copies} ${copies === 1 ? "copy" : "copies"}`;
};

/**
 * Opens the decklist dialog. Calls `onStart` with the parsed entries when the
 * user clicks Start or presses Ctrl+Enter.
 */
export const openAutoListDialog = ({
  autoSelectDefault,
  source = "paste",
  initialText = "",
  onStart,
}: {
  autoSelectDefault: boolean;
  source?: DecklistSource;
  initialText?: string;
  onStart: (request: AutoListRequest) => void;
}): void => {
  const textarea = h("textarea", {
    className: "form-control bcm-dialog__decklist",
    attrs: {
      rows: "12",
      placeholder: PLACEHOLDER,
      "aria-label": "Decklist",
      spellcheck: "false",
    },
  });
  const summary = h("span", {
    className: "bcm-dialog__summary",
    text: describe([]),
    attrs: { "aria-live": "polite" },
  });
  const autoSelect = h("input", {
    className: "form-check-input",
    attrs: { type: "checkbox", id: "bcm-auto-select" },
  });
  autoSelect.checked = autoSelectDefault;

  const closeButton = h("button", {
    className: "btn btn-outline-light btn-sm",
    text: "Close",
    attrs: { type: "button" },
  });
  const settingsButton = h("button", {
    className: "btn btn-link btn-sm bcm-dialog__settings",
    text: "Settings",
    attrs: { type: "button" },
  });
  const cancelButton = h("button", {
    className: "btn btn-outline-light",
    text: "Cancel",
    attrs: { type: "button" },
  });
  const startButton = h("button", {
    className: "btn btn-success",
    text: "Start",
    attrs: { type: "submit", disabled: "" },
  });

  const form = h(
    "form",
    { className: "bcm-dialog__form", attrs: { method: "dialog" } },
    [
      h("header", { className: "bcm-dialog__header" }, [
        h("h2", { className: "bcm-dialog__title", text: "Auto list" }),
        settingsButton,
        closeButton,
      ]),
      h("div", { className: "bcm-dialog__body" }, [
        h("p", {
          className: "bcm-dialog__help",
          text: HELP[source],
        }),
        textarea,
        h("div", { className: "bcm-dialog__meta" }, [
          h("label", { className: "form-check bcm-dialog__option" }, [
            autoSelect,
            h("span", {
              className: "form-check-label",
              text: "Auto-select expansions for each card",
            }),
          ]),
          summary,
        ]),
      ]),
      h("footer", { className: "bcm-dialog__footer" }, [
        cancelButton,
        startButton,
      ]),
    ],
  );

  const dialog = h(
    "dialog",
    {
      className: "bcm-dialog",
      attrs: { "aria-label": "Auto list" },
    },
    [form],
  );

  let entries: DeckEntry[] = [];
  const update = () => {
    entries = parseDecklist(textarea.value);
    summary.textContent = describe(entries);
    startButton.disabled = entries.length === 0;
  };

  const close = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove());
  // Close when the click lands on the backdrop, outside the form.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  closeButton.addEventListener("click", close);
  cancelButton.addEventListener("click", close);
  settingsButton.addEventListener("click", () => {
    void openOptionsPage();
  });
  textarea.addEventListener("input", update);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!entries.length) return;
    close();
    onStart({ entries, autoSelect: autoSelect.checked, source });
  });

  textarea.value = initialText;
  update();

  document.body.append(dialog);
  dialog.showModal();
  textarea.focus();
};
