import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

try {
  execSync("npx vite-node src/provenance/provo/cli.ts generate --manifest assembly.manifest.json --out docs/disclosure.md", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  console.log("wrote docs/disclosure.md docs/architecture-summary.md");
} catch {
  writeFileSync("docs/disclosure.md", "disclosure pending\n", "utf8");
  process.exit(1);
}
