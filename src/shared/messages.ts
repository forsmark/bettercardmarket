import type { CardPricesRequest, CardPricesResponse } from "./card-prices";

/** Messages that content scripts send to the background service worker. */
export type ExtensionMessage =
  { type: "open-options" } | { type: "read-clipboard" } | CardPricesRequest;

export type ClipboardResponse =
  { ok: true; text: string } | { ok: false; error: string };

/** Message from the background worker to its offscreen clipboard page. */
export type OffscreenMessage = { type: "offscreen-read-clipboard" };

const MESSAGE_TYPES = new Set<string>([
  "open-options",
  "read-clipboard",
  "get-card-prices",
]);

const typeOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null
    ? (value as { type?: unknown }).type
    : undefined;

export const isExtensionMessage = (value: unknown): value is ExtensionMessage =>
  MESSAGE_TYPES.has(String(typeOf(value)));

export const isOffscreenMessage = (value: unknown): value is OffscreenMessage =>
  typeOf(value) === "offscreen-read-clipboard";

export const openOptionsPage = (): Promise<unknown> =>
  chrome.runtime.sendMessage<ExtensionMessage>({ type: "open-options" });

/** Asks the background worker for Scryfall printings of `names`. */
export const requestCardPrints = (
  names: string[],
): Promise<CardPricesResponse> =>
  chrome.runtime.sendMessage<ExtensionMessage, CardPricesResponse>({
    type: "get-card-prices",
    names,
  });

/** Asks the background worker for the text on the clipboard. */
export const requestClipboardText = (): Promise<ClipboardResponse> =>
  chrome.runtime.sendMessage<ExtensionMessage, ClipboardResponse>({
    type: "read-clipboard",
  });
