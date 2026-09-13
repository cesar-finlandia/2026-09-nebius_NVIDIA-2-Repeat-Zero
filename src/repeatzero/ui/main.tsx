import React from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error CSS side-effect import handled by Vite build
import "./repeatzero.css";
import { applyTheme, initialTheme } from "./theme.js";
import { setTheme } from "src/platform/ui";
import { App } from "./App.js";

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
