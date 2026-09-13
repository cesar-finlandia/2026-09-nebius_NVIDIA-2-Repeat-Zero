import { readFileSync, writeFileSync } from "node:fs";

const args: string[] = process.argv.slice(2);
const filesFlag: string | undefined = args.find((a) => a.startsWith("--files="));
const onlyFiles: string[] | null = filesFlag ? filesFlag.slice("--files=".length).split(",").map((s) => s.trim()).filter((s) => s.length > 0) : null;

const FORBIDDEN_SOURCE_PATH = "design_documents/prompts/PROMPT-DP-VERIFY.md";

export interface ForbiddenCheckOptions {
  rootDir?: string;
  allowList?: string[];
}

export interface ForbiddenCheckHit {
  file: string;
  line: number;
  matched_bytes: number;
}

export interface ForbiddenCheckResult {
  hits: ForbiddenCheckHit[];
  files_scanned: number;
  exit_code: number;
}

export function loadForbiddenTokens(): string[] {
  const text: string = readFileSync(FORBIDDEN_SOURCE_PATH, "utf8");
  const lines: string[] = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] as string).includes("FORBIDDEN NAMES")) {
      start = i;
      break;
    }
  }
  if (start === -1) return [];
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line: string = lines[i] as string;
    if (line.startsWith("### ") || line.startsWith("## ")) break;
    const re = /`([^`]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const token: string = m[1] as string;
      if (token.trim() !== "") collected.push(token);
    }
  }
  return collected;
}

async function listFiles(): Promise<string[]> {
  if (onlyFiles !== null) return onlyFiles;
  const { execSync } = await import("node:child_process");
  try {
    const out: string = execSync("git ls-files", { encoding: "utf8" });
    return out.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

export async function runForbiddenNameCheck(opts?: ForbiddenCheckOptions): Promise<ForbiddenCheckResult> {
  const allowList: string[] = opts?.allowList ?? [FORBIDDEN_SOURCE_PATH, "scripts/check-forbidden-names.ts"];
  const tokens: string[] = loadForbiddenTokens();
  const files: string[] = await listFiles();
  const hits: ForbiddenCheckHit[] = [];
  for (const file of files) {
    if (allowList.includes(file)) continue;
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      hits.push({ file, line: 0, matched_bytes: 0 });
      continue;
    }
    if (text.includes("\0")) continue;
    const lines: string[] = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line: string = lines[i] as string;
      for (const token of tokens) {
        if (token !== "" && line.includes(token)) {
          hits.push({ file, line: i + 1, matched_bytes: token.length });
          break;
        }
      }
    }
  }
  return { hits, files_scanned: files.length, exit_code: hits.length > 0 ? 1 : 0 };
}

const isMain: boolean = process.argv[1] !== undefined && process.argv[1].replace(/\\/g, "/").endsWith("scripts/check-forbidden-names.ts");
if (isMain) {
  runForbiddenNameCheck()
    .then((result) => {
      for (const hit of result.hits) {
        console.log(`${hit.file}:${hit.line}`);
      }
      console.log(`forbidden-names: ${result.hits.length} hits`);
      process.exit(result.exit_code);
    })
    .catch((e: unknown) => {
      console.error(String(e));
      process.exit(1);
    });
}

void writeFileSync;
