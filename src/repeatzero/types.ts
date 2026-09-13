import type { TaxonomyId } from "./taxonomy.js";
export type { TaxonomyId };

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  requester: string;
  created_at: string;
  thread?: TicketMessage[];
}

export interface TicketMessage {
  author: "requester" | "agent" | "system";
  body: string;
  at: string;
}

export interface RunbookDoc {
  id: string;
  title: string;
  url: string;
  taxonomy: TaxonomyId;
  body: string;
  updated_at: string;
}

export interface RetrievalCandidate {
  doc: RunbookDoc;
  score: number;
  matched_terms: string[];
}

export type DecisionReasonCode =
  | "below_confidence"
  | "no_citation"
  | "high_risk_taxonomy"
  | "novel"
  | "degraded_input"
  | "within_policy";

export interface TicketClassification {
  label: "repeat" | "novel";
  taxonomy: TaxonomyId | null;
  confidence: number;
  rationale: string;
  degraded: boolean;
  degradation_reason?: string;
}

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  source: "tavily" | "corpus";
  retrieved_at: string;
}

export interface ResolutionDraft {
  kind: "resolution" | "ping" | "followup";
  body: string;
  citations: Citation[];
  suggested_first_action: string;
  valid: boolean;
  invalid_reason?: "no_citation" | "schema" | "degraded";
  degraded: boolean;
}

export interface TriageDecision {
  action: "auto_send" | "escalate";
  reason_code: DecisionReasonCode;
  explanation: string;
  thresholds_applied: { confidence: number; min_citations: number; risk: "low" | "medium" | "high" };
}

export interface LedgerCall {
  provider: "nebius-token-factory" | "tavily";
  model: string | null;
  label: string;
  input_tokens: number | null;
  output_tokens: number | null;
  at: string;
}

export interface TicketLedgerEntry {
  trace_id: string;
  ticket_id: string;
  calls: LedgerCall[];
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
  tavily_calls: number;
}

export interface TriageResult {
  trace_id: string;
  ticket: Ticket;
  classification: TicketClassification;
  citations: Citation[];
  draft: ResolutionDraft;
  decision: TriageDecision;
  ledger: TicketLedgerEntry;
  degraded: boolean;
}
