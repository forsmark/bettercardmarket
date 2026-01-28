import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    target: "chrome100",
    rollupOptions: {
      input: path.resolve(__dirname, "options.html"),
    },
  },
});
