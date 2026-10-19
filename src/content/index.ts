import { log, setDebugLogging } from "../shared/logger";
import {
  loadSettings,
  type Settings,
  subscribeToSettings,
} from "../shared/settings";
import { mountAutoListButton } from "./auto-list/auto-list";
import { mountAutoSelectButton } from "./auto-select/auto-select";
import { isWantsListPage } from "./cardmarket/page";
import "./content.css";
import { mountWantsPrices } from "./wants-prices/wants-prices";

const main = async (): Promise<void> => {
  let settings: Settings = await loadSettings();
  setDebugLogging(settings.debugLogging);
  subscribeToSettings((next) => {
    settings = next;
    setDebugLogging(next.debugLogging);
  });
  const getSettings = () => settings;

  const mount = () => {
    mountAutoSelectButton(getSettings);
    mountAutoListButton(getSettings);
  };

  // Cardmarket renders parts of the form late, so mount again after DOM
  // changes, at most once per animation frame.
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount();
    });
  }).observe(document.body, { childList: true, subtree: true });

  mount();

  if (isWantsListPage() && settings.showPrices) {
    mountWantsPrices().catch((error: unknown) =>
      log.warn("Could not show prices", error),
    );
  }
};

void main();
