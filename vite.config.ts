import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: "chrome120",
    sourcemap: true,
    rollupOptions: {
      // The manifest does not list this page. The background worker opens it.
      input: { offscreen: "src/offscreen/index.html" },
    },
  },
  server: {
    // CRXJS serves extension pages and content scripts from this port in dev.
    port: 5173,
    strictPort: true,
    cors: { origin: [/chrome-extension:\/\//] },
  },
});
