import { isExtensionMessage } from "../shared/messages";
import { readClipboard } from "./clipboard";
import { getCardPrints } from "./scryfall";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
    if (!isExtensionMessage(message)) return false;

    switch (message.type) {
      case "open-options":
        // Content scripts cannot call openOptionsPage() themselves.
        void chrome.runtime.openOptionsPage();
        return false;

      case "read-clipboard":
        readClipboard().then(
          (text) => sendResponse({ ok: true, text }),
          (error: unknown) =>
            sendResponse({ ok: false, error: errorMessage(error) }),
        );
        // Keeps the channel open for the asynchronous response.
        return true;

      case "get-card-prices":
        getCardPrints(message.names).then(
          (prints) => sendResponse({ ok: true, prints }),
          (error: unknown) =>
            sendResponse({ ok: false, error: errorMessage(error) }),
        );
        return true;
    }
  },
);
