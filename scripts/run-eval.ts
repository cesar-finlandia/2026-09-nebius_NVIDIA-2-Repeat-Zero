import { readFileSync } from "node:fs";
import { retrieve } from "../src/repeatzero/corpus/index.js";
import { classifyTicket } from "../src/repeatzero/classify/index.js";
import type { Ticket } from "../src/repeatzero/types.js";

interface EvalEntry {
  ticket_id: string;
  expected_label: "repeat" | "novel";
  high_risk: boolean;
}

interface EvalConfig {
  version: "1.0.0";
  fixture_path: string;
  pass_threshold_correct: number;
  pass_threshold_total: number;
  high_risk_ids: string[];
  entries: EvalEntry[];
}

function configPath(): string {
  const args: string[] = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] as string) === "--config" && i + 1 < args.length) {
      return args[i + 1] as string;
    }
  }
  return "config/eval.repeatzero.json";
}

const config: EvalConfig = JSON.parse(readFileSync(configPath(), "utf8")) as EvalConfig;
const fixtureRaw: string = readFileSync(config.fixture_path, "utf8");
const fixtureParsed: unknown = JSON.parse(fixtureRaw);
const tickets: Ticket[] = Array.isArray(fixtureParsed) ? (fixtureParsed as Ticket[]) : [];
const byId = new Map<string, Ticket>();
for (const t of tickets) {
  byId.set(t.id, t);
}

if (tickets.length !== 20 || config.entries.length !== 20) {
  console.log("eval: FAILED join-mismatch");
  process.exit(1);
}

let correct = 0;
let highRiskFalseRepeat = 0;
let exceptions = 0;

for (const entry of config.entries) {
  const ticket: Ticket | undefined = byId.get(entry.ticket_id);
  if (ticket === undefined) {
    console.log("eval: FAILED join-mismatch");
    process.exit(1);
  }
  try {
    const candidates = retrieve(ticket, 3);
    const cls = await classifyTicket(ticket, candidates);
    if (cls.label === entry.expected_label) {
      correct++;
    }
    if (entry.high_risk === true && entry.expected_label === "novel" && cls.label === "repeat") {
      highRiskFalseRepeat++;
    }
  } catch {
    exceptions++;
  }
}

const passed: boolean = correct >= config.pass_threshold_correct && highRiskFalseRepeat === 0;
console.log(`eval: ${correct}/20 correct, high-risk false-repeat ${highRiskFalseRepeat}, ${passed ? "PASS" : "FAIL"}`);
void exceptions;
process.exit(passed ? 0 : 1);
