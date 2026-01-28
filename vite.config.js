import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "chrome100",
    rollupOptions: {
      input: path.resolve(__dirname, "scripts/content.js"),
      output: {
        format: "iife",
        entryFileNames: "content.js",
        inlineDynamicImports: true,
      },
    },
  },
});
