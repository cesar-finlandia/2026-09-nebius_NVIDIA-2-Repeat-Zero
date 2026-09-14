import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { runTriage } from "../../src/repeatzero/pipeline/index.js";
import { resetLedger, finishTicket, savings, writeSnapshot } from "../../src/repeatzero/ledger/index.js";
import type { Ticket } from "../../src/repeatzero/types.js";
import type { EventEnvelope } from "../../src/platform/transport/index.js";

const OUTSIDE = "C:/Users/cesar/Documents/CursorAI-projects/hackathons/hackathon-projects/2026-09-nebius_NVIDIA-2";
const PARAMS = {
  tickets: ["t-repeat-01", "t-novel-01"],
  corpus: "engine/rag/runbooks@12docs",
  mode: "offline-forced-degraded",
};

const raw: string = readFileSync("fixtures/tickets.json", "utf8");
const parsed: unknown = JSON.parse(raw);
const tickets: Ticket[] = Array.isArray(parsed) ? (parsed as Ticket[]) : ((parsed as { tickets: Ticket[] }).tickets ?? []);
const byId = new Map(tickets.map((t) => [t.id, t]));

async function runOnce(runNo: number): Promise<Record<string, unknown>> {
  resetLedger();
  try {
    writeSnapshot(`${OUTSIDE}/cost-store-run${runNo}.json`);
  } catch {
    // ignore
  }
  const perTicket: Array<Record<string, unknown>> = [];
  let autoSent = 0;
  let escalated = 0;
  let tavilyCalls = 0;
  for (const id of PARAMS.tickets) {
    const ticket = byId.get(id);
    if (ticket === undefined) {
      throw new Error(`missing fixture ${id}`);
    }
    const traceId = `harvest-r${runNo}-${id}`;
    const envelopes: EventEnvelope[] = [];
    let seq = 0;
    const publisher = {
      publish: async (opts: { stepId: string; status: string; payload?: Record<string, unknown>; traceId?: string; degraded?: boolean }): Promise<void> => {
        envelopes.push({
          step_id: opts.stepId,
          status: opts.status as EventEnvelope["status"],
          payload: opts.payload ?? {},
          timestamp: new Date().toISOString(),
          sequence: seq++,
          trace_id: opts.traceId ?? traceId,
          ...(opts.degraded === true ? { degraded: true as const } : {}),
        });
      },
      publishDelta: async (): Promise<void> => {},
      close: async (): Promise<void> => {},
      sequence: 0,
    };
    const startedAt = Date.now();
    const result = await runTriage(ticket, { traceId, publisher: publisher as never });
    const wallMs = Date.now() - startedAt;
    if (result.decision.action === "auto_send") autoSent++;
    else escalated++;
    tavilyCalls += result.ledger.tavily_calls;
    perTicket.push({
      ticket_id: id,
      subject: ticket.subject,
      label: result.classification.label,
      taxonomy: result.classification.taxonomy,
      confidence: result.classification.confidence,
      citations: result.citations.map((c) => ({ url: c.url, title: c.title, source: c.source })),
      citation_count: result.citations.length,
      action: result.decision.action,
      reason_code: result.decision.reason_code,
      degraded: result.degraded,
      input_tokens: result.ledger.total_input_tokens,
      output_tokens: result.ledger.total_output_tokens,
      estimated_cost_usd: result.ledger.estimated_cost_usd,
      wall_ms: wallMs,
    });
    void finishTicket;
  }
  const s = savings();
  return {
    tickets_completed: perTicket.length,
    auto_sent: autoSent,
    escalated,
    deflection_rate_1dp: Math.round((perTicket.length > 0 ? autoSent / perTicket.length : 0) * 1000) / 10,
    usd_per_ticket_4dp: Math.round(s.usd_per_ticket * 10000) / 10000,
    total_spend_usd: Math.round(perTicket.reduce((a, t) => a + Number(t["estimated_cost_usd"] ?? 0), 0) * 1000000) / 1000000,
    tavily_calls: tavilyCalls,
    per_ticket: perTicket,
  };
}

const run1 = await runOnce(1);
const run2 = await runOnce(2);
const head = (r: Record<string, unknown>): string =>
  JSON.stringify({ a: r["auto_sent"], e: r["escalated"], d: r["deflection_rate_1dp"], u: r["usd_per_ticket_4dp"] });
const agreed: boolean = head(run1) === head(run2);
const featured = ((run1["per_ticket"] as Array<Record<string, unknown>>)[0] ?? {}) as Record<string, unknown>;
const contrast = ((run1["per_ticket"] as Array<Record<string, unknown>>)[1] ?? {}) as Record<string, unknown>;
const ledger = {
  runs: [run1, run2],
  featuredTicket: featured,
  escalatedTicket: contrast,
  modelIds: ["nvidia/nemotron-3-super-120b-a12b", "nvidia/nemotron-3-nano-30b-a3b"],
  agreed,
  usdPerTicket: run1["usd_per_ticket_4dp"],
  deflectionRate: run1["deflection_rate_1dp"],
  params: PARAMS,
  note: "offline-forced-degraded harvest; all figures labelled offline; live re-harvest required after deploy",
};
mkdirSync(OUTSIDE, { recursive: true });
writeFileSync(`${OUTSIDE}/fact-ledger.json`, JSON.stringify(ledger, null, 2) + "\n", "utf8");
console.log(`harvest-ok ${String(agreed)}`);
