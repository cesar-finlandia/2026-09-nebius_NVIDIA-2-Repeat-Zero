import { withResilience } from "src/resilience";
import { runTriage } from "src/repeatzero/pipeline/index.js";
import type { Ticket } from "src/repeatzero/types.js";
import type { TriageResult } from "src/repeatzero/types.js";

export const runAgent = withResilience(
  (ticket: Ticket): Promise<TriageResult> => runTriage(ticket),
  { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] } },
);
