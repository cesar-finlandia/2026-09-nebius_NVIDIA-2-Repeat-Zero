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

const TILE_LABELS: string[] = [
  "Tickets",
  "Auto-sent",
  "Deflection rate",
  "USD per ticket",
  "Hours saved",
  "Source lookups",
];

test("uc06 savings are honest", async ({ page, app }) => {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.id === "t-repeat-01");
  if (!ticket) throw new Error("fixture t-repeat-01 missing");
  const posted = await page.request.post(`${app.baseURL}/api/tickets`, { data: ticket });
  expect(posted.ok()).toBe(true);

  await page.goto(`${app.baseURL}/`);
  await page.getByRole("button", { name: "Savings" }).click();
  const savings = page.getByRole("region", { name: "Savings" });
  await expect(savings).toBeVisible({ timeout: 60000 });
  for (const label of TILE_LABELS) {
    await expect(savings.getByText(label, { exact: true })).toBeVisible({ timeout: 60000 });
  }
  await expect(
    savings.getByText("local estimate from the published price list — not a billing figure"),
  ).toBeVisible({ timeout: 60000 });
  await expect(savings.getByText("assumption: 6 minutes per deflected ticket")).toBeVisible({
    timeout: 60000,
  });
  await expect(savings.getByText(/%/)).toBeVisible({ timeout: 60000 });
});
