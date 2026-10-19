/** Messages that content scripts send to the background service worker. */
export type ExtensionMessage = { type: "open-options" };

export const sendMessage = (message: ExtensionMessage): Promise<unknown> =>
  chrome.runtime.sendMessage(message);

export const isExtensionMessage = (value: unknown): value is ExtensionMessage =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "open-options";
