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

test("uc02 cited draft review", async ({ page, app }) => {
  const tickets = loadTickets();
  const repeat = tickets.find((t) => t.id === "t-repeat-01");
  if (!repeat) throw new Error("fixture t-repeat-01 missing");

  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: repeat });
  expect(posted.ok()).toBe(true);

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  const row = page.getByRole("row").filter({ hasText: repeat.subject }).first();
  await expect(row).toBeVisible({ timeout: 120000 });
  await row.click();

  const draft = page.getByRole("region", { name: "Draft review" });
  await expect(draft).toBeVisible({ timeout: 60000 });
  // Offline every ticket classifies novel (repeat labels never happen offline).
  await expect(draft.getByText(/novel/).first()).toBeVisible({ timeout: 60000 });
  // Honest offline behavior: uncited drafts cannot be sent; cited drafts show links.
  const sendReply = draft.getByRole("button", { name: "Send reply" });
  if ((await sendReply.count()) > 0) {
    const sources = draft.getByRole("region", { name: "Sources" }).first();
    await expect(sources).toBeVisible({ timeout: 60000 });
    const links = sources.getByRole("link");
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      const href = (await link.getAttribute("href")) ?? "";
      expect(href).toMatch(/^https?:\/\//);
    }
  } else {
    await expect(draft.getByText("This draft has no source, so it cannot be sent.")).toBeVisible({
      timeout: 60000,
    });
  }
});
