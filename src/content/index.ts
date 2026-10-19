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
import { mountWantsList } from "./wants-list/wants-list";

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

  if (isWantsListPage()) {
    mountWantsList(settings).catch((error: unknown) =>
      log.warn("Could not set up the wants list tools", error),
    );
  }
};

void main();
