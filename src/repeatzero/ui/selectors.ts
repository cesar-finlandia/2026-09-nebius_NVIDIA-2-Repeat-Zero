import { STEP_IDS } from "../pipeline/steps.js";
import type { EventEnvelope } from "src/platform/transport";
import type { TriageResult } from "../types.js";
import { isDegradedEnvelope } from "src/platform/ui";

export interface QueueRow {
  traceId: string;
  ticketId: string;
  subject: string;
  taxonomyId: string;
  stepStatus: Record<string, "pending" | "started" | "streaming" | "done" | "error">;
  state: "sent" | "escalated" | "working" | "unverified";
  elapsedMs: number;
  degraded: boolean;
}

export interface SavingsFigures {
  tickets: number;
  auto_sent: number;
  escalated: number;
  deflection_rate: number;
  usd_per_ticket: number;
  hours_saved: number;
}

export interface ActivityLine {
  stepId: string;
  text: string;
  done: boolean;
}

function terminalOf(envelopes: EventEnvelope[]): { terminal: string | null; degraded: boolean } {
  let terminal: string | null = null;
  let degraded = false;
  for (const e of envelopes) {
    if (e.degraded === true) degraded = true;
    if ((e.step_id === "dispatch" || e.step_id === "escalate") && e.status === "done") {
      terminal = e.step_id;
    }
  }
  return { terminal, degraded };
}

export function selectQueueRows(envelopes: EventEnvelope[], queue: TriageResult[]): QueueRow[] {
  const byTrace = new Map<string, EventEnvelope[]>();
  for (const e of envelopes) {
    const key: string = e.trace_id ?? "";
    if (key === "") continue;
    const bucket: EventEnvelope[] = byTrace.get(key) ?? [];
    bucket.push(e);
    byTrace.set(key, bucket);
  }
  const results = new Map<string, TriageResult>();
  for (const r of queue) {
    results.set(r.trace_id, r);
  }
  const traceIds = new Set<string>([...byTrace.keys(), ...results.keys()]);
  const rows: QueueRow[] = [];
  for (const traceId of traceIds) {
    const envs: EventEnvelope[] = byTrace.get(traceId) ?? [];
    const result: TriageResult | undefined = results.get(traceId);
    const stepStatus: QueueRow["stepStatus"] = {};
    for (const id of STEP_IDS) {
      stepStatus[id] = "pending";
    }
    for (const e of envs) {
      if ((STEP_IDS as readonly string[]).includes(e.step_id)) {
        if (e.status === "started" || e.status === "streaming" || e.status === "done" || e.status === "error") {
          stepStatus[e.step_id] = e.status;
        }
      }
    }
    const { terminal, degraded } = terminalOf(envs);
    let state: QueueRow["state"];
    if (terminal === "dispatch") state = "sent";
    else if (terminal === "escalate") state = "escalated";
    else if (degraded || envs.some((e) => isDegradedEnvelope(e))) state = "unverified";
    else if (envs.length > 0) state = "working";
    else state = "unverified";
    const first: number | null = envs.length > 0 ? Date.parse((envs[0] as EventEnvelope).timestamp) : null;
    const last: number | null = envs.length > 0 ? Date.parse((envs[envs.length - 1] as EventEnvelope).timestamp) : null;
    const elapsedMs: number = first !== null && last !== null && Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, last - first) : 0;
    rows.push({
      traceId,
      ticketId: result?.ticket.id ?? (envs[0]?.payload?.["ticket_id"] as string | undefined) ?? traceId,
      subject: result?.ticket.subject ?? (envs[0]?.payload?.["subject"] as string | undefined) ?? traceId,
      taxonomyId: result?.classification.taxonomy ?? "",
      stepStatus,
      state,
      elapsedMs,
      degraded: degraded || (result?.degraded ?? false),
    });
  }
  rows.sort((a, b) => (a.traceId < b.traceId ? -1 : a.traceId > b.traceId ? 1 : 0));
  return rows;
}

export function selectDraft(envelopes: EventEnvelope[], queue: TriageResult[], traceId: string | null): TriageResult | null {
  if (traceId === null) return null;
  for (const r of queue) {
    if (r.trace_id === traceId) return r;
  }
  void envelopes;
  return null;
}

export function selectEscalations(queue: TriageResult[]): Map<string, TriageResult[]> {
  const groups = new Map<string, TriageResult[]>();
  for (const r of queue) {
    if (r.decision.action !== "escalate") continue;
    const key: string = r.decision.reason_code;
    const bucket: TriageResult[] = groups.get(key) ?? [];
    bucket.push(r);
    groups.set(key, bucket);
  }
  return groups;
}

export function selectDegraded(envelopes: EventEnvelope[]): Array<{ step: string; detail: string }> {
  const seen = new Set<string>();
  const out: Array<{ step: string; detail: string }> = [];
  for (const e of envelopes) {
    if (!isDegradedEnvelope(e)) continue;
    const key: string = `${e.step_id}:${e.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ step: e.step_id, detail: e.status });
  }
  return out;
}

export function selectSavings(savings: SavingsFigures | null): SavingsFigures | null {
  return savings;
}

const ACTIVITY_TEXT: Record<string, string> = {
  "ticket-intake": "Reading the ticket",
  retrieve: "Searching the runbooks",
  classify: "Deciding if this is a repeat",
  ground: "Looking up current sources",
  draft: "Writing the reply",
  "policy-gate": "Checking the send rules",
  ledger: "Recording what this cost",
  dispatch: "Sending the reply",
  escalate: "Handing this to you",
};

export function selectActivityLine(envelopes: EventEnvelope[]): ActivityLine {
  if (envelopes.length === 0) {
    return { stepId: "ticket-intake", text: "Starting — connecting to the live queue", done: false };
  }
  let latest: EventEnvelope = envelopes[0] as EventEnvelope;
  for (const e of envelopes) {
    if (e.sequence >= latest.sequence) latest = e;
  }
  const stepId: string = (STEP_IDS as readonly string[]).includes(latest.step_id) ? latest.step_id : "ticket-intake";
  const text: string = ACTIVITY_TEXT[stepId] ?? "Starting — connecting to the live queue";
  return { stepId, text, done: latest.status === "done" };
}
