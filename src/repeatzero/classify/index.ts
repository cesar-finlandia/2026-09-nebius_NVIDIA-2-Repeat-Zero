import { readFileSync } from "node:fs";
import { isDegradedResult, renderRepairPrompt, validate } from "../../resilience/index.js";
import type { ChatResponse } from "../tokenfactory/client.js";
import { chat } from "../tokenfactory/client.js";
import { TAXONOMY } from "../taxonomy.js";
import { MODELS } from "../config.js";
import { fit } from "../../context/index.js";
import type { Message } from "../../context/index.js";
import type { RetrievalCandidate, Ticket, TicketClassification } from "../types.js";

function degraded(reason: string): TicketClassification {
  const r: string = reason.length > 0 ? reason : "degraded";
  return {
    label: "novel",
    taxonomy: null,
    confidence: 0,
    rationale: (`classifier degraded: ${r}`).slice(0, 600),
    degraded: true,
    degradation_reason: r,
  };
}

export async function classifyTicket(
  ticket: Ticket,
  candidates: RetrievalCandidate[],
): Promise<TicketClassification> {
  try {
    const lines: string = TAXONOMY.map((r) => `${r.id} — ${r.label} (${r.risk})`).join("\n");
    const sysRaw: string = readFileSync("engine/prompts/system.classify.md", "utf8");
    const system: string = sysRaw.replace("{{taxonomy}}", lines);
    let ticketBlock: string = `Subject: ${ticket.subject}\nBody: ${ticket.body}`;
    if (ticket.thread !== undefined && ticket.thread.length > 0) {
      const last5 = ticket.thread.slice(-5);
      const threadText: string = last5.map((m) => `[${m.author} @ ${m.at}] ${m.body}`).join("\n");
      ticketBlock = `${ticketBlock}\nThread (last ${last5.length}):\n${threadText}`;
    }
    let candBlock: string;
    if (candidates.length === 0) {
      candBlock = "None. No candidate covers this ticket — lean novel unless the ticket itself names a known fix.";
    } else {
      const rows: string[] = [];
      for (const c of candidates) {
        const body300: string = c.doc.body.slice(0, 300).replace(/\n/g, " ");
        rows.push(`- ${c.doc.id} | ${c.doc.title} | taxonomy=${c.doc.taxonomy} | score=${c.score.toFixed(3)} | ${body300}`);
      }
      candBlock = rows.join("\n");
    }
    const userRaw: string = readFileSync("engine/prompts/user.classify.md", "utf8");
    const user: string = userRaw.replace("{{ticket}}", ticketBlock).replace("{{candidates}}", candBlock);
    const messages: Message[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const fitted = fit(messages, {
      model_profile: "generic-heuristic",
      context_window: MODELS.superContextTokens - 800,
      reserved_output: 800,
    });
    const schema: unknown = JSON.parse(readFileSync("engine/schema/classification.schema.json", "utf8"));
    const sendMessages = fitted.buffer.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));
    const raw = await chat({
      model: MODELS.super,
      messages: sendMessages,
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
      label: "classify",
      traceId: ticket.id,
    });
    if (isDegradedResult(raw)) {
      const reason: string = typeof (raw as { reason?: unknown }).reason === "string" ? (raw as { reason: string }).reason : "degraded";
      return degraded(reason);
    }
    const content: string = (raw as ChatResponse).content;
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return await repairOnce(system, content, schema as object, ticket);
    }
    const result = validate(schema as object, parsed);
    if (result.valid) {
      return normalise(parsed);
    }
    return await repairOnce(system, content, schema as object, ticket, result.errors);
  } catch {
    return degraded("exception");
  }
}

async function repairOnce(
  system: string,
  badText: string,
  schema: object,
  ticket: Ticket,
  errors?: Array<{ path: string; message: string; code: string }>,
): Promise<TicketClassification> {
  try {
    const repairPrompt: string = renderRepairPrompt(errors ?? [], badText);
    const retry = await chat({
      model: MODELS.super,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${badText}\n\n${repairPrompt}` },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
      label: "classify",
      traceId: ticket.id,
    });
    if (isDegradedResult(retry)) {
      const reason: string = typeof (retry as { reason?: unknown }).reason === "string" ? (retry as { reason: string }).reason : "degraded";
      return degraded(reason);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse((retry as ChatResponse).content);
    } catch {
      return degraded("schema");
    }
    const result = validate(schema, parsed);
    if (!result.valid) {
      return degraded("schema");
    }
    return normalise(parsed);
  } catch {
    return degraded("exception");
  }
}

function normalise(parsed: unknown): TicketClassification {
  const rec = parsed as { confidence?: unknown; label?: unknown; taxonomy?: unknown; rationale?: unknown };
  let confidence: number = Number(rec.confidence);
  if (!Number.isFinite(confidence)) {
    confidence = 0;
  }
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;
  let label: string = typeof rec.label === "string" ? rec.label : "novel";
  if (label !== "repeat" && label !== "novel") {
    label = "novel";
  }
  const allowed = new Set<string>(TAXONOMY.map((r) => r.id));
  let taxonomy: string | null = null;
  if (typeof rec.taxonomy === "string" && allowed.has(rec.taxonomy)) {
    taxonomy = rec.taxonomy;
  } else {
    taxonomy = null;
  }
  if (taxonomy === null) {
    label = "novel";
  }
  let rationale: string = String(rec.rationale ?? "").slice(0, 600);
  if (rationale.trim() === "") {
    rationale = "no rationale returned";
  }
  return {
    label: label as "repeat" | "novel",
    taxonomy: taxonomy as TicketClassification["taxonomy"],
    confidence,
    rationale,
    degraded: false,
  };
}
