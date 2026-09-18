// Entry build integration (DP-UI WU-UI-07 note): the chassis transport modules
// (`src/platform/transport/subscriber.ts`, `fallback.ts`) load the single
// EventEnvelope JSON schema with node:fs at runtime. Browsers have no fs, so
// for the CLIENT bundle only, this shim answers exactly that one read from a
// build-time copy of the same file — no second contract, no stub data.
// Server runtimes (vite-node `scripts/serve.ts`) keep real node:fs: the alias
// below is registered for `vite build` only (see vite.config.ts).
//
// Build note: this Vite version emits `?raw` imports AND rewrites the chassis
// `new URL("...schema.json", import.meta.url)` reference as data: URLs, so the
// shim decodes base64 data URLs synchronously (atob + TextDecoder exist in all
// target runtimes) instead of expecting a file path.
import schemaUrl from "../../contracts/event-envelope.schema.json?raw";

function decodeDataUrl(text: string): string {
  const m = /^data:[^,]*;base64,(.*)$/s.exec(text);
  if (m === null || m[1] === undefined) {
    throw new Error("browser fs shim: non-base64 data URL cannot be read synchronously");
  }
  const bin: string = atob(m[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i) ?? 0;
  }
  return new TextDecoder().decode(bytes);
}

export function readFileSync(path: unknown, encoding?: unknown): string {
  void encoding;
  const text: string = typeof path === "string" ? path : String((path as { href?: string }).href ?? path);
  if (text.startsWith("data:")) return decodeDataUrl(text);
  if (text.includes("event-envelope.schema.json")) return decodeDataUrl(schemaUrl);
  throw new Error(`browser fs shim: unsupported read of ${text.slice(0, 120)}`);
}
