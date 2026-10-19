import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Better CardMarket",
  description:
    "Adds Auto Select and Auto list helpers to Cardmarket wants lists.",
  version: pkg.version,
  minimum_chrome_version: "120",
  permissions: ["storage"],
  action: {
    default_title: "Better CardMarket settings",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  content_scripts: [
    {
      js: ["src/content/index.ts"],
      // A wants list (/Wants/<id>) and its "Add cards" page.
      matches: ["https://www.cardmarket.com/en/Magic/Wants/*"],
    },
  ],
});
