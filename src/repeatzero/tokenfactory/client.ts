import type { DegradedResult } from "../../resilience/index.js";
import { isDegradedResult, withResilience } from "../../resilience/index.js";
import { countMessage } from "../../context/index.js";
import { CONFIG } from "../config.js";
import { recordCall } from "../ledger/index.js";
import type { LedgerCall } from "../types.js";

export type ChatRequest = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
  label: string;
  traceId: string;
};

export type ChatResponse = {
  content: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  finish_reason: string;
};

export async function listModels(): Promise<string[]> {
  try {
    const baseUrl: string = CONFIG.nebiusBaseUrl;
    const apiKey: string = CONFIG.nebiusApiKey;
    const url: string = baseUrl.endsWith("/") ? baseUrl + "models" : baseUrl + "/models";
    const doFetch = async (): Promise<string[]> => {
      const resp: Response = await fetch(url, {
        method: "GET",
        headers: { Authorization: "Bearer " + apiKey },
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok === false) {
        throw new Error("tf-models-http-" + resp.status);
      }
      const raw: unknown = await resp.json();
      if (
        typeof raw !== "object" ||
        raw === null ||
        !("data" in raw) ||
        !Array.isArray((raw as { data: unknown }).data)
      ) {
        throw new Error("tf-models-shape");
      }
      const data: Array<unknown> = (raw as { data: Array<unknown> }).data;
      return data
        .filter((d: unknown) => typeof (d as { id?: unknown } | null | undefined)?.id === "string")
        .map((d: unknown) => (d as { id: string }).id);
    };
    const wrapped = withResilience(doFetch, {
      timeout_ms: 15000,
      retries: 1,
      backoff: { policy: "exponential", base_ms: 500 },
      fallback_chain: { order: ["cache", "none"] },
      cache_key_strategy: "auto",
    }, null as unknown as undefined);
    const result: string[] | DegradedResult<string[]> = await wrapped();
    if (isDegradedResult(result)) {
      return [];
    }
    return result;
  } catch {
    return [];
  }
}

export async function chat(req: ChatRequest): Promise<ChatResponse | DegradedResult<ChatResponse>> {
  try {
    const baseUrl: string = CONFIG.nebiusBaseUrl;
    const apiKey: string = CONFIG.nebiusApiKey;
    void CONFIG.forcedDegraded;
    const url: string = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
    };
    if (req.temperature !== undefined) {
      body["temperature"] = req.temperature;
    }
    if (req.max_tokens !== undefined) {
      body["max_tokens"] = req.max_tokens;
    }
    if (req.response_format !== undefined) {
      body["response_format"] = req.response_format;
    }
    const doFetch = async (): Promise<ChatResponse> => {
      const resp: Response = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok === false) {
        throw new Error("tf-http-" + resp.status);
      }
      const raw: unknown = await resp.json();
      const choices: unknown = (raw as { choices?: unknown }).choices;
      const choice: unknown = Array.isArray(choices) ? choices[0] : undefined;
      const content: unknown = (choice as { message?: { content?: unknown } } | null | undefined)?.message?.content;
      if (choice == null || typeof content !== "string") {
        throw new Error("tf-empty-choice");
      }
      const modelOut: string = typeof (raw as { model?: unknown }).model === "string"
        ? (raw as { model: string }).model
        : req.model;
      const finish: string = typeof (choice as { finish_reason?: unknown }).finish_reason === "string"
        ? (choice as { finish_reason: string }).finish_reason
        : "unknown";
      let inTok: number | null = typeof (raw as { usage?: { prompt_tokens?: unknown } }).usage?.prompt_tokens === "number"
        ? (raw as { usage: { prompt_tokens: number } }).usage.prompt_tokens
        : null;
      const outTok: number | null = typeof (raw as { usage?: { completion_tokens?: unknown } }).usage?.completion_tokens === "number"
        ? (raw as { usage: { completion_tokens: number } }).usage.completion_tokens
        : null;
      if (inTok === null) {
        let sum = 0;
        for (const m of req.messages) {
          sum += countMessage({ role: m.role, content: m.content }, "generic-heuristic");
        }
        inTok = sum;
      }
      const entry: LedgerCall = {
        provider: "nebius-token-factory",
        model: req.model,
        label: req.label,
        input_tokens: inTok,
        output_tokens: outTok,
        at: new Date().toISOString(),
      };
      recordCall(req.traceId, entry);
      return { content, model: modelOut, input_tokens: inTok, output_tokens: outTok, finish_reason: finish };
    };
    const wrapped = withResilience(doFetch, {
      timeout_ms: 30000,
      retries: 2,
      backoff: { policy: "exponential", base_ms: 500 },
      fallback_chain: { order: ["cache", "none"] },
      cache_key_strategy: "auto",
    }, null as unknown as undefined);
    const result: ChatResponse | DegradedResult<ChatResponse> = await wrapped();
    if (isDegradedResult(result)) {
      recordCall(req.traceId, {
        provider: "nebius-token-factory",
        model: req.model,
        label: req.label,
        input_tokens: null,
        output_tokens: null,
        at: new Date().toISOString(),
      });
      return result;
    }
    return result;
  } catch (err) {
    return {
      degraded: true,
      reason: "tfclient_internal_error",
      fallback_source: "none",
      original_error: String(err),
      data: null,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }
}
