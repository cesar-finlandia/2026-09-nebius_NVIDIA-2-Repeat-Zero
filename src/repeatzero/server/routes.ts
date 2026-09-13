import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDegradedResult, validate } from "../../resilience/index.js";
import { runTriage } from "../pipeline/index.js";
import { listModels } from "../tokenfactory/client.js";
import { savings } from "../ledger/index.js";
import type { Ticket, TriageResult } from "../types.js";
import { publishEnvelope, snapshotFor, streamResponse } from "./sse.js";
import { listQueue, pushResult } from "./queue.js";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

let healthCache: { at_ms: number; models: string[] } | null = null;
const HEALTH_CACHE_TTL_MS = 60000;

let inputSchema: object | null = null;
function loadInputSchema(): object {
  if (inputSchema === null) {
    inputSchema = JSON.parse(readFileSync("engine/schema/input.schema.json", "utf8")) as object;
  }
  return inputSchema;
}

export async function handler(req: Request): Promise<Response> {
  const headers = corsHeaders();
  let traceId = randomUUID();
  try {
    const url = new URL(req.url);
    const path: string = url.pathname;
    const method: string = req.method.toUpperCase();
    if (method === "OPTIONS") {
      return new Response("", { status: 204, headers });
    }
    if (method === "GET" && (path === "/" || path === "/index.html")) {
      const distIndex: string = join(process.cwd(), "dist", "index.html");
      if (existsSync(distIndex)) {
        const html: string = readFileSync(distIndex, "utf8");
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...headers } });
      }
    }
    if (method === "GET" && path.startsWith("/assets/")) {
      const filePath: string = join(process.cwd(), "dist", path.slice(1));
      if (existsSync(filePath)) {
        const data: Buffer = readFileSync(filePath) as Buffer;
        const contentType: string = path.endsWith(".js")
          ? "text/javascript"
          : path.endsWith(".css")
            ? "text/css"
            : path.endsWith(".woff2")
              ? "font/woff2"
              : "application/octet-stream";
        return new Response(data as BodyInit, { status: 200, headers: { "Content-Type": contentType, ...headers } });
      }
    }
    if (method === "GET" && path === "/healthz") {
      const now: number = Date.now();
      if (healthCache !== null && now - healthCache.at_ms < HEALTH_CACHE_TTL_MS) {
        return jsonResponse({ ok: true, models: healthCache.models }, 200);
      }
      const models = await listModels();
      if (isDegradedResult(models)) {
        if (healthCache !== null) {
          return jsonResponse({ ok: true, models: healthCache.models }, 200);
        }
        return jsonResponse({ ok: true, models: [] }, 200);
      }
      healthCache = { at_ms: now, models: models as string[] };
      return jsonResponse({ ok: true, models: models as string[] }, 200);
    }
    if (method === "GET" && path === "/api/savings") {
      return jsonResponse(savings(), 200);
    }
    if (method === "GET" && path === "/api/queue") {
      const raw: string | null = url.searchParams.get("limit");
      let limit: number = raw === null ? 50 : Number(raw);
      if (Number.isNaN(limit)) limit = 50;
      limit = Math.min(200, Math.max(1, Math.floor(limit)));
      return jsonResponse(listQueue(limit), 200);
    }
    if (method === "GET" && path === "/api/stream") {
      const traceParam: string | null = url.searchParams.get("trace_id");
      return streamResponse(traceParam);
    }
    if (method === "GET" && path === "/api/events") {
      const traceParam: string | null = url.searchParams.get("trace_id");
      if (traceParam === null || traceParam === "") {
        return jsonResponse({ error: "missing_trace_id" }, 400);
      }
      return jsonResponse(snapshotFor(traceParam), 200);
    }
    if (method === "POST" && path === "/api/tickets") {
      let text: string;
      try {
        text = await req.text();
      } catch {
        return jsonResponse({ error: "invalid_ticket", details: [{ path: "$", message: "body is not JSON" }] }, 400);
      }
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return jsonResponse({ error: "invalid_ticket", details: [{ path: "$", message: "body is not JSON" }] }, 400);
      }
      const result = validate(loadInputSchema(), body);
      if (!result.valid) {
        const details = result.errors.map((e) => ({ path: String(e.path ?? "$"), message: String(e.message) }));
        return jsonResponse({ error: "invalid_ticket", details }, 400);
      }
      traceId = randomUUID();
      const ticket = body as Ticket;
      const adapter = {
        publish: async (opts: { stepId: string; status: "started" | "streaming" | "done" | "error"; payload?: Record<string, unknown>; traceId?: string; degraded?: boolean }): Promise<void> => {
          publishEnvelope({
            step_id: opts.stepId,
            status: opts.status,
            payload: opts.payload ?? {},
            timestamp: new Date().toISOString(),
            sequence: 0,
            trace_id: opts.traceId ?? traceId,
            ...(opts.degraded === true ? { degraded: true } : {}),
          });
        },
        publishDelta: async (): Promise<void> => {},
        close: async (): Promise<void> => {},
        sequence: 0,
      };
      const triageResult: TriageResult = await runTriage(ticket, { traceId, publisher: adapter as never });
      if (isDegradedResult(triageResult)) {
        const fallback: TriageResult = {
          trace_id: traceId,
          ticket,
          classification: { label: "novel", taxonomy: null, confidence: 0, rationale: "handler degraded", degraded: true, degradation_reason: "handler" },
          citations: [],
          draft: { kind: "resolution", body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true },
          decision: { action: "escalate", reason_code: "degraded_input", explanation: "Input is degraded; escalating for human review.", thresholds_applied: { confidence: 0.85, min_citations: 1, risk: "high" } },
          ledger: { trace_id: traceId, ticket_id: ticket.id, calls: [], total_input_tokens: 0, total_output_tokens: 0, estimated_cost_usd: 0, tavily_calls: 0 },
          degraded: true,
        };
        pushResult(fallback);
        return jsonResponse(fallback, 200);
      }
      pushResult(triageResult);
      return jsonResponse(triageResult, 200);
    }
    return jsonResponse({ error: "not_found", path }, 404);
  } catch {
    return jsonResponse({ error: "internal", trace_id: traceId }, 500);
  }
}
