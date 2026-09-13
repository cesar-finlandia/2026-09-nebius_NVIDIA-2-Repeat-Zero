import { readFileSync, writeFileSync } from "node:fs";
import { runTriage } from "../../src/repeatzero/pipeline/index.js";
import { writeSnapshot } from "../../src/repeatzero/ledger/index.js";
import type { Ticket } from "../../src/repeatzero/types.js";
import type { EventEnvelope } from "../../src/platform/transport/index.js";

const raw: string = readFileSync("fixtures/tickets.json", "utf8");
const parsed: unknown = JSON.parse(raw);
const tickets: Ticket[] = Array.isArray(parsed) ? (parsed as Ticket[]) : ((parsed as { tickets: Ticket[] }).tickets ?? []);
const ticket: Ticket | undefined = tickets[0];
if (ticket === undefined) {
  console.error("demodrive-capture: FAILED no fixture ticket");
  process.exit(1);
}

const envelopes: EventEnvelope[] = [];
let seq = 0;
const capturingPublisher = {
  publish: async (opts: { stepId: string; status: string; payload?: Record<string, unknown>; traceId?: string; degraded?: boolean }): Promise<void> => {
    envelopes.push({
      step_id: opts.stepId,
      status: opts.status as EventEnvelope["status"],
      payload: opts.payload ?? {},
      timestamp: new Date().toISOString(),
      sequence: seq++,
      trace_id: opts.traceId ?? "demodrive-t7",
      ...(opts.degraded === true ? { degraded: true as const } : {}),
    });
  },
  publishDelta: async (): Promise<void> => {},
  close: async (): Promise<void> => {},
  sequence: 0,
};

const result = await runTriage(ticket, { traceId: "demodrive-t7", publisher: capturingPublisher as never });
writeSnapshot();
writeFileSync("artifacts/demodrive/trace.json", JSON.stringify(envelopes, null, 2) + "\n", "utf8");
const stamped: string = `demodrive capture ${new Date().toISOString()} ticket=${ticket.id} trace=demodrive-t7 decision=${result.decision.action}\n`;
writeFileSync("artifacts/demodrive/run.log", stamped, "utf8");
console.log(`demodrive-capture: ${envelopes.length} envelopes decision=${result.decision.action}`);
