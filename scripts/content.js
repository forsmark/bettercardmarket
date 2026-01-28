const excludedExpansions = [
  //Ugly
  "Universes Beyond",
  "Extras",
  "Retro",
  //Expensive
  "Secret Lair",
  "Promo",
  "Summer Magic",
  "Alpha",
  "Beta",
  "Unlimited",
  //Weird
  "Mystery Booster",
  "The List",
  "WCD",
  "Anniversary",
  "Pro Tour",
  "International",
  //White Borders
  "Revised",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Chronicles",
  "Anthologies",
  "Beatdown",
  "Battle Royale",
  "Collectors",
  //Foreign
  "Foreign White Border",
  "Foreign Black Border",
  "Japanese",
];

const backgroundPositionRegex =
  /background-position:\s*([-\d.]+px)\s+([-\d.]+px);/;

const LOG_PREFIX = "[BetterCardMarket AutoList]";

const getSelectedNode = (expansionId, expansionName, iconPosition) => {
  const node = document.createElement("a");
  node.href = "#";
  node.className = "selected-item";
  node.setAttribute("data-val", expansionId);

  const outerSpan1 = document.createElement("span");
  outerSpan1.setAttribute("title", expansionName);
  outerSpan1.setAttribute("data-bs-toggle", "tooltip");
  outerSpan1.setAttribute("data-bs-html", "true");
  outerSpan1.setAttribute("data-bs-placement", "bottom");
  outerSpan1.className =
    "expansion-symbol is-magic icon is-24x24 me-1 my-1 d-flex align-self-center";

  const innerSpan = document.createElement("span");
  const bgUrl =
    "//static.cardmarket.com/img/0792798cf32b76ebe2bb854ad670063f/expansionicons/expicons.png";
  const xpos = iconPosition?.x ?? "0px";
  const ypos = iconPosition?.y ?? "0px";
  innerSpan.style.cssText = `display:inline-block; width:21px; height:21px; background-image:url('${bgUrl}'); background-position:${xpos} ${ypos};`;
  outerSpan1.appendChild(innerSpan);

  const outerSpan2 = document.createElement("span");
  outerSpan2.className = "fullExpansionName-span";
  outerSpan2.textContent = expansionName;

  node.appendChild(outerSpan1);
  node.appendChild(outerSpan2);

  return node;
};

const autoButton = document.createElement("button");
autoButton.type = "button";
autoButton.textContent = "Auto Select";
autoButton.className = "btn btn-outline-light btn-sm ms-2";

autoButton.addEventListener("mouseenter", () => {
  autoButton.classList.add("opacity-90");
});
autoButton.addEventListener("mouseleave", () => {
  autoButton.classList.remove("opacity-90");
});

