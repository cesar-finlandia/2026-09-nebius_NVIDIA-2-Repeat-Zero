// Cost figures are local estimates (rate_source=local-estimate, verified_at=2026-09-15), not billing.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONFIG, MODELS } from "../config.js";
import type { LedgerCall, TicketLedgerEntry } from "../types.js";

export interface SavingsSummary {
  tickets: number;
  auto_sent: number;
  escalated: number;
  deflection_rate: number;
  usd_per_ticket: number;
  hours_saved: number;
}

const SUPER_INPUT_USD_PER_1K = 0.0015;
const SUPER_OUTPUT_USD_PER_1K = 0.0045;
const NANO_INPUT_USD_PER_1K = 0.0004;
const NANO_OUTPUT_USD_PER_1K = 0.0012;
const TAVILY_COST_PER_CALL_USD = 0.006;
const MINUTES_SAVED_PER_DEFLECTED_TICKET = 6;

// process-local; rebuilt via loadSnapshot on start
const pending = new Map<string, LedgerCall[]>();
const completed: TicketLedgerEntry[] = [];
const outcomes: Array<{ trace_id: string; action: "auto_send" | "escalate" }> = [];

function round6(x: number): number {
  return Math.round(x * 1_000_000) / 1_000_000;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function isNonNegIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  return null;
}

function isIsoString(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return !Number.isNaN(Date.parse(v));
}

function priced(call: { provider: string; model: string | null; input_tokens: number | null; output_tokens: number | null }): number {
  if (call.provider === "tavily") {
    return TAVILY_COST_PER_CALL_USD;
  }
  const inputRate: number = call.model === MODELS.nano ? NANO_INPUT_USD_PER_1K : SUPER_INPUT_USD_PER_1K;
  const outputRate: number = call.model === MODELS.nano ? NANO_OUTPUT_USD_PER_1K : SUPER_OUTPUT_USD_PER_1K;
  return ((call.input_tokens ?? 0) / 1000) * inputRate + ((call.output_tokens ?? 0) / 1000) * outputRate;
}

export function recordCall(traceId: string, call: LedgerCall): void {
  try {
    const key: string = typeof traceId === "string" && traceId !== "" ? traceId : "unknown";
    const c: LedgerCall = {
      provider: call.provider === "tavily" ? "tavily" : "nebius-token-factory",
      model: typeof call.model === "string" ? call.model : null,
      label: typeof call.label === "string" && call.label !== "" ? call.label : "unknown",
      input_tokens: isNonNegIntOrNull(call.input_tokens),
      output_tokens: isNonNegIntOrNull(call.output_tokens),
      at: isIsoString(call.at) ? call.at : new Date().toISOString(),
    };
    const bucket: LedgerCall[] = pending.get(key) ?? [];
    bucket.push(c);
    pending.set(key, bucket);
  } catch {
    // metering must never break a ticket
  }
}

export function finishTicket(traceId: string, ticketId: string): TicketLedgerEntry {
  try {
    const calls: LedgerCall[] = pending.has(traceId) ? [...(pending.get(traceId) as LedgerCall[])] : [];
    pending.delete(traceId);
    let totalInput = 0;
    let totalOutput = 0;
    for (const c of calls) {
      totalInput += c.input_tokens ?? 0;
      totalOutput += c.output_tokens ?? 0;
    }
    const tavilyCalls: number = calls.filter((c) => c.provider === "tavily").length;
    let cost = 0;
    for (const c of calls) {
      cost += priced(c);
    }
    const entry: TicketLedgerEntry = {
      trace_id: traceId,
      ticket_id: ticketId,
      calls,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      estimated_cost_usd: round6(cost),
      tavily_calls: tavilyCalls,
    };
    completed.push(JSON.parse(JSON.stringify(entry)) as TicketLedgerEntry);
    return entry;
  } catch {
    return { trace_id: traceId, ticket_id: ticketId, calls: [], total_input_tokens: 0, total_output_tokens: 0, estimated_cost_usd: 0, tavily_calls: 0 };
  }
}

export function recordOutcome(traceId: string, action: "auto_send" | "escalate"): void {
  try {
    if (action !== "auto_send" && action !== "escalate") return;
    for (const o of outcomes) {
      if (o.trace_id === traceId) return;
    }
    outcomes.push({ trace_id: traceId, action });
  } catch {
    // ignore
  }
}

export function resetLedger(): void {
  try {
    pending.clear();
    completed.length = 0;
    outcomes.length = 0;
  } catch {
    // ignore
  }
}

export function savings(): SavingsSummary {
  try {
    const tickets: number = completed.length;
    let autoSent = 0;
    let escalated = 0;
    for (const o of outcomes) {
      if (o.action === "auto_send") autoSent++;
      else if (o.action === "escalate") escalated++;
    }
    const deflectionRate: number = tickets === 0 ? 0 : round4(autoSent / tickets);
    let totalUsd = 0;
    for (const e of completed) {
      totalUsd += e.estimated_cost_usd;
    }
    totalUsd = round6(totalUsd);
    const usdPerTicket: number = tickets === 0 ? 0 : round6(totalUsd / tickets);
    const hoursSaved: number = round4((autoSent * MINUTES_SAVED_PER_DEFLECTED_TICKET) / 60);
    return { tickets, auto_sent: autoSent, escalated, deflection_rate: deflectionRate, usd_per_ticket: usdPerTicket, hours_saved: hoursSaved };
  } catch {
    return { tickets: 0, auto_sent: 0, escalated: 0, deflection_rate: 0, usd_per_ticket: 0, hours_saved: 0 };
  }
}

