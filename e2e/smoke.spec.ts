import { test, expect } from "@playwright/test";

test("smoke", async ({ page }) => {
  const BASE: string = process.env["BASE_URL"] ?? "http://localhost:8080";
  const health: Response = await fetch(`${BASE}/healthz`);
  expect(health.ok).toBe(true);
  const healthJson: { ok: boolean; models: string[] } = (await health.json()) as { ok: boolean; models: string[] };
  expect(healthJson.ok).toBe(true);
  expect(Array.isArray(healthJson.models)).toBe(true);
  expect(healthJson.models.length).toBeGreaterThanOrEqual(0);
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("rz-theme", "light");
    } catch {
      // ignore
    }
  });
  await page.goto(`${BASE}/`);
  await expect(page.getByRole("button", { name: "Queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Draft review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Escalations" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Savings" })).toBeVisible();
  const workText = page.getByTestId("work-indicator-text");
  await expect(workText).not.toBeEmpty({ timeout: 60000 });
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  const rows = page.getByRole("row");
  const rowCount: number = await rows.count();
  const sources = page.getByRole("region", { name: "Sources" });
  let citedCount = 0;
  if ((await sources.count()) > 0) {
    citedCount = await sources.getByRole("link").count();
  }
  console.log(`smoke-ok ${BASE} ${rowCount} ${citedCount}`);
});
