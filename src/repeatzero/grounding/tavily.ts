import { withResilience } from "../../resilience/index.js";
import { isDegradedResult } from "../../resilience/index.js";
import { CONFIG } from "../config.js";
import { recordCall } from "../ledger/index.js";
import { TAXONOMY } from "../taxonomy.js";
import type { Citation, RetrievalCandidate, Ticket, TicketClassification } from "../types.js";

export function buildQuery(
  ticket: Ticket,
  classification: TicketClassification,
  candidates: RetrievalCandidate[],
): string {
  let subject: string = typeof ticket.subject === "string" ? ticket.subject : "";
  subject = subject.replace(/^\[?[A-Z]+-\d+\]?\s*/, "");
  const clean: string = subject.trim().replace(/\s+/g, " ");
  let taxLabel = "";
  if (classification.taxonomy !== null) {
    for (const entry of TAXONOMY) {
      if (entry.id === classification.taxonomy) {
        taxLabel = entry.label;
        break;
      }
    }
  }
  let topTitle = "";
  if (candidates.length > 0) {
    const first = candidates[0] as RetrievalCandidate;
    topTitle = first.doc.title.trim().replace(/\s+/g, " ");
  }
  const parts: string[] = [];
  if (clean !== "") parts.push(clean);
  if (taxLabel !== "") parts.push(taxLabel);
  if (topTitle !== "") parts.push(topTitle);
  const joined: string = parts.join(" ");
  if (joined.length <= 380) return joined;
  const window: string = joined.slice(0, 381);
  const lastSpace: number = window.lastIndexOf(" ");
  if (lastSpace > 0) return joined.slice(0, lastSpace);
  return joined.slice(0, 380);
}

let warnedMissingKey = false;

function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const scheme: string = parsed.protocol.toLowerCase();
    let host: string = parsed.hostname.toLowerCase();
    let port: string = parsed.port;
    if ((scheme === "https:" && port === "443") || (scheme === "http:" && port === "80")) {
      port = "";
    }
    let path: string = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    const params = new URLSearchParams(parsed.search);
    const kept: Array<[string, string]> = [];
    params.forEach((value, key) => {
      if (!key.startsWith("utm_")) kept.push([key, value]);
    });
    kept.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const search: string = kept.length > 0 ? "?" + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&") : "";
    return `${scheme}//${host}${port !== "" ? ":" + port : ""}${path}${search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function ground(
  ticket: Ticket,
  classification: TicketClassification,
  candidates: RetrievalCandidate[],
  traceId?: string,
): Promise<Citation[]> {
  try {
    if (classification.label !== "repeat") {
      return [];
    }
    if (CONFIG.tavilyApiKey === "") {
      if (!warnedMissingKey) {
        warnedMissingKey = true;
        console.warn("[tavily] TAVILY_API_KEY missing; grounding degraded");
      }
      return [];
    }
    const query: string = buildQuery(ticket, classification, candidates);
    const body = {
      api_key: CONFIG.tavilyApiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    };
    const doFetch = (): Promise<Response> =>
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });
    const guarded = withResilience(doFetch, {
      timeout_ms: 12000,
      retries: 1,
      backoff: { policy: "exponential", base_ms: 400 },
      fallback_chain: { order: ["cache", "none"] },
    });
    let raw: Response | import("../../resilience/index.js").DegradedResult<Response>;
    try {
      raw = await guarded();
    } catch {
      return [];
    }
    if (isDegradedResult(raw)) {
      return [];
    }
    // Metering key: explicit pipeline trace id wins; legacy ticket-carried
    // id next; ticket id last (standalone callers).
    const meter: string = traceId ?? (ticket as { traceId?: string }).traceId ?? ticket.id;
    try {
      recordCall(meter, {
        provider: "tavily",
        model: null,
        label: "ground",
        input_tokens: null,
        output_tokens: null,
        at: new Date().toISOString(),
      });
    } catch {
      // ledger failure never fails grounding
    }
    let json: unknown;
    try {
      json = await (raw as Response).json();
    } catch {
      return [];
    }
    const results: unknown = (json as { results?: unknown }).results;
    if (!Array.isArray(results)) {
      return [];
    }
    const out: Citation[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      const rec = r as { url?: unknown; title?: unknown; content?: unknown };
      const url: string = String(rec.url ?? "").trim();
      const title: string = String(rec.title ?? "").trim();
      const content: string = String(rec.content ?? "");
      if (url === "" || title === "") {
        continue;
      }
      let snippet: string = content.replace(/\s+/g, " ").trim();
      if (snippet.length > 240) {
        const window: string = snippet.slice(0, 241);
        const lastSpace: number = window.lastIndexOf(" ");
        snippet = lastSpace > 0 ? snippet.slice(0, lastSpace) : snippet.slice(0, 240);
      }
      const key: string = normaliseUrl(url);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ url, title, snippet, source: "tavily", retrieved_at: new Date().toISOString() });
    }
    return out;
  } catch {
    return [];
  }
}
