import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDegradedResult } from "../src/repeatzero/submit/verify.js";
import { checkSubmitHealth } from "../src/repeatzero/submit/verify.js";

const args: string[] = process.argv.slice(2);
const offline: boolean = args.includes("--offline");

function run(cmd: string): { ok: boolean; out: string } {
  try {
    const out: string = execSync(cmd, { encoding: "utf8" });
    return { ok: true, out };
  } catch (err: unknown) {
    const e = err as { stdout?: string; message?: string };
    return { ok: false, out: String(e.stdout ?? e.message ?? err) };
  }
}

const lic: string = readFileSync("LICENSE", "utf8").split("\n")[0] ?? "";
if (!lic.includes("Apache License")) {
  console.error("LICENSE missing Apache License header");
  process.exit(1);
}

const hygiene = run("npx vite-node src/provenance/submit/cli.ts hygiene --manifest assembly.manifest.json");
if (!hygiene.ok && !hygiene.out.includes("secret scan clean")) {
  console.error(hygiene.out);
  process.exit(1);
}

const fn = run(
  "npx vite-node scripts/check-forbidden-names.ts --files LICENSE,README.md,design_documents/submission.md,docs/disclosure.md,docs/architecture-summary.md",
);
if (!fn.ok) {
  console.error(fn.out);
  process.exit(1);
}

if (offline) {
  console.log("submit-health: degraded (offline, no demo URL)");
  process.exit(0);
}

const demoUrl: string = (process.env["DEMO_URL"] ?? "").replace(/\/+$/, "");
if (demoUrl === "") {
  console.error("DEMO_URL unset");
  process.exit(1);
}
const result = await checkSubmitHealth({ demoUrl, timeoutMs: 8000 })();
if (isDegradedResult(result)) {
  console.error(`submit-health: degraded (${result.reason})`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: result.ok, models: result.models }));
process.exit(0);
