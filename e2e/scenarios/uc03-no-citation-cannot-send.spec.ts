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

test("uc03 no citation cannot send", async ({ page, app }) => {
  const tickets = loadTickets();
  const novel = tickets.find((t) => t.id === "t-novel-01");
  if (!novel) throw new Error("fixture t-novel-01 missing");

  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: novel });
  expect(posted.ok()).toBe(true);

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  const row = page.getByRole("row").filter({ hasText: novel.subject }).first();
  await expect(row).toBeVisible({ timeout: 120000 });
  await row.click();

  const draft = page.getByRole("region", { name: "Draft review" });
  await expect(draft).toBeVisible({ timeout: 60000 });
  await expect(draft.getByText("This draft has no source, so it cannot be sent.")).toBeVisible({ timeout: 60000 });
  await expect(draft.getByRole("button", { name: "Send reply" })).toHaveCount(0);
});
