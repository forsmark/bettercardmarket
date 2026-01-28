import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "chrome100",
    rollupOptions: {
      input: path.resolve(__dirname, "scripts/content.ts"),
      output: {
        format: "iife",
        entryFileNames: "content.js",
        inlineDynamicImports: true,
      },
    },
  },
});
