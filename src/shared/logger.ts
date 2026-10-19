const PREFIX = "[Better CardMarket]";

let debugEnabled = false;

export const setDebugLogging = (enabled: boolean): void => {
  debugEnabled = enabled;
};

export const log = {
  debug: (...args: unknown[]): void => {
    if (debugEnabled) console.debug(PREFIX, ...args);
  },
  info: (...args: unknown[]): void => console.info(PREFIX, ...args),
  warn: (...args: unknown[]): void => console.warn(PREFIX, ...args),
};
