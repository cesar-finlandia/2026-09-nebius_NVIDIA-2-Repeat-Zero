import { reindex } from "../src/repeatzero/corpus/index.js";
import { writeSnapshot } from "../src/repeatzero/ledger/index.js";

const logPath: string = process.env["RESOLUTION_LOG_PATH"] ?? "artifacts/resolution-log.json";
const corpusPath: string =
  process.env["CORPUS_PATH"] ?? process.env["REPEATZERO_CORPUS_PATH"] ?? "engine/rag/runbooks";

let out: { docs_indexed: number; terms: number };
try {
  out = reindex(logPath, corpusPath);
} catch {
  console.error(JSON.stringify({ error: "unreadable_log", path: logPath }));
  process.exit(1);
}

writeSnapshot();
console.log(JSON.stringify({ docs_indexed: out.docs_indexed, terms: out.terms }));
process.exit(0);
