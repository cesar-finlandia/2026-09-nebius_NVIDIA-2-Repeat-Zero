import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures/app.js";

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

test("smoke", async ({ page, app }) => {
  const BASE: string = app.baseURL;
  const health: Response = await fetch(`${BASE}/healthz`);
  expect(health.ok).toBe(true);
  const healthJson: { ok: boolean; models: string[] } = (await health.json()) as { ok: boolean; models: string[] };
  expect(healthJson.ok).toBe(true);
  expect(Array.isArray(healthJson.models)).toBe(true);

  await page.goto(`${BASE}/`);
  await expect(page.getByRole("button", { name: "Queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draft review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Escalations" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Savings" })).toBeVisible();

  // Queue rows render ONLY from the GET /api/queue backfill (the live SSE
  // stream is empty in tests), so POST a SINGLE ticket object first — posting
  // the whole array returns 400.
  const tickets = loadTickets();
  const ticket: FixtureTicket | undefined =
    tickets.find((t) => t.id === "t-repeat-01") ?? tickets[0];
  if (!ticket) throw new Error("no fixture tickets");
  const posted = await page.request.post(`${BASE}/api/tickets`, { data: ticket });
  expect(posted.ok()).toBe(true);

  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  const rowCount: number = await queue.getByRole("row").count();
  // One header row + one row per ticket.
  const ticketCount: number = Math.max(0, rowCount - 1);
  expect(ticketCount).toBeGreaterThanOrEqual(1);

  const sources = page.getByRole("region", { name: "Sources" });
  let citedCount = 0;
  if ((await sources.count()) > 0) {
    citedCount = await sources.first().getByRole("link").count();
  }
  console.log(`smoke-ok ${BASE} ${ticketCount} ${citedCount}`);
});
