import { randomUUID } from "node:crypto";
import { createPublisher } from "../../platform/transport/index.js";
import type { Publisher } from "../../platform/transport/index.js";
import type {
  Citation,
  Ticket,
  TicketLedgerEntry,
  TriageDecision,
  TriageResult,
} from "../types.js";
import { retrieve } from "../corpus/index.js";
import { classifyTicket } from "../classify/index.js";
import { ground } from "../grounding/tavily.js";
import { draftResolution } from "../draft/index.js";
import { decide } from "../policy/index.js";
import { finishTicket, recordOutcome } from "../ledger/index.js";
import { STEP_IDS } from "./steps.js";
import type { StepId } from "./steps.js";

export class PipelineError extends Error {
  readonly stepId: StepId;
  readonly traceId: string;
  constructor(stepId: StepId, traceId: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PipelineError";
    this.stepId = stepId;
    this.traceId = traceId;
  }
}

type EmitPublisher = {
  publish(opts: { stepId: string; status: "started" | "done" | "error"; payload?: Record<string, unknown>; traceId?: string; degraded?: boolean }): Promise<void>;
  close(): Promise<void>;
  readonly sequence: number;
};

export async function runTriage(
  ticket: Ticket,
  opts?: { publisher?: Publisher; traceId?: string },
): Promise<TriageResult> {
  const traceId: string = opts?.traceId ?? randomUUID();
  const publisher = (opts?.publisher ?? createPublisher("sse")) as unknown as EmitPublisher;
  let failedStep: StepId | null = null;
  const emit = async (
    stepId: StepId,
    status: "started" | "done" | "error",
    payload: Record<string, unknown>,
    degraded?: boolean,
  ): Promise<void> => {
    failedStep = stepId;
    const seq: number = (publisher as { sequence?: number }).sequence ?? 0;
    void seq;
    await publisher.publish({
      stepId,
      status,
      payload,
      traceId,
      ...(degraded === true ? { degraded: true } : {}),
    });
  };
  try {
    await emit("ticket-intake", "started", {});
    await emit("ticket-intake", "done", { ticket_id: ticket.id, subject: ticket.subject });

    await emit("retrieve", "started", {});
    const candidates = retrieve(ticket, 5);
    const top: string | null = candidates.length > 0 ? (candidates[0] as { doc: { id: string } }).doc.id : null;
    await emit("retrieve", "done", { candidate_count: candidates.length, top_runbook_id: top });

    await emit("classify", "started", {});
    const classification = await classifyTicket(ticket, candidates, traceId);
    await emit("classify", "done", { ...classification }, classification.degraded === true ? true : undefined);

    let citations: Citation[] = [];
    let groundWasEmpty = false;
    await emit("ground", "started", {});
    if (classification.label === "novel") {
      await emit("ground", "done", { citations: [], skipped: true }, classification.degraded === true ? true : undefined);
      groundWasEmpty = false;
    } else if (classification.label === "repeat") {
      const grounded: Citation[] = await ground(ticket, classification, candidates, traceId);
      if (grounded.length === 0 && candidates.length > 0) {
        citations = candidates.slice(0, 2).map((c) => ({
          url: c.doc.url,
          title: c.doc.title,
          snippet: c.doc.body.slice(0, 300),
          source: "corpus" as const,
          retrieved_at: new Date().toISOString(),
        }));
        groundWasEmpty = true;
        await emit("ground", "done", { citations, fallback: "corpus" }, true);
      } else {
        citations = grounded;
        groundWasEmpty = grounded.length === 0;
        await emit(
          "ground",
          "done",
          { citations },
          groundWasEmpty || classification.degraded === true ? true : undefined,
        );
      }
    } else {
      await emit("ground", "done", { citations: [], skipped: true }, classification.degraded === true ? true : undefined);
      groundWasEmpty = false;
    }

    await emit("draft", "started", {});
    const draft = await draftResolution(ticket, classification, citations, candidates, traceId);
    await emit("draft", "done", { ...draft }, draft.degraded === true ? true : undefined);

    await emit("policy-gate", "started", {});
    const decision: TriageDecision = decide(classification, citations, draft);
    await emit("policy-gate", "done", { ...decision });

    await emit("ledger", "started", {});
    recordOutcome(traceId, decision.action);
    const ledgerEntry: TicketLedgerEntry = finishTicket(traceId, ticket.id);
    await emit("ledger", "done", { ...ledgerEntry });

    const degraded: boolean =
      classification.degraded === true ||
      draft.degraded === true ||
      (classification.label === "repeat" && groundWasEmpty);
    const result: TriageResult = {
      trace_id: traceId,
      ticket: ticket,
      classification,
      citations,
      draft,
      decision,
      ledger: ledgerEntry,
      degraded,
    };
    const terminal: StepId = decision.action === "auto_send" ? "dispatch" : "escalate";
    await emit(terminal, "started", {});
    await emit(terminal, "done", { ...result }, degraded === true ? true : undefined);
    void STEP_IDS;
    return result;
  } catch (e) {
    if (e instanceof PipelineError) throw e;
    const asErr = e as Error;
    try {
      await publisher.close();
    } catch {
      // swallow close error when already handling a publisher failure
    }
    throw new PipelineError(
      failedStep ?? "ticket-intake",
      traceId,
      `publisher failed at step ${failedStep ?? "ticket-intake"}: ${asErr.message ?? String(e)}`,
      { cause: e },
    );
  } finally {
    await publisher.close();
  }
}
