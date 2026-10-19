type ElementProps = {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
};

/** Creates an element with optional class, text, attributes and children. */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs }: ElementProps = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  for (const [name, value] of Object.entries(attrs ?? {})) {
    el.setAttribute(name, value);
  }
  el.append(...children);
  return el;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type WaitOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
};

/**
 * Polls `probe` until it returns a truthy value. Returns null on timeout or
 * when `signal` aborts.
 */
export const waitFor = async <T>(
  probe: () => T | null | undefined | false,
  { timeoutMs = 10_000, intervalMs = 100, signal }: WaitOptions = {},
): Promise<T | null> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !signal?.aborted) {
    const value = probe();
    if (value) return value;
    await sleep(intervalMs);
  }
  return null;
};

export const isVisible = (el: Element): boolean => {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

export const dispatch = (el: Element, ...types: string[]): void => {
  for (const type of types) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }
};

export const dispatchKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key }));
};

/**
 * Sets an input value through the native setter, so page scripts that patch
 * the `value` property still see the change.
 */
export const setInputValue = (input: HTMLInputElement, value: string): void => {
  Reflect.set(HTMLInputElement.prototype, "value", value, input);
  dispatch(input, "input");
};
