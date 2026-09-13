import type { ReadmeInput, ReadmeOutput, SavingsSnapshot } from "./types.js";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function buildReadme(input: ReadmeInput): ReadmeOutput {
  const demoUrl: string = typeof input.demoUrl === "string" ? input.demoUrl : "";
  const repoUrl: string = typeof input.repoUrl === "string" ? input.repoUrl : "";
  const superId: string = typeof input.models?.super === "string" ? input.models.super : "";
  const nanoId: string = typeof input.models?.nano === "string" ? input.models.nano : "";
  const ledger: SavingsSnapshot = {
    tickets: num((input.ledgerExample as SavingsSnapshot | undefined)?.tickets),
    auto_sent: num((input.ledgerExample as SavingsSnapshot | undefined)?.auto_sent),
    escalated: num((input.ledgerExample as SavingsSnapshot | undefined)?.escalated),
    deflection_rate: num((input.ledgerExample as SavingsSnapshot | undefined)?.deflection_rate),
    usd_per_ticket: num((input.ledgerExample as SavingsSnapshot | undefined)?.usd_per_ticket),
    hours_saved: num((input.ledgerExample as SavingsSnapshot | undefined)?.hours_saved),
  };
  const pending: boolean =
    input.ledgerExample === undefined ||
    input.ledgerExample === null ||
    typeof (input.ledgerExample as unknown as Record<string, unknown>)["tickets"] !== "number";
  const lines: string[] = [];
  lines.push("# RepeatZero — cited repeat-ticket triage");
  lines.push("");
  lines.push("## Prerequisites");
  lines.push("- Node 20 (see `.nvmrc`)");
  lines.push("- Python 3 (see `.python-version`)");
  lines.push("");
  lines.push("## Environment");
  lines.push("- `NEBIUS_API_KEY` — required at runtime, get via Token Factory promo form");
  lines.push("- `NEBIUS_BASE_URL` — default `https://api.tokenfactory.us-central1.nebius.com/v1/`");
  lines.push("- `TAVILY_API_KEY` — required for bonus, absent means grounding returns `[]` and everything escalates");
  lines.push("- `RES_FORCED_DEGRADED=1` — offline mode");
  lines.push("- `DEPLOY_PROVIDER=docker` — Nebius Serverless Endpoint image");
  lines.push("- `REPEATZERO_LEDGER_PATH` — default `artifacts/cost-store.json`");
  lines.push("Do not commit secrets.");
  lines.push("");
  lines.push("## Install");
  lines.push("```");
  lines.push("npm ci");
  lines.push("pip install -e .");
  lines.push("```");
  lines.push("");
  lines.push("## Offline (no keys)");
  lines.push("```");
  lines.push("RES_FORCED_DEGRADED=1 npm run golden:path");
  lines.push("```");
  lines.push("Works with zero credentials.");
  lines.push("");
  lines.push("## Live run");
  lines.push("Requires both keys.");
  lines.push("```");
  lines.push("npm run triage:demo");
  lines.push("```");
  lines.push("");
  lines.push("## Deploy");
  lines.push("```");
  lines.push("DEPLOY_PROVIDER=docker npm run deploy");
  lines.push("```");
  lines.push("");
  lines.push("## Nightly job");
  lines.push("```");
  lines.push("npm run reindex:job");
  lines.push("```");
  lines.push("");
  lines.push("## Models");
  lines.push(
    `Nemotron 3 Super ${superId} for classification and cited drafting; Nemotron 3 Nano ${nanoId} for pings and follow-ups; Nebius Token Factory OpenAI-compatible chat-completions API; Nebius Serverless Endpoint; Nebius Serverless Job; functional runtime Tavily call.`,
  );
  lines.push("");
  lines.push("## Unit economics (local estimate, not billing)");
  lines.push(`- tickets: ${ledger.tickets} (local estimate, not billing)`);
  lines.push(`- auto_sent: ${ledger.auto_sent} (local estimate, not billing)`);
  lines.push(`- escalated: ${ledger.escalated} (local estimate, not billing)`);
  lines.push(`- deflection_rate: ${ledger.deflection_rate} (local estimate, not billing)`);
  lines.push(`- usd_per_ticket: ${ledger.usd_per_ticket} (local estimate, not billing)`);
  lines.push(`- hours_saved: ${ledger.hours_saved} (local estimate, not billing)`);
  if (pending) {
    lines.push("ledger_estimate_pending");
  }
  lines.push("");
  lines.push(`Demo: ${demoUrl} (live and free through judging)`);
  lines.push(`Repo: ${repoUrl}`);
  lines.push("");
  lines.push("Submission deadline: 2026-10-30 17:00 UTC (10:00 PDT).");
  return {
    path: "README.md",
    content: lines.join("\n"),
    sections: ["prerequisites", "env", "install", "offline", "live", "deploy", "job", "models", "bonus"],
  };
}
