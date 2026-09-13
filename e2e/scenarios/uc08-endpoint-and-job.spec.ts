import { test, expect } from "../fixtures/app.js";

test("uc08 endpoint and job", async ({ page, app }) => {
  if (!process.env["BASE_URL"]) {
    test.fixme(true, "live-skipped: no deployed endpoint");
    return;
  }
  const remote: string = process.env["BASE_URL"] as string;
  const res = await page.request.get(`${remote}/healthz`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { ok: unknown; models: unknown };
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.models)).toBe(true);
  expect((body.models as unknown[]).length).toBeGreaterThan(0);
  await page.goto(`${app.baseURL}/`);
  await expect(
    page.getByRole("status").filter({ hasText: /runbooks re-indexed/ }),
  ).toBeVisible({ timeout: 60000 });
});
