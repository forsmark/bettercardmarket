import {
  backgroundPositionRegex,
  excludedExpansions,
  LOG_PREFIX,
} from "./constants.js";
import { debugLog, sleep } from "./utils.js";

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

export const autoSelectExpansions = (evt) => {
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

export const attachAutoSelectButton = () => {
  const label = Array.from(document.querySelectorAll("label")).find(
    (node) => node.getAttribute("for") === "WantsExpansion",
  );
  if (!label) return false;

  const existing = label.querySelector('[data-mt-auto-select="1"]');
  if (existing) return true;

  const autoButton = document.createElement("button");
  autoButton.type = "button";
  autoButton.textContent = "Auto Select";
  autoButton.className = "btn btn-outline-light btn-sm ms-2";
  autoButton.setAttribute("data-mt-auto-select", "1");

  autoButton.addEventListener("mouseenter", () => {
    autoButton.classList.add("opacity-90");
  });
  autoButton.addEventListener("mouseleave", () => {
    autoButton.classList.remove("opacity-90");
  });

  autoButton.addEventListener("click", autoSelectExpansions);
  label.appendChild(autoButton);

  return true;
};

export const clearExpansionSelectionUI = () => {
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

export const waitForExpansionOptionsReady = async ({
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
          debugLog("Expansion options ready", {
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
