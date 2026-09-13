import { writeFileSync } from "node:fs";
import { MODELS } from "../src/repeatzero/config.js";
import { savings } from "../src/repeatzero/ledger/index.js";
import { buildReadme } from "../src/repeatzero/submit/readme.js";

const out = buildReadme({
  demoUrl: "https://demo.example.invalid",
  repoUrl: "https://github.com/example/repeatzero",
  models: { super: MODELS.super, nano: MODELS.nano },
  ledgerExample: savings(),
});
writeFileSync(out.path, out.content + "\n", "utf8");
console.log(`wrote ${out.path}`);