function resolveSnapshotPath(path?: string): string {
  if (typeof path === "string" && path !== "") return path;
  const configured: string = CONFIG.ledgerSnapshotPath;
  if (typeof configured === "string" && configured !== "") return configured;
  return "artifacts/cost-store.json";
}

export function writeSnapshot(path?: string): void {
  try {
    const outPath: string = resolveSnapshotPath(path);
    const records: Array<Record<string, unknown>> = [];
    for (const e of completed) {
      for (const c of e.calls) {
        const totalTokens: number | null =
          c.input_tokens === null && c.output_tokens === null ? null : (c.input_tokens ?? 0) + (c.output_tokens ?? 0);
        const unmetered: boolean = c.input_tokens === null && c.output_tokens === null;
        records.push({
          id: randomUUID(),
          timestamp: c.at,
          provider: c.provider,
          label: `${e.ticket_id}:${c.label}`,
          model_profile: c.provider === "tavily" ? "tavily-search" : (c.model ?? "unknown"),
          input_tokens: c.input_tokens,
          output_tokens: c.output_tokens,
          total_tokens: totalTokens,
          request_count: 1,
          estimated_cost_usd: round6(priced(c)),
          unmetered,
          unmetered_reason: unmetered ? "missing_usage_data" : null,
          raw_usage_ref: null,
        });
      }
    }
    const totalsByProvider: Record<string, { requests: number; input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number }> = {};
    for (const r of records) {
      const provider: string = r["provider"] as string;
      const bucket = totalsByProvider[provider] ?? { requests: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0 };
      bucket.requests += 1;
      bucket.input_tokens += (r["input_tokens"] as number | null) ?? 0;
      bucket.output_tokens += (r["output_tokens"] as number | null) ?? 0;
      bucket.total_tokens += (r["total_tokens"] as number | null) ?? 0;
      bucket.estimated_cost_usd = round6(bucket.estimated_cost_usd + ((r["estimated_cost_usd"] as number) ?? 0));
      totalsByProvider[provider] = bucket;
    }
    const globalTotals: { requests: number; input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number; records: number } = {
      requests: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      records: records.length,
    };
    for (const provider of Object.keys(totalsByProvider)) {
      const bucket = totalsByProvider[provider] as { requests: number; input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number };
      globalTotals.requests += bucket.requests;
      globalTotals.input_tokens += bucket.input_tokens;
      globalTotals.output_tokens += bucket.output_tokens;
      globalTotals.total_tokens += bucket.total_tokens;
      globalTotals.estimated_cost_usd = round6(globalTotals.estimated_cost_usd + bucket.estimated_cost_usd);
    }
    const snapshot = { version: "1.0.0", records, totals_by_provider: totalsByProvider, global_totals: globalTotals };
    const text: string = JSON.stringify(snapshot, null, 2) + "\n";
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, text, "utf-8");
  } catch (e) {
    console.warn("[ledger] writeSnapshot failed: " + (e as Error).message);
  }
}

export function loadSnapshot(path?: string): void {
  try {
    const inPath: string = resolveSnapshotPath(path);
    if (!existsSync(inPath)) return;
    const parsed: unknown = JSON.parse(readFileSync(inPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      console.warn("[ledger] snapshot unreadable, starting empty");
      return;
    }
    const rec = parsed as { version?: unknown; records?: unknown };
    if (rec.version !== "1.0.0" || !Array.isArray(rec.records)) {
      console.warn("[ledger] snapshot unreadable, starting empty");
      return;
    }
    const groups = new Map<string, Array<{ call: LedgerCall; ticketId: string }>>();
    for (const r of rec.records as Array<Record<string, unknown>>) {
      const label: unknown = r["label"];
      const ticketPrefix: string = typeof label === "string" && label.includes(":") ? (label.split(":")[0] as string) : "unknown";
      const after: string = typeof label === "string" && label.includes(":") ? label.slice(label.indexOf(":") + 1) : "unknown";
      const provider: string = r["provider"] === "tavily" ? "tavily" : "nebius-token-factory";
      const profile: unknown = r["model_profile"];
      const model: string | null =
        typeof profile === "string" && (profile === MODELS.super || profile === MODELS.nano) ? profile : null;
      const call: LedgerCall = {
        provider: provider as "nebius-token-factory" | "tavily",
        model,
        label: typeof after === "string" && after !== "" ? after : "unknown",
        input_tokens: isNonNegIntOrNull(r["input_tokens"]),
        output_tokens: isNonNegIntOrNull(r["output_tokens"]),
        at: isIsoString(r["timestamp"]) ? (r["timestamp"] as string) : new Date().toISOString(),
      };
      const bucket = groups.get(ticketPrefix) ?? [];
      bucket.push({ call, ticketId: ticketPrefix });
      groups.set(ticketPrefix, bucket);
    }
    for (const [ticketId, rows] of groups) {
      const calls: LedgerCall[] = rows.map((r) => r.call);
      let totalInput = 0;
      let totalOutput = 0;
      for (const c of calls) {
        totalInput += c.input_tokens ?? 0;
        totalOutput += c.output_tokens ?? 0;
      }
      const tavilyCalls: number = calls.filter((c) => c.provider === "tavily").length;
      let cost = 0;
      for (const c of calls) {
        cost += priced(c);
      }
      completed.push({
        trace_id: `snapshot-${ticketId}`,
        ticket_id: ticketId,
        calls,
        total_input_tokens: totalInput,
        total_output_tokens: totalOutput,
        estimated_cost_usd: round6(cost),
        tavily_calls: tavilyCalls,
      });
    }
  } catch {
    console.warn("[ledger] snapshot unreadable, starting empty");
  }
}

void join;
