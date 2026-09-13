import { readFileSync } from "node:fs";
import { isDegradedResult, renderRepairPrompt, validate } from "../../resilience/index.js";
import { fit } from "../../context/index.js";
import type { Message } from "../../context/index.js";
import { chat } from "../tokenfactory/client.js";
import type { ChatResponse } from "../tokenfactory/client.js";
import { CONFIG, MODELS } from "../config.js";
import type { Citation, ResolutionDraft, RetrievalCandidate, Ticket, TicketClassification } from "../types.js";

function echoInvalid(
  citations: Citation[],
  degradedCarry: boolean,
  reason: "no_citation" | "schema" | "degraded",
  body?: string,
  action?: string,
): ResolutionDraft {
  return {
    kind: "resolution",
    body: body ?? "",
    citations,
    suggested_first_action: action ?? "",
    valid: false,
    invalid_reason: reason,
    degraded: degradedCarry || reason === "degraded",
  };
}

export async function draftResolution(
  ticket: Ticket,
  classification: TicketClassification,
  citations: Citation[],
  candidates: RetrievalCandidate[],
  traceId: string,
): Promise<ResolutionDraft> {
  try {
    if (citations.length === 0) {
      return {
        kind: "resolution",
        body: "",
        citations: [],
        suggested_first_action: "",
        valid: false,
        invalid_reason: "no_citation",
        degraded: classification.degraded === true,
      };
    }
    let degradedCarry: boolean = classification.degraded === true;
    if (CONFIG.forcedDegraded === true) {
      degradedCarry = true;
    }
    let sysTpl: string;
    let usrTpl: string;
    try {
      sysTpl = readFileSync("engine/prompts/system.draft.md", "utf8");
      usrTpl = readFileSync("engine/prompts/user.draft.md", "utf8");
    } catch {
      return { kind: "resolution", body: "", citations, suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const citLines: string[] = [];
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i] as Citation;
      let line: string = `[${i + 1}] ${c.title} — ${c.url}`;
      if (c.snippet !== "") {
        line += `\n${c.snippet.slice(0, 500)}`;
      }
      citLines.push(line);
    }
    const citationBlock: string = citLines.join("\n\n");
    let candidateBlock: string;
    if (candidates.length === 0) {
      candidateBlock = "(no runbook candidates)";
    } else {
      const rows: string[] = [];
      for (const c of candidates.slice(0, 3)) {
        rows.push(`## ${c.doc.id} — ${c.doc.title}\n${c.doc.body.slice(0, 1200)}`);
      }
      candidateBlock = rows.join("\n\n");
    }
    const policyNote: string = `Every factual step MUST cite at least one source with [n] markers where n is 1..${citations.length}. Emit JSON only.`;
    const system: string = sysTpl.replaceAll("{{citation_block}}", citationBlock).replaceAll("{{policy_note}}", policyNote);
    const user: string = usrTpl
      .replaceAll("{{ticket_subject}}", ticket.subject)
      .replaceAll("{{ticket_body}}", ticket.body)
      .replaceAll("{{classification_label}}", classification.label)
      .replaceAll("{{classification_taxonomy}}", String(classification.taxonomy))
      .replaceAll("{{classification_rationale}}", classification.rationale)
      .replaceAll("{{citation_block}}", citationBlock)
      .replaceAll("{{candidate_block}}", candidateBlock);
    const messages: Message[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const fitted = fit(messages, {
      model_profile: "generic-heuristic",
      context_window: MODELS.superContextTokens - 1200,
      reserved_output: 1200,
    });
    if (fitted.buffer.length === 0) {
      return { kind: "resolution", body: "", citations, suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const raw = await chat({
      model: MODELS.super,
      messages: fitted.buffer.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      label: "draft",
      traceId,
    });
    if (isDegradedResult(raw)) {
      return { kind: "resolution", body: "", citations, suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const schema: object = JSON.parse(readFileSync("engine/schema/draft.schema.json", "utf8"));
    const content: string = (raw as ChatResponse).content;
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return await repairDraft(system, content, schema, citations, traceId, degradedCarry);
    }
    const res = validate(schema, parsed);
    if (res.valid) {
      return markerCheck(parsed, citations, degradedCarry);
    }
    return await repairDraft(system, content, schema, citations, traceId, degradedCarry, res.errors);
  } catch {
    return { kind: "resolution", body: "", citations, suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
  }
}

async function repairDraft(
  system: string,
  badText: string,
  schema: object,
  citations: Citation[],
  traceId: string,
  degradedCarry: boolean,
  errors?: Array<{ path: string; message: string; code: string }>,
): Promise<ResolutionDraft> {
  try {
    const repairPrompt: string = renderRepairPrompt(errors ?? [], badText);
    const raw2 = await chat({
      model: MODELS.super,
      messages: [
        { role: "system", content: system },
        { role: "user", content: repairPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      label: "draft",
      traceId,
    });
    if (isDegradedResult(raw2)) {
      return { kind: "resolution", body: "", citations, suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    let parsed2: unknown;
    try {
      parsed2 = JSON.parse((raw2 as ChatResponse).content);
    } catch {
      return echoInvalid(citations, degradedCarry, "schema");
    }
    const res2 = validate(schema, parsed2);
    if (!res2.valid) {
      return echoInvalid(citations, degradedCarry, "schema");
    }
    return markerCheck(parsed2, citations, degradedCarry);
  } catch {
    return echoInvalid(citations, degradedCarry, "degraded");
  }
}

function markerCheck(parsed: unknown, citations: Citation[], degradedCarry: boolean): ResolutionDraft {
  const rec = parsed as { body?: unknown; suggested_first_action?: unknown; cited_indices?: unknown };
  const body: string = typeof rec.body === "string" ? rec.body : "";
  const action: string = typeof rec.suggested_first_action === "string" ? rec.suggested_first_action : "";
  const indices: unknown = rec.cited_indices;
  const markers: number[] = [];
  const re = /\[(\d+)\]/g;
  for (const text of [body, action]) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      markers.push(Number(m[1]));
    }
  }
  const validNums: number[] = markers.filter((n) => n >= 1 && n <= citations.length);
  const crossCheck: boolean =
    Array.isArray(indices) &&
    indices.length >= 1 &&
    (indices as unknown[]).every((n) => typeof n === "number" && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= citations.length);
  if (markers.length === 0 || validNums.length === 0 || !crossCheck) {
    return { kind: "resolution", body, citations, suggested_first_action: action, valid: false, invalid_reason: "no_citation", degraded: degradedCarry };
  }
  return { kind: "resolution", body, citations, suggested_first_action: action, valid: true, degraded: degradedCarry };
}

export async function draftPing(
  ticket: Ticket,
  kind: "ping" | "followup",
  traceId: string,
): Promise<ResolutionDraft> {
  try {
    const degradedCarry: boolean = CONFIG.forcedDegraded === true;
    let tpl: string;
    try {
      tpl = readFileSync("engine/prompts/system.ping.md", "utf8");
    } catch {
      return { kind, body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const system: string = tpl
      .replaceAll("{{kind}}", kind)
      .replaceAll("{{ticket_subject}}", ticket.subject)
      .replaceAll("{{ticket_body}}", ticket.body.slice(0, 800));
    const user: string =
      kind === "ping"
        ? `Write a one-paragraph acknowledgement for ticket '${ticket.subject}'. No citations, no steps, under 80 words.`
        : `Write a one-paragraph status follow-up for ticket '${ticket.subject}'. No citations, no steps, under 80 words.`;
    const fitted = fit(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      {
        model_profile: "generic-heuristic",
        context_window: MODELS.nanoContextTokens - 200,
        reserved_output: 200,
      },
    );
    if (fitted.buffer.length === 0) {
      return { kind, body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const raw = await chat({
      model: MODELS.nano,
      messages: fitted.buffer.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
      temperature: 0.3,
      max_tokens: 200,
      label: "ping",
      traceId,
    });
    if (isDegradedResult(raw)) {
      return { kind, body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    const body: string = (raw as ChatResponse).content.trim().slice(0, 1000);
    if (body === "") {
      return { kind, body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
    }
    return { kind, body, citations: [], suggested_first_action: "", valid: true, degraded: degradedCarry };
  } catch {
    return { kind, body: "", citations: [], suggested_first_action: "", valid: false, invalid_reason: "degraded", degraded: true };
  }
}
