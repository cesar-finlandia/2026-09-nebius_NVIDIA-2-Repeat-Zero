import React from "react";
import { createRoot } from "react-dom/client";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
// @ts-expect-error CSS side-effect import handled by Vite build
import "./repeatzero.css";
import { applyTheme, initialTheme } from "./theme.js";
import { setTheme } from "src/platform/ui";
import { App } from "./App.js";

// Browser integration for the chassis RES-04 lazy loader
// (`src/resilience/validate.ts` via `node-compat.ts`): in Node it require()s
// ajv through `globalThis.process.getBuiltinModule("node:module")`, which does
// not exist in browsers, so envelope validation would throw per envelope and
// the live stream could never populate. Provide that exact seam from the
// already-bundled ESM copies of the same pinned modules — the schema,
// the constructor and the formats are identical to what Node would load.
// `versions` stays empty (isNodeRuntime() remains false) and `env` carries
// production so library env checks behave as in any production bundle.
const runtime = globalThis as Record<string, unknown>;
if (typeof runtime["process"] === "undefined") {
  runtime["process"] = {
    versions: {},
    env: { NODE_ENV: "production" },
    getBuiltinModule: (id: string): unknown => {
      if (id !== "node:module") return null;
      return {
        createRequire: () =>
          (moduleId: string): unknown => {
            if (moduleId === "ajv/dist/2020") return Ajv2020;
            if (moduleId === "ajv-formats") return addFormats;
            throw new Error(`browser require seam: unsupported module ${moduleId}`);
          },
      };
    },
  };
}

applyTheme(initialTheme());
setTheme("operator");

const rootEl: HTMLElement | null = document.getElementById("root");
if (rootEl !== null) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App initialView="queue" apiBaseUrl="" />
    </React.StrictMode>,
  );
}
