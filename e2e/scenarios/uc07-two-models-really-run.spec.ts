import { readFileSync } from "node:fs";
import { test, expect } from "../fixtures/app.js";

interface FixtureTicket {
  id: string;
  subject: string;
  body: string;
  requester: string;
  created_at: string;
}

function loadTickets(): FixtureTicket[] {
  const raw = JSON.parse(readFileSync("fixtures/tickets.json", "utf8")) as Array<Record<string, unknown>>;
  return raw.map((t) => ({
    id: String(t["id"]),
    subject: String(t["subject"]),
    body: String(t["body"]),
    requester: String(t["requester"]),
    created_at: String(t["created_at"]),
  }));
}

interface LedgerCall {
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

test("uc07 two models really run", async ({ page, app }) => {
  const health = await page.request.get(`${app.baseURL}/healthz`);
  expect(health.ok()).toBe(true);
  if (!process.env["NEBIUS_API_KEY"]) {
    test.fixme(true, "live-skipped: NEBIUS_API_KEY absent");
    return;
  }
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.id === "t-repeat-01");
  if (!ticket) throw new Error("fixture t-repeat-01 missing");
  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: ticket });
  expect(posted.ok()).toBe(true);
  const created = (await posted.json()) as {
    ledger: { calls: LedgerCall[]; total_input_tokens: number; total_output_tokens: number };
  };
  const models = JSON.parse(readFileSync("config/models.resolved.json", "utf8")) as {
    super: string;
    nano: string;
  };
  const known: string[] = [models.super, models.nano];
  const seen: string[] = [];
  for (const call of created.ledger.calls) {
    if (typeof call.model === "string" && call.model.length > 0 && !seen.includes(call.model)) {
      seen.push(call.model);
    }
  }
  expect(seen.length).toBeGreaterThanOrEqual(2);
  for (const id of seen) {
    expect(known).toContain(id);
  }
  expect(created.ledger.total_input_tokens).toBeGreaterThan(0);
  expect(created.ledger.total_output_tokens).toBeGreaterThan(0);
});
