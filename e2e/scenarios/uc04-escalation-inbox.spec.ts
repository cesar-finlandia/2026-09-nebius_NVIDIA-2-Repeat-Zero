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

test("uc04 escalation inbox", async ({ page, app }) => {
  const tickets = loadTickets();
  const novel = tickets.find((t) => t.id === "t-novel-01");
  if (!novel) throw new Error("fixture t-novel-01 missing");

  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: novel });
  expect(posted.ok()).toBe(true);

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Escalations" }).click();
  const inbox = page.getByRole("region", { name: "Escalations" });
  await expect(inbox).toBeVisible({ timeout: 60000 });
  // Offline the novel ticket always escalates; live it may auto-send — accept
  // either settled state, but never a half-loaded one.
  await expect(inbox.getByText(/Start here|Nothing needs you right now\./).first()).toBeVisible({
    timeout: 120000,
  });
  if ((await inbox.getByText("Start here").count()) > 0) {
    await expect(inbox.getByText("Nothing needs you right now.")).toHaveCount(0);
  } else {
    await expect(inbox.getByText("Nothing needs you right now.")).toBeVisible({ timeout: 60000 });
  }
});
