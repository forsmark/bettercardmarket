import { pickExpansions } from "../../shared/expansion-rules";
import { log } from "../../shared/logger";
import { saveRecentExpansions } from "../../shared/recent-expansions";
import type { Settings } from "../../shared/settings";
import {
  findCardSearchInput,
  findExpansionComboBox,
  findExpansionLabel,
} from "../cardmarket/page";
import { h } from "../lib/dom";
import { readExpansionOptions, selectExpansions } from "./expansion-combo-box";

const BUTTON_MARKER = "data-bcm-auto-select";

/**
 * Selects the expansions that the rules allow, up to the configured limit.
 * Returns the number of selected expansions.
 */
export const autoSelectExpansions = (settings: Settings): number => {
  const comboBox = findExpansionComboBox();
  if (!comboBox) {
    log.warn("Expansion picker not found");
    return 0;
  }

  const options = readExpansionOptions(comboBox);
  const picked = pickExpansions(
    options,
    settings,
    settings.maxSelectedExpansions,
  );
  selectExpansions(comboBox, picked);
  log.debug(
    "Auto Select picked",
    picked.map((e) => e.name),
  );

  // Lets the settings page preview the rules against a real list.
  void saveRecentExpansions({
    card: findCardSearchInput()?.value.trim() || "Unknown card",
    names: options.map((o) => o.name),
    seenAt: Date.now(),
  });

  return picked.length;
};

/** Adds the Auto Select button next to the "Expansion" label. */
export const mountAutoSelectButton = (getSettings: () => Settings): void => {
  const label = findExpansionLabel();
  if (!label || label.querySelector(`[${BUTTON_MARKER}]`)) return;

  const button = h("button", {
    className: "btn btn-outline-light btn-sm ms-2",
    text: "Auto Select",
    attrs: {
      type: "button",
      [BUTTON_MARKER]: "",
      title: "Select the expansions that your Auto Select rules allow",
    },
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    autoSelectExpansions(getSettings());
  });

  label.append(button);
};
