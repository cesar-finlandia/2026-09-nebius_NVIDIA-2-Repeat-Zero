// Requirement IDs: UI-03, UI-AC-02 | DP-B §6.3, §10.8 item 1
// Vite config for the minimal UI dev shell (`npm run dev`). Vitest keeps using
// vitest.config.ts (which takes priority when both exist); aliases here mirror
// it so components resolve identically in dev/build.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command }) => ({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
  },
  resolve: {
    alias: {
      src: `${root}src`,
      examples: `${root}examples`,
      // Client bundle only: answer the chassis transport's single schema-file
      // read without node:fs (see src/platform-shims/browser-fs.ts). Scoped to
      // `vite build` so vite-node server runtimes keep the real node:fs.
      ...(command === "build" ? { "node:fs": `${root}src/platform-shims/browser-fs.ts` } : {}),
    },
  },
}));
