// DP-SCRIPT WU-SCRIPT-01 — LIVE fact harvest against the deployed URL.
// HTTP only: never imports product code, never a unit test, never a bare
// pipeline call. Runs the exact demo parameters twice, unchanged, and writes
// fact-ledger.json (backing the previous file up as fact-ledger.offline.json).
// Usage: BASE_URL=https://<endpoint> node scripts/demo/harvest-live.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const BASE = (process.env.BASE_URL ?? "").replace(/\/$/, "");
if (!BASE) throw new Error("BASE_URL is required");
const OUTSIDE = "C:/Users/cesar/Documents/CursorAI-projects/hackathons/hackathon-projects/2026-09-nebius_NVIDIA-2";
const TICKETS = ["t-repeat-01", "t-novel-01"];
const TIMEOUT_MS = 300000;

const raw = JSON.parse(readFileSync("fixtures/tickets.json", "utf8"));
const all = Array.isArray(raw) ? raw : (raw.tickets ?? []);
const byId = new Map(all.map((t) => [t.id, t]));

async function req(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function runOnce(runNo) {
  const perTicket = [];
  let autoSent = 0;
  let escalated = 0;
  let tavilyCalls = 0;
  for (const id of TICKETS) {
    const full = byId.get(id);
    if (!full) throw new Error(`missing fixture ${id}`);
    // Post exactly the Ticket schema shape (fixtures carry eval-only extras
    // the input schema rejects) — same stripping as e2e loadTickets().
    const ticket = { id: full.id, subject: full.subject, body: full.body, requester: full.requester, created_at: full.created_at };
    if (full.thread !== undefined) ticket.thread = full.thread;
    const startedAt = Date.now();
    const r = await req("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    });
    const wallMs = Date.now() - startedAt;
    if (r.decision?.action === "auto_send") autoSent++;
    else escalated++;
    tavilyCalls += r.ledger?.tavily_calls ?? 0;
    const models = [...new Set((r.ledger?.calls ?? []).filter((c) => c.provider === "nebius-token-factory" && c.model).map((c) => c.model))];
    perTicket.push({
      ticket_id: id,
      subject: full.subject,
      label: r.classification?.label ?? null,
      taxonomy: r.classification?.taxonomy ?? null,
      confidence: r.classification?.confidence ?? null,
      citations: (r.citations ?? []).map((c) => ({ url: c.url, title: c.title, source: c.source })),
      citation_count: (r.citations ?? []).length,
      action: r.decision?.action ?? null,
      reason_code: r.decision?.reason_code ?? null,
      degraded: r.degraded ?? null,
      models,
      input_tokens: r.ledger?.total_input_tokens ?? 0,
      output_tokens: r.ledger?.total_output_tokens ?? 0,
      estimated_cost_usd: r.ledger?.estimated_cost_usd ?? 0,
      wall_ms: wallMs,
    });
  }
  const s = await req("/api/savings");
  const q = await req("/api/queue?limit=50");
  return {
    tickets_completed: perTicket.length,
    auto_sent: autoSent,
    escalated,
    deflection_rate_1dp: s.deflection_rate ?? 0,
    usd_per_ticket_4dp: s.usd_per_ticket ?? 0,
    total_spend_usd: perTicket.reduce((a, t) => a + Number(t.estimated_cost_usd ?? 0), 0),
    tavily_calls: tavilyCalls,
    savings_endpoint: s,
    queue_depth: Array.isArray(q) ? q.length : null,
    per_ticket: perTicket,
  };
}

const run1 = await runOnce(1);
const run2 = await runOnce(2);
const head = (r) => JSON.stringify(r.per_ticket.map((t) => [t.ticket_id, t.label, t.action, t.citation_count]));
// Agreement is structural (labels, actions, citation counts). USD/token
// figures vary run to run and are quoted as a range per DP-SCRIPT §7.
const agreed = head(run1) === head(run2);
const usdVals = [run1, run2].map((r) => r.usd_per_ticket_4dp);
const all1 = run1.per_ticket;
// Featured: prefer repeat + cited + auto-sent, else first ticket. Contrast: first escalated.
const featured = all1.find((t) => t.label === "repeat" && t.citation_count > 0 && t.action === "auto_send")
  ?? all1.find((t) => t.label === "repeat")
  ?? all1[0];
const contrast = all1.find((t) => t.action === "escalate" && t.ticket_id !== featured.ticket_id) ?? all1[1];
const modelIds = [...new Set(all1.flatMap((t) => t.models ?? []))];
const ledger = {
  runs: [run1, run2],
  featuredTicket: featured,
  escalatedTicket: contrast,
  modelIds,
  agreed,
  usdPerTicket: run1.usd_per_ticket_4dp,
  usdPerTicketRange: [Math.min(...usdVals), Math.max(...usdVals)],
  deflectionRate: run1.deflection_rate_1dp,
  params: {
    tickets: TICKETS,
    corpus: "engine/rag/runbooks@12docs",
    mode: "live",
    base_url: BASE,
    date: new Date().toISOString().slice(0, 10),
  },
  note: "live harvest against the deployed URL (two agreeing runs); supersedes the offline ledger",
};
if (existsSync(`${OUTSIDE}/fact-ledger.json`)) {
  copyFileSync(`${OUTSIDE}/fact-ledger.json`, `${OUTSIDE}/fact-ledger.offline.json`);
}
writeFileSync(`${OUTSIDE}/fact-ledger.json`, JSON.stringify(ledger, null, 2) + "\n", "utf8");
console.log(`harvest-ok ${agreed}`);
