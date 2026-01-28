import { DEBUG_MODE, LOG_PREFIX } from "./constants.js";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const waitFor = async (
  fn,
  { timeoutMs = 10000, intervalMs = 100 } = {},
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const val = fn();
      if (val) return val;
    } catch {}
    await sleep(intervalMs);
  }
  return null;
};

export const parseDecklist = (text) => {
  const entries = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"))
    .map((line) => {
      // supports: "4 Arbor Elf", "4x Arbor Elf", "Arbor Elf"
      const m = line.match(/^\s*(\d+)\s*(x)?\s+(.+?)\s*$/i);
      if (m) return { qty: Number(m[1]), name: m[3].trim() };
      return { qty: 1, name: line };
    })
    .filter((e) => e.name.length > 0 && Number.isFinite(e.qty) && e.qty > 0);

  debugLog("Parsed decklist entries", entries);
  return entries;
};

export const findCardSearchInput = () => {
  const byId = document.getElementById("WantsCardSearch");
  if (byId) return byId;

  const byPlaceholder = document.querySelector(
    'input[type="text"][placeholder*="card name" i]',
  );
  if (byPlaceholder) return byPlaceholder;

  const form = document.getElementById("AddCardForm");
  if (!form) return null;

  const candidates = Array.from(form.querySelectorAll('input[type="text"]'));
  const filtered = candidates.filter(
    (i) =>
      i.name !== "idProductTempInput" &&
      i.name !== "idLanguageTempInput" &&
      i.id !== "IdMetacardInput",
  );
  return filtered[0] || null;
};

export const triggerSearch = async (input, text) => {
  debugLog("triggerSearch()", { text });

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  input.focus();

  // clear
  nativeSetter?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(60);

  // type value
  nativeSetter?.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));

  // key events (Cardmarket uses inline onkeyup)
  input.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: "a" }),
  );
  input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a" }));

  await sleep(60);

  // trailing space to force refresh
  nativeSetter?.call(input, text + " ");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: " " }),
  );
  input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
};

export const clickTopSearchResult = async (expectedName) => {
  const expected = (expectedName || "").toLowerCase().trim();
  debugLog("clickTopSearchResult() called", { expected });

  const container = await waitFor(
    () => {
      const el = document.getElementById("AddCardAutoCompleteResult");
      if (!el) return null;

      const isShown =
        el.classList.contains("show") &&
        el.style.visibility !== "hidden" &&
        el.getBoundingClientRect().width > 0 &&
        el.getBoundingClientRect().height > 0;

      if (!isShown) return null;
      return el;
    },
    { timeoutMs: 8000, intervalMs: 100 },
  );

  if (!container) {
    console.warn(
      LOG_PREFIX,
      "No AddCardAutoCompleteResult container found/shown",
    );
    return false;
  }

  const suggestionToClick = await waitFor(
    () => {
      const items = Array.from(
        container.querySelectorAll("a.autocomplete-link.dropdown-item"),
      ).filter((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      const texts = items.map((a) => (a.textContent || "").trim());
      debugLog("Autocomplete suggestions in container", texts);

      if (!items.length) return null;
      if (!expected) return items[0];

      // STRICT: don't click until it matches expected (prevents stale click)
      const exactish = items.find((a) =>
        (a.textContent || "").toLowerCase().includes(expected),
      );
      if (exactish) return exactish;

      const firstWord = expected.split(/\s+/)[0];
      if (firstWord) {
        const partial = items.find((a) =>
          (a.textContent || "").toLowerCase().includes(firstWord),
        );
        if (partial) return partial;
      }

      return null;
    },
    { timeoutMs: 8000, intervalMs: 100 },
  );

  if (!suggestionToClick) {
    console.warn(
      LOG_PREFIX,
      "No matching suggestion appeared for",
      expectedName,
    );
    return false;
  }

  console.log(
    LOG_PREFIX,
    "Clicking suggestion (container-scoped)",
    (suggestionToClick.textContent || "").trim(),
  );
  suggestionToClick.click();
  return true;
};

export const setProgressUI = (ui, { index, total, text }) => {
  if (!ui) return;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  if (ui.status) ui.status.textContent = text || "";
  if (ui.count) ui.count.textContent = `${Math.min(index + 1, total)}/${total}`;
  if (ui.bar) ui.bar.style.width = `${pct}%`;
  if (ui.bar) ui.bar.setAttribute("aria-valuenow", String(pct));
};

export const debugLog = (...args) => {
  if (!DEBUG_MODE) return;

  console.log(LOG_PREFIX, ...args);
};
