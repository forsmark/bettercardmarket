import type { CardPricesRequest, CardPricesResponse } from "./card-prices";

/** Messages that content scripts send to the background service worker. */
export type ExtensionMessage = { type: "open-options" } | CardPricesRequest;

const MESSAGE_TYPES = new Set<string>(["open-options", "get-card-prices"]);

export const isExtensionMessage = (value: unknown): value is ExtensionMessage =>
  typeof value === "object" &&
  value !== null &&
  MESSAGE_TYPES.has(String((value as { type?: unknown }).type));

export const openOptionsPage = (): Promise<unknown> =>
  chrome.runtime.sendMessage({
    type: "open-options",
  } satisfies ExtensionMessage);

/** Asks the background worker for Scryfall printings of `names`. */
export const requestCardPrints = (
  names: string[],
): Promise<CardPricesResponse> =>
  chrome.runtime.sendMessage<ExtensionMessage, CardPricesResponse>({
    type: "get-card-prices",
    names,
  });
