import type { OffscreenMessage } from "../shared/messages";

const OFFSCREEN_URL = "src/offscreen/index.html";

const hasOffscreenDocument = async (): Promise<boolean> =>
  (
    await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    })
  ).length > 0;

/**
 * Reads text from the clipboard through an offscreen page. Service workers
 * have no clipboard access of their own.
 */
export const readClipboard = async (): Promise<string> => {
  if (!(await hasOffscreenDocument())) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Read a decklist from the clipboard for Auto list.",
    });
  }
  try {
    return await chrome.runtime.sendMessage<OffscreenMessage, string>({
      type: "offscreen-read-clipboard",
    });
  } finally {
    await chrome.offscreen.closeDocument();
  }
};
