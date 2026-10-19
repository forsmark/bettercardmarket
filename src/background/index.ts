import type { CardPricesResponse } from "../shared/card-prices";
import { isExtensionMessage } from "../shared/messages";
import { getCardPrints } from "./scryfall";

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender,
    sendResponse: (r: CardPricesResponse) => void,
  ) => {
    if (!isExtensionMessage(message)) return false;

    switch (message.type) {
      case "open-options":
        // Content scripts cannot call openOptionsPage() themselves.
        void chrome.runtime.openOptionsPage();
        return false;

      case "get-card-prices":
        getCardPrints(message.names).then(
          (prints) => sendResponse({ ok: true, prints }),
          (error: unknown) =>
            sendResponse({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }),
        );
        // Keeps the channel open for the asynchronous response.
        return true;
    }
  },
);

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
