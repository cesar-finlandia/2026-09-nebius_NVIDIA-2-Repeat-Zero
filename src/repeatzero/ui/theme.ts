import type { EventEnvelope } from "src/platform/transport";
import type { TriageResult } from "../types.js";

export type ThemeId = "light" | "dark";

export const THEME_STORAGE_KEY = "rz-theme";

function prefersDark(): boolean {
  try {
    const mm = (globalThis as { matchMedia?: (q: string) => { matches: boolean } }).matchMedia;
    if (typeof mm !== "function") return false;
    return mm.call(globalThis, "(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function storedTheme(): ThemeId | null {
  try {
    const raw: string | null = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
    if (raw === "light" || raw === "dark") return raw;
    return null;
  } catch {
    return null;
  }
}

export function initialTheme(): ThemeId {
  const stored: ThemeId | null = storedTheme();
  if (stored !== null) return stored;
  return prefersDark() ? "dark" : "light";
}

export function applyTheme(id: ThemeId): void {
  try {
    (globalThis as { document?: { documentElement?: { dataset?: Record<string, string> } } }).document?.documentElement?.dataset !== undefined &&
      (((globalThis as { document: { documentElement: { dataset: Record<string, string> } } }).document.documentElement.dataset["theme"] = id));
  } catch {
    // ignore
  }
  try {
    (globalThis as { localStorage?: { setItem(k: string, v: string): void } }).localStorage?.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export type { EventEnvelope, TriageResult };
