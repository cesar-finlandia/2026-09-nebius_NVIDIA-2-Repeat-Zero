import { readFileSync } from "node:fs";
import { test, expect } from "../fixtures/app.js";
import { collectEvents } from "../fixtures/envelopes.js";

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

test("uc09 grounding bonus", async ({ page, app }) => {
  const tickets = loadTickets();
  const repeat = tickets.find((t) => t.id === "t-repeat-01");
  if (!repeat) throw new Error("fixture t-repeat-01 missing");

  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: repeat });
  expect(posted.ok()).toBe(true);
  const created = (await posted.json()) as { trace_id: string };
  const events = await collectEvents(app.baseURL, String(created.trace_id));
  const ground = events.find((e) => e.step_id === "ground" && e.status === "done");
  if (!ground) throw new Error("ground envelope missing");
  const payload = (ground.payload ?? {}) as { citations?: Array<{ source?: unknown }> };
  const citations = Array.isArray(payload.citations) ? payload.citations : [];

  if (!process.env["TAVILY_API_KEY"]) {
    await page.goto(`${app.baseURL}/`);
    await page.getByRole("button", { name: "Queue" }).click();
    const queue = page.getByRole("table", { name: "Ticket queue" });
    await expect(queue).toBeVisible({ timeout: 60000 });
    const row = page.getByRole("row").filter({ hasText: repeat.subject }).first();
    await expect(row).toBeVisible({ timeout: 120000 });
    await row.click();
    const draft = page.getByRole("region", { name: "Draft review" });
    await expect(draft).toBeVisible({ timeout: 60000 });
    if (citations.length >= 1) {
      const sources = draft.getByRole("region", { name: "Sources" }).first();
      await expect(sources).toBeVisible({ timeout: 60000 });
      await expect(sources.getByRole("link").first()).toBeVisible({ timeout: 60000 });
    } else {
      await expect(draft.getByText("This draft has no source, so it cannot be sent.")).toBeVisible({
        timeout: 60000,
      });
    }
    return;
  }

  expect(citations.length).toBeGreaterThanOrEqual(1);
  expect(citations.some((c) => c.source === "tavily")).toBe(true);
});
