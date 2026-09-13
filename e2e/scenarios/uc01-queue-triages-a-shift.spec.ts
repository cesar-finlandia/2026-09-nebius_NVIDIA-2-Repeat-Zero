import { test, expect } from "../fixtures/app.js";

test("uc01 queue triages a shift", async ({ page, app }) => {
  await page.goto(`${app.baseURL}/`);
  await expect(page.getByRole("button", { name: "Queue" })).toBeVisible();
  await expect(page.getByTestId("work-indicator-text")).not.toBeEmpty();
  await page.getByRole("button", { name: "Queue" }).click();
  const queue = page.getByRole("table", { name: "Ticket queue" });
  await expect(queue).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole("row").filter({ hasText: "sent" }).first()).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole("row").filter({ hasText: "needs you" }).first()).toBeVisible({ timeout: 120000 });
});
