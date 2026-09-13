import type { Citation, ResolutionDraft, TicketClassification, TriageDecision } from "../types.js";
import type { PolicyConfig } from "../config.js";
import type { TaxonomyId } from "../taxonomy.js";
import { riskClassOf } from "../taxonomy.js";
import { POLICY_DEFAULTS } from "../config.js";

export function decide(
  classification: TicketClassification,
  citations: Citation[],
  draft: ResolutionDraft,
  policy?: PolicyConfig,
): TriageDecision {
  const effMinConfidence: number =
    policy !== undefined &&
    policy !== null &&
    typeof (policy as PolicyConfig).min_confidence === "number" &&
    Number.isFinite((policy as PolicyConfig).min_confidence) &&
    (policy as PolicyConfig).min_confidence >= 0 &&
    (policy as PolicyConfig).min_confidence <= 1
      ? (policy as PolicyConfig).min_confidence
      : POLICY_DEFAULTS.min_confidence;
  const effMinCitations: number =
    policy !== undefined &&
    policy !== null &&
    typeof (policy as PolicyConfig).min_citations === "number" &&
    Number.isInteger((policy as PolicyConfig).min_citations) &&
    (policy as PolicyConfig).min_citations >= 0
      ? (policy as PolicyConfig).min_citations
      : POLICY_DEFAULTS.min_citations;
  const rawClasses: unknown = (policy as PolicyConfig | undefined)?.auto_send_risk_classes;
  const effRiskClasses: Array<"low" | "medium" | "high"> =
    Array.isArray(rawClasses) &&
    rawClasses.length > 0 &&
    (rawClasses as unknown[]).every((r) => r === "low" || r === "medium" || r === "high")
      ? [...(rawClasses as Array<"low" | "medium" | "high">)]
      : [...POLICY_DEFAULTS.auto_send_risk_classes];

  const cls = classification as TicketClassification | null | undefined;
  const drf = draft as ResolutionDraft | null | undefined;
  const label: "repeat" | "novel" =
    cls !== null && cls !== undefined && (cls.label === "repeat" || cls.label === "novel") ? cls.label : "novel";
  const confidence: number =
    cls !== null && cls !== undefined && typeof cls.confidence === "number" && Number.isFinite(cls.confidence)
      ? cls.confidence
      : Number.NaN;
  const taxonomy: string | null =
    cls !== null && cls !== undefined && (typeof cls.taxonomy === "string" || cls.taxonomy === null)
      ? (cls.taxonomy as string | null)
      : null;
  const classDegraded: boolean = cls?.degraded === true;
  const draftDegraded: boolean = drf?.degraded === true;
  const draftValid: boolean = drf?.valid === true;
  const citationCount: number = Array.isArray(citations) ? citations.length : 0;

  let risk: "low" | "medium" | "high";
  if (taxonomy === null) {
    risk = "high";
  } else {
    try {
      const r: string = riskClassOf(taxonomy as TaxonomyId);
      risk = r === "low" || r === "medium" || r === "high" ? r : "high";
    } catch {
      risk = "high";
    }
  }
  const thresholdsApplied = { confidence: effMinConfidence, min_citations: effMinCitations, risk };

  if (cls == null || drf == null || classDegraded || draftDegraded) {
    return {
      action: "escalate",
      reason_code: "degraded_input",
      explanation: "Input is degraded; escalating for human review.",
      thresholds_applied: thresholdsApplied,
    };
  }
  if (label === "novel") {
    return {
      action: "escalate",
      reason_code: "novel",
      explanation: "Ticket is novel; escalating for human review.",
      thresholds_applied: thresholdsApplied,
    };
  }
  if (draftValid === false || citationCount < effMinCitations) {
    return {
      action: "escalate",
      reason_code: "no_citation",
      explanation: `Draft has ${citationCount} citation(s); at least ${effMinCitations} required, or the draft is invalid.`,
      thresholds_applied: thresholdsApplied,
    };
  }
  if (taxonomy === null || !effRiskClasses.includes(risk)) {
    return {
      action: "escalate",
      reason_code: "high_risk_taxonomy",
      explanation: `Taxonomy risk "${risk}" is not in the auto-send list [${effRiskClasses.join(", ")}].`,
      thresholds_applied: thresholdsApplied,
    };
  }
  if (!(confidence >= effMinConfidence)) {
    const fmt = (x: number): string => x.toFixed(2);
    return {
      action: "escalate",
      reason_code: "below_confidence",
      explanation: `Confidence ${fmt(confidence)} is below the ${fmt(effMinConfidence)} auto-send threshold.`,
      thresholds_applied: thresholdsApplied,
    };
  }
  {
    const fmt = (x: number): string => x.toFixed(2);
    return {
      action: "auto_send",
      reason_code: "within_policy",
      explanation: `All auto-send checks passed: confidence ${fmt(confidence)} >= ${fmt(effMinConfidence)}, ${citationCount} citation(s), ${risk}-risk taxonomy.`,
      thresholds_applied: thresholdsApplied,
    };
  }
}
