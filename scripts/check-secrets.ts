import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export interface SecretScanOptions {
  rootDir?: string;
}

export interface SecretHit {
  file: string;
  line: number;
  kind: "key_pattern" | "env_not_ignored" | "fixture_auth";
}

export interface SecretScanResult {
  hits: SecretHit[];
  exit_code: number;
}

export interface MandatoryTermOptions {
  files?: string[];
  terms?: string[];
}

export interface MandatoryTermResult {
  terms: string[];
  files: string[];
  missing: Array<{ file: string; term: string }>;
  exit_code: number;
}

const KEY_PATTERN = /(api[_-]?key|secret|bearer\s+[A-Za-z0-9_\-.]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function listTrackedFiles(): string[] {
  try {
    const out: string = execSync("git ls-files", { encoding: "utf8" });
    return out.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

function deepWalk(value: unknown, onKey: (key: string) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) deepWalk(item, onKey);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      onKey(key);
      deepWalk((value as Record<string, unknown>)[key], onKey);
    }
  }
}

export async function runSecretScan(_opts?: SecretScanOptions): Promise<SecretScanResult> {
  const hits: SecretHit[] = [];
  const files: string[] = listTrackedFiles();
  for (const file of files) {
    if (file === "scripts/check-secrets.ts") continue;
    if (file === "config/env.example") continue;
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\0")) continue;
    const lines: string[] = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line: string = lines[i] as string;
      if (KEY_PATTERN.test(line)) {
        if (file === "config/env.example") continue;
        hits.push({ file, line: i + 1, kind: "key_pattern" });
      }
    }
  }
  try {
    const gitignore: string = readFileSync(".gitignore", "utf8");
    const lines: string[] = gitignore.split("\n").map((s) => s.trim());
    if (!lines.includes(".env")) {
      hits.push({ file: ".gitignore", line: 0, kind: "env_not_ignored" });
    }
  } catch {
    hits.push({ file: ".gitignore", line: 0, kind: "env_not_ignored" });
  }
  for (const file of files) {
    if (!file.startsWith("fixtures/") || !file.endsWith(".golden.json")) continue;
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      let bad = false;
      deepWalk(parsed, (key) => {
        if (key.toLowerCase() === "authorization" || key.toLowerCase().includes("api_key")) {
          bad = true;
        }
      });
      if (bad) {
        hits.push({ file, line: 0, kind: "fixture_auth" });
      }
    } catch {
      // ignore unparseable
    }
  }
  return { hits, exit_code: hits.length > 0 ? 1 : 0 };
}

export async function runMandatoryTermCheck(opts?: MandatoryTermOptions): Promise<MandatoryTermResult> {
  const files: string[] = opts?.files ?? ["design_documents/submission.md", "README.md"];
  const terms: string[] = opts?.terms ?? ["Token Factory", "Nemotron", "Serverless", "Tavily"];
  const missing: Array<{ file: string; term: string }> = [];
  for (const file of files) {
    let text = "";
    try {
      if (existsSync(file)) {
        text = readFileSync(file, "utf8");
      }
    } catch {
      text = "";
    }
    for (const term of terms) {
      if (!text.includes(term)) {
        missing.push({ file, term });
      }
    }
  }
  return { terms, files, missing, exit_code: missing.length > 0 ? 1 : 0 };
}

const argv: string[] = process.argv.slice(2);
const isMain: boolean = process.argv[1] !== undefined && process.argv[1].replace(/\\/g, "/").endsWith("scripts/check-secrets.ts");
if (isMain) {
  if (argv.includes("--mandatory-terms")) {
    runMandatoryTermCheck()
      .then((result) => {
        if (result.missing.length === 0) {
          console.log("mandatory-terms: 4/4 present in both files");
          process.exit(0);
        }
        for (const m of result.missing) {
          console.log(`${m.file}: MISSING ${m.term}`);
        }
        console.log(`mandatory-terms: FAILED ${result.missing.length} missing`);
        process.exit(1);
      })
      .catch((e: unknown) => {
        console.error(String(e));
        process.exit(1);
      });
  } else {
    runSecretScan()
      .then((result) => {
        for (const hit of result.hits) {
          console.log(`${hit.file}:${hit.line} ${hit.kind}`);
        }
        if (result.hits.length === 0) {
          console.log("secret-scan: 0 hits, .env ignored");
          process.exit(0);
        }
        console.log(`secret-scan: FAILED ${result.hits.length} hits`);
        process.exit(1);
      })
      .catch((e: unknown) => {
        console.error(String(e));
        process.exit(1);
      });
  }
}
