# Better CardMarket

Chrome extension for Cardmarket wants lists. On the "Add cards" page of a wants
list it adds:

- **Auto Select**: selects the expansions of the chosen card that pass your
  rules, up to a set limit.
- **Auto list**: paste a decklist, and the extension adds each card to the
  wants list. It can run Auto Select for each card. The arrow next to the
  button reads the list from the clipboard or from the pocket instead.

On a wants list page it adds:

- **Estimated prices**: a price for each want and a total for the list. See
  [Estimated prices](#estimated-prices).
- **Selection total**: check wants to see the total of just those wants.
- **Add to pocket**: collect the checked wants in the pocket. See
  [Pocket](#pocket).

The settings page controls which expansions Auto Select skips. Open it from
the extension's toolbar button, from "Settings" in the Auto list dialog, or
from `chrome://extensions`.

## Auto Select rules

Auto Select checks each expansion name against three kinds of rules:

1. **Groups**: named sets of patterns, such as Secret Lair, Promos, or
   borderless and showcase printings. Turn each group on or off. The
   Universes Beyond group also lists single franchises, such as The Lord of
   the Rings or FINAL FANTASY. Click a franchise to allow it while the group
   stays on.
2. **Also skip**: your own patterns.
3. **Always include**: patterns that win over every exclusion.

A pattern matches when the expansion name contains it. Case does not matter.
The settings page shows a preview of the rules against the expansion list of
the last card that you used Auto Select on.

## Estimated prices

Each want gets the price of its cheapest allowed printing, times the quantity.
A want with "Any" expansion allows every printing. The foil setting of the
want picks the foil or non-foil price.

- The prices are Cardmarket prices in euros from
  [Scryfall](https://scryfall.com/docs/api), which updates them once a day.
  Hover over a price to see the printing that it uses.
- Cardmarket's list page does not show which printings a want allows, so the
  extension reads each want's Edit page once. It reads the page again only
  after you edit the want.
- The extension caches prices for a day and want details for a week. Clear
  the cache in the settings under General.
- Condition, language and the Signed and Altered settings do not change the
  estimate.

## Pocket

The pocket collects cards from several wants lists, so that you can add them
to another list in one step.

1. On a wants list, check the wants and click **Add to pocket**. Repeat on
   other lists. Cards with the same name add up. The same want is not added
   twice.
2. Click the extension icon in the toolbar to see the pocket, its estimated
   total and a **Copy list** button. Remove single cards or clear the pocket
   there.
3. On the Add cards page of the target list, choose **Auto list › From
   pocket**. Check the list and click Start. Cards that Auto list adds leave
   the pocket. Skipped cards stay.

The pocket stays on this computer. It does not sync to other browsers.

## Development

Requirements: Node.js 22.13 or later (see `.nvmrc`) and pnpm. Run
`corepack enable` to get the pnpm version that `package.json` pins.

```bash
pnpm install
pnpm dev      # dev build with hot reload, written to dist/
pnpm build    # production build in dist/
pnpm check    # type check, lint, format check and unit tests
```

### Load the extension in Chrome

1. Run `pnpm build` or `pnpm dev`.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. After a production build, click **Reload** on the extension card and
   reload the Cardmarket tab.

### Project layout

```text
manifest.config.ts       Extension manifest (MV3), built by @crxjs/vite-plugin
src/background/          Service worker: Scryfall requests, opens settings
src/content/             Content script on Cardmarket wants pages
  cardmarket/page.ts     All Cardmarket element ids and selectors
  auto-select/           Auto Select button and expansion picker code
  auto-list/             Decklist parser, dialog, progress toast and runner
  wants-list/            Price column, selection and pocket button
src/options/             Settings page (React)
src/popup/               Toolbar popup with the pocket (React)
src/ui/                  Theme and fonts of the settings page and popup
src/shared/              Settings storage, expansion groups and rules
```

Cardmarket can change its page markup at any time. If a feature stops
working, start with `src/content/cardmarket/page.ts`, and turn on **Debug
logging** in the settings to see each step in the page console.