const autoSelectExpansions = (evt) => {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  const comboBox = document.getElementById("WantsExpansion");
  if (!comboBox) return;

  const optionsUl = comboBox.querySelector(".option-list");
  if (!optionsUl) return;

  const select = comboBox.querySelector("select");
  if (!select) return;

  // Where chips should go (stable): before the temp input
  const tempInput = comboBox.querySelector('input[name="idProductTempInput"]');
  if (!tempInput) return;

  const goodExpansions = new Map(); // id -> name
  const iconPositions = new Map(); // id -> {x,y}

  // Build allowlist from the visible LI elements
  let counter = 0;
  Array.from(optionsUl.children).forEach((li) => {
    if (counter >= 20) return;

    const expansionName =
      li.querySelector(".fullExpansionName-span")?.textContent?.trim() ??
      li.textContent.trim();

    const expansionId = li.getAttribute("data-option-value");
    if (!expansionId) return;

    const excluded = excludedExpansions.some((bad) =>
      expansionName.includes(bad),
    );
    if (excluded) return;

    counter++;
    goodExpansions.set(expansionId, expansionName);

    const optionData = li.getAttribute("data-option-text") || "";
    const match = optionData.match(backgroundPositionRegex);
    if (match) {
      iconPositions.set(expansionId, { x: match[1], y: match[2] });
    } else {
      iconPositions.set(expansionId, { x: "0px", y: "0px" });
    }

    li.classList.add("selected");
  });

  // Remove chips we previously inserted for ids we're about to re-add,
  // so repeated clicks don't duplicate chips.
  Array.from(comboBox.querySelectorAll("a.selected-item[data-val]")).forEach(
    (chip) => {
      const id = chip.getAttribute("data-val");
      if (id && goodExpansions.has(id)) chip.remove();
    },
  );

  // Update <option selected> AND insert chips
  Array.from(select.options).forEach((opt) => {
    const expansionId = opt.value;
    if (!goodExpansions.has(expansionId)) return;

    // mark selected
    opt.selected = true;

    // insert chip with correct structure (NO button)
    const chip = getSelectedNode(
      expansionId,
      goodExpansions.get(expansionId),
      iconPositions.get(expansionId),
    );

    // Insert where chips belong: before temp input
    tempInput.before(chip);

    // Make chip removable when clicking on the right edge (where the CSS X is)
    chip.addEventListener("click", (ev) => {
      ev.preventDefault();

      const rect = chip.getBoundingClientRect();
      const clickIsOnX = rect.right - ev.clientX < 26; // tweak if needed
      if (!clickIsOnX) return;

      ev.stopPropagation();

      // unselect option
      opt.selected = false;

      // unhighlight corresponding LI
      const li = optionsUl.querySelector(
        `li[data-option-value="${expansionId}"]`,
      );
      if (li) li.classList.remove("selected");

      // remove chip
      chip.remove();

      // notify any listeners
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  // notify site code once after bulk changes
  select.dispatchEvent(new Event("change", { bubbles: true }));
};

autoButton.addEventListener("click", autoSelectExpansions);

// Attach Auto button to the Expansion label
document.querySelectorAll("label").forEach((node) => {
  if (node.getAttribute("for") === "WantsExpansion") {
    node.appendChild(autoButton);
  }
});

// =========================
// Auto list (paste decklist)
// =========================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitFor = async (fn, { timeoutMs = 10000, intervalMs = 100 } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const val = fn();
      if (val) return val;
    } catch (_) {}
    await sleep(intervalMs);
  }
  return null;
};

let AUTO_LIST_CANCELLED = false;

const parseDecklist = (text) => {
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

  console.log(LOG_PREFIX, "Parsed decklist entries", entries);
  return entries;
};

const findCardSearchInput = () => {
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

const triggerSearch = async (input, text) => {
  console.log(LOG_PREFIX, "triggerSearch()", { text });

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

const clickTopSearchResult = async (expectedName) => {
  const expected = (expectedName || "").toLowerCase().trim();
  console.log(LOG_PREFIX, "clickTopSearchResult() called", { expected });

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
      console.log(LOG_PREFIX, "Autocomplete suggestions in container", texts);

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

const setProgressUI = (ui, { index, total, text }) => {
  if (!ui) return;
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  if (ui.status) ui.status.textContent = text || "";
  if (ui.count) ui.count.textContent = `${Math.min(index + 1, total)}/${total}`;
  if (ui.bar) ui.bar.style.width = `${pct}%`;
  if (ui.bar) ui.bar.setAttribute("aria-valuenow", String(pct));
};

const processDeckEntries = async (entries, ui) => {
  const form = document.getElementById("AddCardForm");
  if (!form) return;

  const searchInput = findCardSearchInput();
  const qtyInput = document.getElementById("WantsQuantity");
  const addButton = form.querySelector('button[type="submit"]');
  const metacardInput = document.getElementById("IdMetacardInput");

  if (!searchInput || !qtyInput || !addButton || !metacardInput) {
    console.warn(LOG_PREFIX, "Required inputs not found", {
      searchInput,
      qtyInput,
      addButton,
      metacardInput,
    });
    return;
  }

  console.log(LOG_PREFIX, "Starting processDeckEntries", { entries });

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
      await sleep(500);
      continue;
    }

    // Wait until hidden metacard id changes (selection confirmed)
    const changed = await waitFor(
      () => metacardInput.value && metacardInput.value !== beforeId,
      { timeoutMs: 10000, intervalMs: 100 },
    );

    console.log(LOG_PREFIX, "Metacard change", {
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
      await sleep(500);
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
    await sleep(150);

    // 5) press Add Card
    setProgressUI(ui, {
      index: idx,
      total: entries.length,
      text: `Adding: ${entry.qty} ${entry.name}`,
    });

    addButton.click();
    await sleep(750);
  }

  setProgressUI(ui, {
    index: entries.length - 1,
    total: entries.length,
    text: "Done!",
  });

  console.log(LOG_PREFIX, "Completed all entries");
};

const openAutoListModal = () => {
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
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  startBtn.addEventListener("click", async () => {
    const entries = parseDecklist(textarea.value);
    if (!entries.length) return;

    console.log(LOG_PREFIX, "Start clicked — closing modal and starting run", {
      count: entries.length,
    });

    // CLOSE MODAL so it doesn't block the page
    close();

    // Show non-blocking progress + cancel
    const ui = createProgressToast(entries.length);

    try {
      await processDeckEntries(entries, ui);
      ui.disableCancel();
      await sleep(1200);
    } finally {
      ui.close();
    }
  });

  textarea.focus();
};

const attachAutoListButton = () => {
  const searchInput = findCardSearchInput();
  if (!searchInput) return false;

  const existing = document.querySelector('[data-mt-auto-list-button="1"]');
  if (existing) return true;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Auto list";
  btn.className = "btn btn-success btn-sm";
  btn.setAttribute("data-mt-auto-list-button", "1");

  btn.addEventListener("click", (e) => {
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
  let flexRow = wrapper.querySelector('[data-mt-search-row="1"]');
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

// Attach now, and also if the page replaces the form via ajax
attachAutoListButton();

const obs = new MutationObserver(() => {
  attachAutoListButton();
});
obs.observe(document.documentElement, { subtree: true, childList: true });

const createProgressToast = (total) => {
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

const clearExpansionSelectionUI = () => {
  const comboBox = document.getElementById("WantsExpansion");
  if (!comboBox) return;

  const select = comboBox.querySelector("select");
  const optionsUl = comboBox.querySelector(".option-list");
  const tempInput = comboBox.querySelector('input[name="idProductTempInput"]');

  // Unselect all <option>
  if (select) {
    Array.from(select.options).forEach((opt) => {
      opt.selected = false;
    });
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Remove UI chips (both yours and Cardmarket’s) except the template
  if (tempInput) {
    Array.from(comboBox.querySelectorAll("a.selected-item[data-val]")).forEach(
      (chip) => chip.remove(),
    );
  }

  // Clear selected class on list items
  if (optionsUl) {
    Array.from(optionsUl.children).forEach((li) =>
      li.classList.remove("selected"),
    );
  }
};

const waitForExpansionOptionsReady = async ({
  minCount = 10,
  stableMs = 350,
  timeoutMs = 10000,
} = {}) => {
  const comboBox = document.getElementById("WantsExpansion");
  if (!comboBox) return false;

  const optionsUl = comboBox.querySelector(".option-list");
  const select = comboBox.querySelector("select");
  if (!optionsUl || !select) return false;

  const start = Date.now();
  let lastCount = -1;
  let stableSince = 0;

  while (Date.now() - start < timeoutMs) {
    const liCount = optionsUl.children.length;
    const optCount = select.options.length;

    // We consider it "ready" once it has some volume AND stops changing briefly
    const countNow = Math.max(liCount, optCount);

    if (countNow >= minCount) {
      if (countNow === lastCount) {
        if (!stableSince) stableSince = Date.now();
        if (Date.now() - stableSince >= stableMs) {
          console.log(LOG_PREFIX, "Expansion options ready", {
            liCount,
            optCount,
          });
          return true;
        }
      } else {
        stableSince = 0;
      }
    }

    lastCount = countNow;
    await sleep(100);
  }

  console.warn(
    LOG_PREFIX,
    "Timed out waiting for expansion options to be ready",
  );
  return false;
};
