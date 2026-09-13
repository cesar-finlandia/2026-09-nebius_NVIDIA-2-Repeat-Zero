import { withResilience } from "src/resilience";
import { existsSync, readdirSync } from "node:fs";

export type ArtifactCheckResult = {
  dir: string;
  files_present: string[];
  files_missing: string[];
  pass: boolean;
  summary: string;
};

const REQUIRED = ["click-script.json", "trace.json", "run.log"];

export async function checkDemodriveArtifact(dir: string): Promise<ArtifactCheckResult> {
  let files_present: string[] = [];
  let files_missing: string[] = [...REQUIRED];
  try {
    if (existsSync(dir)) {
      const names: string[] = readdirSync(dir);
      files_present = REQUIRED.filter((f) => names.includes(f));
      files_missing = REQUIRED.filter((f) => !names.includes(f));
    }
  } catch {
    files_present = [];
    files_missing = [...REQUIRED];
  }
  const pass: boolean = files_missing.length === 0;
  let summary: string = pass
    ? `demodrive: ${files_present.length} files present in ${dir} — OK`
    : `demodrive: missing ${files_missing.join(", ")} in ${dir} — FAIL`;
  const guarded = withResilience(
    async () => {
      const res: Response = await fetch("http://127.0.0.1:8787/healthz", {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        throw new Error(`healthz_${res.status}`);
      }
      return "ok";
    },
    { timeout_ms: 3000, retries: 0 },
  );
  try {
    await guarded();
  } catch {
    summary += "; health: unreachable (local, non-fatal)";
  }
  return { dir, files_present, files_missing, pass, summary };
}

const dir: string = process.argv[2] ?? "artifacts/demodrive";
const result = await checkDemodriveArtifact(dir);
console.log(result.summary);
process.exit(result.pass ? 0 : 1);
