// keep your excluded list as-is
const excludedExpansions = [
  //Ugly shit
  "Universes Beyond",
  "Extras",
  "Retro",
  //Expensive shit
  "Secret Lair",
  "Promo",
  "Summer Magic",
  "Alpha",
  "Beta",
  "Unlimited",
  //Weird shit
  "Mystery Booster",
  "The List",
  "WCD",
  "Anniversary",
  "Pro Tour",
  "International",
  //White borders
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
  //Foreign shit
  "Foreign Black Border",
  "Japanese",
];

const backgroundPositionRegex =
  /background-position:\s*([-\d.]+px)\s+([-\d.]+px);/;

// helper: create the "chip" shown in the UI (matching cardmarket markup)
const getSelectedNode = (expansionId, expansionName, iconPosition) => {
  const node = document.createElement("a");
  node.href = "#";
  node.className = "selected-item";
  node.setAttribute("data-val", expansionId);

  // icon wrapper
  const outerSpan1 = document.createElement("span");
  outerSpan1.setAttribute("title", expansionName);
  outerSpan1.setAttribute("data-bs-toggle", "tooltip");
  outerSpan1.setAttribute("data-bs-html", "true");
  outerSpan1.setAttribute("data-bs-placement", "bottom");
  outerSpan1.className =
    "expansion-symbol is-magic icon is-24x24 me-1 my-1 d-flex align-self-center";

  const innerSpan = document.createElement("span");
  // set the style properly (not as className)
  const bgUrl =
    "//static.cardmarket.com/img/0792798cf32b76ebe2bb854ad670063f/expansionicons/expicons.png";
  const xpos = iconPosition && iconPosition.x ? iconPosition.x : "0px";
  const ypos = iconPosition && iconPosition.y ? iconPosition.y : "0px";
  innerSpan.style.cssText = `display:inline-block; width:21px; height:21px; background-image: url('${bgUrl}'); background-position: ${xpos} ${ypos};`;
  outerSpan1.appendChild(innerSpan);

  // name span
  const outerSpan2 = document.createElement("span");
  outerSpan2.className = "fullExpansionName-span";
  outerSpan2.textContent = expansionName;

  // remove button (small 'x')
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-selected";
  // style to match thin UI; you can tweak
  removeBtn.style.cssText =
    "border:0;background:transparent;padding:0 6px;cursor:pointer;font-size:14px;line-height:1;";
  removeBtn.textContent = "×";

  node.appendChild(outerSpan1);
  node.appendChild(outerSpan2);
  node.appendChild(removeBtn);

  return { node, removeBtn };
};

// find the expansion label and append Auto button
const button = document.createElement("button");
button.textContent = "Auto";
button.style.cssText =
  "color:white;border:1px solid white;border-radius:2px;padding:2px;width:40px;margin-left:5px;";
button.addEventListener("click", (evt) => {
  evt.preventDefault();
  evt.stopPropagation();

  // find the UL with the expansion list
  const optionsList = document.getElementsByClassName("option-list")[0];
  if (!optionsList) return;

  const goodExpansions = new Map();
  const expansionIconPosition = new Map();

  let counter = 0;
  // iterate li elements (safe)
  Array.from(optionsList.children).forEach((li) => {
    if (counter >= 20) return;

    // expansion name is in li.childNodes[1] per your markup; be defensive
    const expansionNameNode = li.querySelector(".fullExpansionName-span");
    const expansionName = expansionNameNode
      ? expansionNameNode.textContent.trim()
      : li.textContent.trim();

    const expansionId = li.getAttribute("data-option-value");
    if (!expansionId) return;

    // exclude based on your list
    if (
      !excludedExpansions.some((badExpansion) =>
        expansionName.includes(badExpansion)
      )
    ) {
      counter++;
      goodExpansions.set(expansionId, expansionName);

      const optionData = li.getAttribute("data-option-text") || "";
      const match = optionData.match(backgroundPositionRegex);
      if (match) {
        const xValue = match[1];
        const yValue = match[2];
        expansionIconPosition.set(expansionId, { x: xValue, y: yValue });
      } else {
        // fallback
        expansionIconPosition.set(expansionId, { x: "0px", y: "0px" });
      }

      // mark the li as selected (so ui highlights it)
      li.classList.add("selected");
    }
  });

  // find the underlying select element
  const comboBox = document.getElementById("WantsExpansion");
  if (!comboBox) return;
  const select = comboBox.querySelector("select");
  if (!select) return;

  // where to insert chips - insert before the temporary input (matches site)
  const tempInput = comboBox.querySelector('input[name="idProductTempInput"]');
  if (!tempInput) return;

  // add selected attribute on the <option> and create chip
  Array.from(select.options).forEach((opt) => {
    const expansionId = opt.value;
    if (goodExpansions.has(expansionId)) {
      opt.selected = true;

      // create chip node
      const { node: selectedNode, removeBtn } = getSelectedNode(
        expansionId,
        goodExpansions.get(expansionId),
        expansionIconPosition.get(expansionId)
      );

      // insert before the temp input
      tempInput.before(selectedNode);

      // make sure the corresponding <li> in option-list has 'selected' class
      const liMatch = optionsList.querySelector(
        `li[data-option-value="${expansionId}"]`
      );
      if (liMatch) liMatch.classList.add("selected");

      // remove handler: unselect option, remove 'selected' from li, remove chip, dispatch change
      removeBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        // unselect the option
        opt.selected = false;

        // remove 'selected' class on li if present
        if (liMatch) liMatch.classList.remove("selected");

        // remove the chip node
        selectedNode.remove();

        // notify site of change
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
  });

  // fire change to notify site code once after bulk changes
  select.dispatchEvent(new Event("change", { bubbles: true }));
});

// attach button to correct label
const expansionLabels = document.querySelectorAll("label");
expansionLabels.forEach((node) => {
  if (node.getAttribute("for") === "WantsExpansion") {
    node.appendChild(button);
  }
});