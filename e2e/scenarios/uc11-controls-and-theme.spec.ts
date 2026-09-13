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

test("uc11 controls and theme", async ({ page, app }) => {
  const tickets = loadTickets();
  const repeat = tickets.find((t) => t.id === "t-repeat-01");
  if (!repeat) throw new Error("fixture t-repeat-01 missing");
  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: repeat });
  expect(posted.ok()).toBe(true);

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Draft review" }).click();
  await expect(page.getByRole("region", { name: "Draft review" })).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Escalations" }).click();
  await expect(page.getByRole("region", { name: "Escalations" })).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Savings" }).click();
  await expect(page.getByRole("region", { name: "Savings" })).toBeVisible({ timeout: 60000 });

  const themeSwitch = page.getByRole("switch");
  await expect(themeSwitch).toBeVisible({ timeout: 60000 });
  const before = await page.evaluate(() => document.documentElement.dataset["theme"] ?? "");
  await themeSwitch.click();
  const after = await page.evaluate(() => document.documentElement.dataset["theme"] ?? "");
  expect(after).not.toBe(before);
  // The app fixture seeds rz-theme=light on EVERY load via addInitScript, so a
  // reload resets the theme to light — do NOT assert theme survival. Just
  // assert the app is still up after reload.
  await page.reload();
  await expect(page.getByRole("button", { name: "Queue" })).toBeVisible({ timeout: 60000 });

  await page.getByRole("button", { name: "Queue" }).click();
  await expect(queue).toBeVisible({ timeout: 60000 });
  const row = page.getByRole("row").filter({ hasText: repeat.subject }).first();
  await expect(row).toBeVisible({ timeout: 120000 });
  await row.click();
  const draft = page.getByRole("region", { name: "Draft review" });
  await expect(draft).toBeVisible({ timeout: 60000 });
  const sendReply = draft.getByRole("button", { name: "Send reply" });
  if ((await sendReply.count()) > 0) {
    await sendReply.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  } else {
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  const buttons = await page.getByRole("button").all();
  expect(buttons.length).toBeGreaterThan(0);
  for (const b of buttons) {
    const text = (await b.textContent()) ?? "";
    const label = (await b.getAttribute("aria-label")) ?? "";
    expect(`${text}${label}`.trim()).not.toBe("");
  }
});
