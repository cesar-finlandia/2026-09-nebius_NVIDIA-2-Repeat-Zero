import type { SubmissionInput, SubmissionOutput } from "./types.js";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function buildSubmissionDoc(input: SubmissionInput): SubmissionOutput {
  const title: string =
    typeof input.title === "string" && input.title.trim() !== "" ? input.title : "RepeatZero";
  const pitch: string =
    typeof input.pitch === "string" && input.pitch.trim() !== ""
      ? input.pitch
      : "Cited answers for repeat tickets, for internal IT support leads.";
  const demoUrl: string = typeof input.demoUrl === "string" ? input.demoUrl : "";
  const repoUrl: string = typeof input.repoUrl === "string" ? input.repoUrl : "";
  const superId: string = typeof input.models?.super === "string" ? input.models.super : "";
  const nanoId: string = typeof input.models?.nano === "string" ? input.models.nano : "";
  const hasSavings: boolean =
    input.savings !== undefined &&
    input.savings !== null &&
    typeof (input.savings as unknown as Record<string, unknown>)["tickets"] === "number";
  const s = {
    tickets: num((input.savings as unknown as Record<string, unknown> | undefined)?.["tickets"] as unknown),
    auto_sent: num((input.savings as unknown as Record<string, unknown> | undefined)?.["auto_sent"] as unknown),
    escalated: num((input.savings as unknown as Record<string, unknown> | undefined)?.["escalated"] as unknown),
    deflection_rate: num((input.savings as unknown as Record<string, unknown> | undefined)?.["deflection_rate"] as unknown),
    usd_per_ticket: num((input.savings as unknown as Record<string, unknown> | undefined)?.["usd_per_ticket"] as unknown),
    hours_saved: num((input.savings as unknown as Record<string, unknown> | undefined)?.["hours_saved"] as unknown),
  };
  const endpoint: string =
    typeof input.tavilyEvidence?.endpoint === "string" ? input.tavilyEvidence.endpoint : "POST https://api.tavily.com/search";
  const citations: number =
    typeof input.tavilyEvidence?.citations === "number" ? input.tavilyEvidence.citations : 0;
  const exampleQuery: string =
    typeof input.tavilyEvidence?.example_query === "string" ? input.tavilyEvidence.example_query : "";
  const fb = (v: unknown): string =>
    typeof v === "string" && v.trim() !== "" ? v : "Pending final judging run; see README offline path.";
  const feedback = {
    tokenFactory: fb((input.feedback as unknown as Record<string, unknown> | undefined)?.["tokenFactory"] as unknown),
    nebiusCloud: fb((input.feedback as unknown as Record<string, unknown> | undefined)?.["nebiusCloud"] as unknown),
    nvidiaModels: fb((input.feedback as unknown as Record<string, unknown> | undefined)?.["nvidiaModels"] as unknown),
  };
  const modelsLine = `Nemotron 3 Super ${superId} for classification and cited drafting; Nemotron 3 Nano ${nanoId} for pings and follow-ups; Nebius Token Factory OpenAI-compatible chat-completions API; Nebius Serverless Endpoint; Nebius Serverless Job; functional runtime Tavily call.`;
  const sections: string[] = [
    "title",
    "track",
    "what-it-does",
    "how-we-built-it",
    "token-factory-acceleration",
    "non-obvious-use",
    "unit-economics",
    "tavily-bonus",
    "uniqueness",
    "feedback",
    "urls",
  ];
  const parts: string[] = [];
  parts.push(`# ${title}\n\n${pitch}`);
  parts.push(
    `# Track: Best Apps and Agents\n\nA queue tool an internal IT lead would use daily, inside the chat workflow they already live in.`,
  );
  parts.push(
    `# What it does\n\n- classify repeat-vs-novel\n- ground repeat candidates with live web search\n- draft cited resolution\n- deterministic policy gate auto-send vs escalate`,
  );
  parts.push(`# How we built it\n\n${modelsLine}`);
  parts.push(
    `# Token Factory acceleration\n\nOne OpenAI-compatible endpoint let a heavy reasoner and a cheap model share a code path, so routing became a config value rather than a second integration.`,
  );
  parts.push(
    `# Non-obvious use\n\nReasoning-budget routing plus no-citation-no-send: the model proposes, a deterministic policy engine disposes.`,
  );
  const econLines = [
    `- tickets: ${s.tickets} (local estimate, not billing)`,
    `- auto_sent: ${s.auto_sent} (local estimate, not billing)`,
    `- escalated: ${s.escalated} (local estimate, not billing)`,
    `- deflection_rate: ${s.deflection_rate} (local estimate, not billing)`,
    `- usd_per_ticket: ${s.usd_per_ticket} (local estimate, not billing)`,
    `- hours_saved: ${s.hours_saved} (local estimate, not billing)`,
  ];
  if (!hasSavings) {
    econLines.push("ledger_estimate_pending");
  }
  parts.push(`# Unit economics\n\n${econLines.join("\n")}`);
  parts.push(
    `# Tavily bonus\n\nFunctional runtime ${endpoint} with TAVILY_API_KEY; ${citations} citations on the example query "${exampleQuery}".`,
  );
  parts.push(
    `# Uniqueness vs entry 1\n\nDifferent product (repeat-ticket answering vs merge-readiness), different track, different repository, different video, different evidence trail. The multiple-submission rule allows two entries only if each is unique and substantially different.`,
  );
  parts.push(
    `# Feedback\n\n## Token Factory\n\n${feedback.tokenFactory}\n\n## Nebius AI Cloud\n\n${feedback.nebiusCloud}\n\n## NVIDIA models\n\n${feedback.nvidiaModels}`,
  );
  parts.push(`# Demo and repo\n\nDemo: ${demoUrl} (live and free through judging)\nRepo: ${repoUrl}\n\nSubmission deadline: 2026-10-30 17:00 UTC (10:00 PDT).`);
  return { path: "design_documents/submission.md", content: parts.join("\n\n---\n\n"), sections };
}
