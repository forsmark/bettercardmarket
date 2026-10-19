import { isExtensionMessage } from "../shared/messages";

// Content scripts cannot call openOptionsPage(), so they ask this worker.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isExtensionMessage(message) && message.type === "open-options") {
    void chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
