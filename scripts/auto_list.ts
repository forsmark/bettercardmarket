import { LOG_PREFIX } from "./constants";
import {
  clickTopSearchResult,
  debugLog,
  type DeckEntry,
  findCardSearchInput,
  parseDecklist,
  type ProgressUI,
  setProgressUI,
  sleep,
  triggerSearch,
  waitFor,
} from "./utils";
import {
  autoSelectExpansions,
  clearExpansionSelectionUI,
  waitForExpansionOptionsReady,
} from "./expansions";

type ToastUI = ProgressUI & { close: () => void; disableCancel: () => void };

let AUTO_LIST_CANCELLED = false;

const processDeckEntries = async (
  entries: DeckEntry[],
  ui: ProgressUI,
): Promise<void> => {
  const form = document.getElementById("AddCardForm");
  if (!form) return;

  const searchInput = findCardSearchInput();
  const qtyInput = document.getElementById("WantsQuantity") as
    | HTMLInputElement
    | null;
  const addButton = form.querySelector('button[type="submit"]') as
    | HTMLButtonElement
    | null;
  const metacardInput = document.getElementById("IdMetacardInput") as
    | HTMLInputElement
    | null;

  if (!searchInput || !qtyInput || !addButton || !metacardInput) {
    console.warn(LOG_PREFIX, "Required inputs not found", {
      searchInput,
      qtyInput,
      addButton,
      metacardInput,
    });
    return;
  }

  debugLog("Starting processDeckEntries", { entries });

  for (let idx = 0; idx < entries.length; idx++) {
    if (AUTO_LIST_CANCELLED) {
      console.warn(LOG_PREFIX, "Cancelled — stopping loop");
      setProgressUI(ui, {
        index: idx,
        total: entries.length,
        text: "Cancelled.",
      });
      return;
    }

    const entry = entries[idx];
    console.log(
      LOG_PREFIX,
      `Processing entry ${idx + 1}/${entries.length}`,
      entry,
    );

    setProgressUI(ui, {
      index: idx,
      total: entries.length,
      text: `Searching: ${entry.qty} ${entry.name}`,
    });

    // 1) set quantity
    qtyInput.value = String(entry.qty);
    qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
    qtyInput.dispatchEvent(new Event("change", { bubbles: true }));

    // 2) search card name
    const expectedName = (entry.name || "").trim();
    const beforeId = metacardInput.value;

    await triggerSearch(searchInput, expectedName);

    // 3) select top result (strict match)
    const clicked = await clickTopSearchResult(expectedName);
    if (!clicked) {
      console.warn(LOG_PREFIX, "Failed to select card, skipping", expectedName);
      setProgressUI(ui, {
        index: idx,
        total: entries.length,
        text: `No match for: ${expectedName} (skipped)`,
      });
      await sleep(250);
      continue;
    }

    // Wait until hidden metacard id changes (selection confirmed)
    const changed = await waitFor(
      () => metacardInput.value && metacardInput.value !== beforeId,
      { timeoutMs: 10000, intervalMs: 100 },
    );

    debugLog("Metacard change", {
      expectedName,
      beforeId,
      afterId: metacardInput.value,
      changed: Boolean(changed),
    });

    if (!changed) {
      console.warn(
        LOG_PREFIX,
        "Metacard did not change — skipping",
        expectedName,
      );
      setProgressUI(ui, {
        index: idx,
        total: entries.length,
        text: `Selection failed for: ${expectedName} (skipped)`,
      });
      await sleep(250);
      continue;
    }

    // 4) expansions: clear old state, wait for new options, then select
    clearExpansionSelectionUI();

    // Wait until the expansion list has actually refreshed for the newly selected card
    await waitForExpansionOptionsReady({
      minCount: 10,
      stableMs: 350,
      timeoutMs: 10000,
    });

    // Now apply your selection logic
    autoSelectExpansions();

    // Let UI settle
    await sleep(100);

    // 5) press Add Card
    setProgressUI(ui, {
      index: idx,
      total: entries.length,
      text: `Adding: ${entry.qty} ${entry.name}`,
    });

    addButton.click();
    await sleep(250);
  }

  setProgressUI(ui, {
    index: entries.length - 1,
    total: entries.length,
    text: "Done!",
  });

  debugLog("Completed all entries");
};

