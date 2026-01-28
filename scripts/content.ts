import { attachAutoSelectButton } from "./expansions";
import { attachAutoListButton } from "./auto_list";

// Entry point for content scripts.
attachAutoSelectButton();
attachAutoListButton();

const obs = new MutationObserver(() => {
  attachAutoSelectButton();
  attachAutoListButton();
});
obs.observe(document.documentElement, { subtree: true, childList: true });
