# Better CardMarket (Chrome Extension)

Small helper extension for Cardmarket wants lists. It adds:
- Auto Select: quickly select a filtered set of expansions.
- Auto list: paste a decklist and auto-add cards.

## Development

Prereqs:
- Node.js 18+ (or a recent LTS)

Install deps:

```bash
npm install
```

Lint / typecheck:

```bash
npm run lint
npm run typecheck
```

Build:

```bash
npm run build
```

## Load the extension in Chrome

1) Build the bundle:

```bash
npm run build
```

2) Open `chrome://extensions` and enable **Developer mode**.
3) Click **Load unpacked** and select the project folder (the one with `manifest.json`).
4) After changes, click **Reload** on the extension and hard-refresh the Cardmarket page.

## Notes

- The bundled content script is emitted to `dist/content.js`.
- `dist/` and `node_modules/` are ignored by git.
