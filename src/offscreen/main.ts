import { isOffscreenMessage } from "../shared/messages";

// The background worker opens this page only to read the clipboard. Extension
// pages with the clipboardRead permission can paste into a text field.
chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (text: string) => void) => {
    if (!isOffscreenMessage(message)) return false;

    const field = document.createElement("textarea");
    document.body.append(field);
    field.focus();
    document.execCommand("paste");
    sendResponse(field.value);
    field.remove();
    return false;
  },
);
