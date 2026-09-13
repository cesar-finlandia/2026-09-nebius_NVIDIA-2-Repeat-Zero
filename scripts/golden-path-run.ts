import { readFileSync } from "node:fs";
import { runTriage } from "../src/repeatzero/pipeline/index.js";
import { STEP_IDS } from "../src/repeatzero/pipeline/steps.js";
import { writeSnapshot } from "../src/repeatzero/ledger/index.js";
import type { Ticket } from "../src/repeatzero/types.js";

function argValue(name: string): string | null {
  const args: string[] = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg: string = args[i] as string;
    if (arg === name && i + 1 < args.length) {
      return args[i + 1] as string;
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1);
    }
  }
  return null;
}

const indexRaw: string | null = argValue("--index");
const traceRaw: string | null = argValue("--traceId");
const index: number = indexRaw !== null ? Number(indexRaw) : 0;
const traceId: string = traceRaw ?? `golden-${index}`;

const raw: string = readFileSync("fixtures/tickets.json", "utf8");
const parsed: unknown = JSON.parse(raw);
const tickets: Ticket[] = Array.isArray(parsed) ? (parsed as Ticket[]) : ((parsed as { tickets: Ticket[] }).tickets ?? []);

const ticket: Ticket | undefined = tickets[index];
if (ticket === undefined) {
  console.error(`golden-path: FAILED index ${index} out of range`);
  process.exit(1);
}

const seen: string[] = [];
const collectingPublisher = {
  publish: async (opts: { stepId: string; status: string; payload?: Record<string, unknown>; traceId?: string; degraded?: boolean }): Promise<void> => {
    seen.push(opts.stepId);
  },
  publishDelta: async (): Promise<void> => {},
  close: async (): Promise<void> => {},
  sequence: 0,
};

const result = await runTriage(ticket, { traceId, publisher: collectingPublisher as never });

if (process.argv.includes("--write-snapshot")) {
  writeSnapshot();
}

const expectedPrefix: string[] = (STEP_IDS as readonly string[]).slice(0, 7) as string[];
const seenSteps: string[] = seen.filter((_, i) => i % 2 === 0);
const doneSteps: string[] = seen.filter((_, i) => i % 2 === 1);
const last: string | undefined = doneSteps[doneSteps.length - 1];
const prefixOk: boolean =
  seenSteps.length === 8 &&
  seenSteps.slice(0, 7).every((s, i) => s === expectedPrefix[i]) &&
  (seenSteps[7] === "dispatch" || seenSteps[7] === "escalate");
const lastOk: boolean = last === "dispatch" || last === "escalate";
if (!prefixOk || !lastOk) {
  console.error(`golden-path: FAILED ${ticket.id} step-order ${seen.join(",")}`);
  process.exit(1);
}

console.log(`${ticket.id} ${seen.join(",")}`);
void result;
process.exit(0);