const openAutoListModal = (): void => {
  AUTO_LIST_CANCELLED = false;

  const backdrop = document.createElement("div");
  backdrop.setAttribute("data-mt-auto-list", "1");
  backdrop.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483646;" +
    "display:flex;align-items:center;justify-content:center;padding:16px;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "width:min(720px, 100%);background:#1b1f23;border:1px solid rgba(255,255,255,.15);" +
    "border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.5);";

  const header = document.createElement("div");
  header.style.cssText =
    "padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12);" +
    "display:flex;align-items:center;justify-content:space-between;";

  const title = document.createElement("div");
  title.textContent = "Auto list";
  title.style.cssText = "font-weight:600;color:#fff;";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn-outline-light btn-sm";
  closeBtn.textContent = "Close";

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.style.cssText = "padding:14px;";

  const help = document.createElement("div");
  help.style.cssText =
    "color:rgba(255,255,255,.75);font-size:13px;margin-bottom:10px;";
  help.textContent =
    "Paste a decklist (e.g. '4 Arbor Elf' per line), then click Start.";

  const textarea = document.createElement("textarea");
  textarea.className = "form-control";
  textarea.rows = 10;
  textarea.placeholder = "4 Arbor Elf\n2 Lightning Bolt\n...";
  textarea.style.cssText =
    "background:#0f1317;color:#fff;border-color:rgba(255,255,255,.15);";

  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:12px 14px;border-top:1px solid rgba(255,255,255,.12);" +
    "display:flex;gap:10px;justify-content:flex-end;";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "btn btn-success";
  startBtn.innerHTML = '<span class="fonticon-plus me-2"></span>Start';

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-outline-light";
  cancelBtn.textContent = "Cancel";

  footer.appendChild(cancelBtn);
  footer.appendChild(startBtn);

  body.appendChild(help);
  body.appendChild(textarea);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e: MouseEvent) => {
    if (e.target === backdrop) close();
  });

  startBtn.addEventListener("click", async () => {
    const entries = parseDecklist(textarea.value);
    if (!entries.length) return;

    debugLog("Start clicked — closing modal and starting run", {
      count: entries.length,
    });

    // CLOSE MODAL so it doesn't block the page
    close();

    // Show non-blocking progress + cancel
    const ui = createProgressToast(entries.length);

    try {
      await processDeckEntries(entries, ui);
      ui.disableCancel();
      await sleep(500);
    } finally {
      ui.close();
    }
  });

  textarea.focus();
};

export const attachAutoListButton = (): boolean => {
  const searchInput = findCardSearchInput();
  if (!searchInput) return false;

  const existing = document.querySelector('[data-mt-auto-list-button="1"]');
  if (existing) return true;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Auto list";
  btn.className = "btn btn-success btn-sm";
  btn.setAttribute("data-mt-auto-list-button", "1");

  btn.addEventListener("click", (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAutoListModal();
  });

  // FIX ALIGNMENT:
  // Wrap the input + button in a flex container so it stays on the same line.
  const wrapper =
    searchInput.closest("#autoCompWrapper") || searchInput.parentElement;
  if (!wrapper) {
    searchInput.insertAdjacentElement("afterend", btn);
    return true;
  }

  // Avoid re-wrapping if already done
  let flexRow = wrapper.querySelector<HTMLDivElement>(
    '[data-mt-search-row="1"]',
  );
  if (!flexRow) {
    flexRow = document.createElement("div");
    flexRow.setAttribute("data-mt-search-row", "1");
    flexRow.className = "d-flex align-items-center gap-2";
    // Make sure it takes the available width
    flexRow.style.width = "100%";

    // Insert flexRow before searchInput, then move searchInput into it
    wrapper.insertBefore(flexRow, searchInput);
    flexRow.appendChild(searchInput);
  }

  flexRow.appendChild(btn);

  // Let the input expand and keep button tight
  searchInput.style.flex = "1 1 auto";
  btn.style.flex = "0 0 auto";

  return true;
};

const createProgressToast = (total: number): ToastUI => {
  const wrap = document.createElement("div");
  wrap.setAttribute("data-mt-auto-list-toast", "1");
  wrap.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147483647;" +
    "width:min(380px, calc(100vw - 32px));" +
    "background:#1b1f23;border:1px solid rgba(255,255,255,.15);" +
    "border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);" +
    "padding:12px 12px;";

  const title = document.createElement("div");
  title.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";
  title.innerHTML = `<div style="color:#fff;font-weight:600;">Auto list</div>`;

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-outline-light btn-sm";
  cancelBtn.textContent = "Cancel";

  title.appendChild(cancelBtn);

  const statusRow = document.createElement("div");
  statusRow.style.cssText =
    "display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;color:rgba(255,255,255,.8);font-size:13px;";

  const statusText = document.createElement("div");
  statusText.textContent = "Starting...";

  const countText = document.createElement("div");
  countText.textContent = `0/${total}`;

  statusRow.appendChild(statusText);
  statusRow.appendChild(countText);

  wrap.appendChild(title);
  wrap.appendChild(statusRow);

  document.body.appendChild(wrap);

  cancelBtn.addEventListener("click", () => {
    AUTO_LIST_CANCELLED = true;
    cancelBtn.disabled = true;
    statusText.textContent = "Cancelling...";
    console.warn(LOG_PREFIX, "Cancel requested");
  });

  const ui = {
    status: statusText,
    count: countText,
    close: () => wrap.remove(),
    disableCancel: () => (cancelBtn.disabled = true),
  };

  return ui;
};
