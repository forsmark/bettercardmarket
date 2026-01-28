import { attachAutoSelectButton } from "./expansions.js";
import { attachAutoListButton } from "./auto_list.js";

// Entry point for content scripts.
attachAutoSelectButton();
attachAutoListButton();

const obs = new MutationObserver(() => {
  attachAutoSelectButton();
  attachAutoListButton();
});
obs.observe(document.documentElement, { subtree: true, childList: true });
