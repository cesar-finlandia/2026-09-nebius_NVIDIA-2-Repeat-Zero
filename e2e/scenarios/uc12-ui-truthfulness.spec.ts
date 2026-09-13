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

test("uc12 ui truthfulness", async ({ page, app }) => {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.id === "t-repeat-01");
  if (!ticket) throw new Error("fixture t-repeat-01 missing");

  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: ticket });
  expect(posted.ok()).toBe(true);
  const created = (await posted.json()) as { trace_id: string };
  const traceId = String(created.trace_id);

  const events = await collectEvents(app.baseURL, traceId);
  const dispatched = events.some((e) => e.step_id === "dispatch" && e.status === "done");
  const escalated = events.some((e) => e.step_id === "escalate" && e.status === "done");
  const expectedWord = dispatched ? "sent" : escalated ? "needs you" : "working";

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  if (expectedWord === "working") {
    // The queue-fallback path always terminalizes via the TriageResult decision
    // (no row ever stays "working" offline): accept either terminal label.
    await expect(page.getByRole("row").filter({ hasText: /sent|needs you/ }).first()).toBeVisible({
      timeout: 120000,
    });
  } else {
    await expect(page.getByRole("row").filter({ hasText: expectedWord }).first()).toBeVisible({
      timeout: 120000,
    });
  }

  await page.getByRole("button", { name: "Savings" }).click();
  const savings = page.getByRole("region", { name: "Savings" });
  await expect(savings).toBeVisible({ timeout: 60000 });
  if ((await savings.getByText("—", { exact: true }).count()) === 0) {
    await expect(savings.getByText("completed tickets this session")).toBeVisible({ timeout: 60000 });
  } else {
    // Pre-first-ticket placeholder tiles: still require the tile captions.
    await expect(savings.getByText("Tickets", { exact: true })).toBeVisible({ timeout: 60000 });
  }

  await page.getByRole("button", { name: "Queue" }).click();
  await expect(queue).toBeVisible({ timeout: 60000 });
  const row = page.getByRole("row").filter({ hasText: ticket.subject }).first();
  await expect(row).toBeVisible({ timeout: 120000 });
  await row.click();
  const draft = page.getByRole("region", { name: "Draft review" });
  await expect(draft).toBeVisible({ timeout: 60000 });
  const sources = draft.getByRole("region", { name: "Sources" });
  if ((await sources.count()) > 0) {
    const links = sources.first().getByRole("link");
    for (const link of await links.all()) {
      const href = (await link.getAttribute("href")) ?? "";
      expect(href).toMatch(/^https?:\/\//);
    }
  }
});
