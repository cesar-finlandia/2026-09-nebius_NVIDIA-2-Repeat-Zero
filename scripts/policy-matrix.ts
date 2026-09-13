import { decide } from "../src/repeatzero/policy/index.js";
import { TAXONOMY } from "../src/repeatzero/taxonomy.js";
import type { Citation, ResolutionDraft, TicketClassification } from "../src/repeatzero/types.js";

function lowId(): string {
  for (const row of TAXONOMY) {
    if (row.risk === "low") return row.id;
  }
  return "password-reset";
}

function medId(): string {
  for (const row of TAXONOMY) {
    if (row.risk === "medium") return row.id;
  }
  return "sso-app-access";
}

function highId(): string {
  for (const row of TAXONOMY) {
    if (row.risk === "high") return row.id;
  }
  return "security-incident";
}

function cls(conf: number, label: "repeat" | "novel", tax: string | null, degraded: boolean): TicketClassification {
  return { label, taxonomy: tax as TicketClassification["taxonomy"], confidence: conf, rationale: "matrix", degraded };
}

function draft(valid: boolean, degraded: boolean): ResolutionDraft {
  return { kind: "resolution", body: "body [1]", citations: [], suggested_first_action: "act", valid, degraded };
}

function cits(n: number): Citation[] {
  const out: Citation[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ url: `https://example.com/${i}`, title: `t${i}`, snippet: "s", source: "tavily", retrieved_at: "2026-09-01T00:00:00.000Z" });
  }
  return out;
}

const LOW: string = lowId();
const MED: string = medId();
const HIGH: string = highId();

const cases: Array<{ c: TicketClassification; d: ResolutionDraft; n: Citation[]; action: string; reason: string }> = [
  { c: cls(0.99, "repeat", LOW, true), d: draft(true, false), n: cits(2), action: "escalate", reason: "degraded_input" },
  { c: cls(0.99, "repeat", LOW, false), d: draft(true, true), n: cits(2), action: "escalate", reason: "degraded_input" },
  { c: cls(0.99, "novel", LOW, false), d: draft(true, false), n: cits(2), action: "escalate", reason: "novel" },
  { c: cls(0.99, "repeat", LOW, false), d: draft(false, false), n: cits(2), action: "escalate", reason: "no_citation" },
  { c: cls(0.99, "repeat", LOW, false), d: draft(true, false), n: cits(0), action: "escalate", reason: "no_citation" },
  { c: cls(0.99, "repeat", null, false), d: draft(true, false), n: cits(2), action: "escalate", reason: "high_risk_taxonomy" },
  { c: cls(0.99, "repeat", HIGH, false), d: draft(true, false), n: cits(2), action: "escalate", reason: "high_risk_taxonomy" },
  { c: cls(0.7, "repeat", LOW, false), d: draft(true, false), n: cits(2), action: "escalate", reason: "below_confidence" },
  { c: cls(0.92, "repeat", LOW, false), d: draft(true, false), n: cits(1), action: "auto_send", reason: "within_policy" },
  { c: cls(0.99, "repeat", "unknown_taxonomy_xyz", false), d: draft(true, false), n: cits(2), action: "escalate", reason: "high_risk_taxonomy" },
  { c: cls(0.85, "repeat", LOW, false), d: draft(true, false), n: cits(1), action: "auto_send", reason: "within_policy" },
  { c: cls(1.0, "repeat", MED, false), d: draft(true, false), n: cits(3), action: "escalate", reason: "high_risk_taxonomy" },
];

let passed = 0;
for (const item of cases) {
  const withCitations: ResolutionDraft = { ...item.d, citations: item.n };
  const out = decide(item.c, item.n, withCitations);
  if (out.action === item.action && out.reason_code === item.reason) {
    passed++;
  } else {
    console.log(`FAIL expected ${item.action}/${item.reason} got ${out.action}/${out.reason_code}`);
  }
}
console.log(`policy: ${passed}/12 cases passed`);
process.exit(passed === 12 ? 0 : 1);
