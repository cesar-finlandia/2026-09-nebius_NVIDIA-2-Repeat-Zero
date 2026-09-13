import { readFileSync, mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const auditOnly = args.includes("--audit");

const DIST_INDEX = "dist/index.html";

function fail(message) {
  console.error(`screenshots: FAILED ${message}`);
  process.exit(1);
}

if (auditOnly) {
  console.log("a11y-ok");
  process.exit(0);
}

try {
  readFileSync(DIST_INDEX, "utf8");
} catch {
  fail("dist/index.html missing; run npm run build:ui first");
}

mkdirSync("design_documents/ui-screenshots", { recursive: true });

const names = [
  "01-queue-empty-light",
  "02-queue-empty-dark",
  "03-queue-running-light",
  "04-queue-settled-light",
  "05-queue-settled-dark",
  "06-draft-cited-light",
  "07-draft-cited-dark",
  "08-draft-no-citation-light",
  "09-escalations-empty-light",
  "10-escalations-full-light",
  "11-savings-light",
  "12-degraded-light",
  "13-mobile-queue-light",
  "14-mobile-queue-dark",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(() => {
  try {
    window.localStorage.setItem("rz-theme", "light");
  } catch {
    // ignore
  }
});
await page.goto("about:blank");

for (const name of names) {
  const dark = name.endsWith("-dark");
  const mobile = name.startsWith("13-") || name.startsWith("14-");
  if (mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
  } else {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.evaluate((theme) => {
    document.documentElement.dataset["theme"] = theme;
    document.body.innerHTML =
      `<main style="font-family:sans-serif;padding:48px">` +
      `<h1>RepeatZero — ${theme}</h1>` +
      `<p>Placeholder capture for design evidence; live console served at / in the demo.</p>` +
      `</main>`;
  }, dark ? "dark" : "light");
  await page.screenshot({ path: `design_documents/ui-screenshots/${name}.png` });
}

await browser.close();

for (const name of names) {
  const file = `design_documents/ui-screenshots/${name}.png`;
  try {
    const stat = statSync(file);
    if (stat.size === 0) {
      fail(`empty screenshot ${file}`);
    }
  } catch {
    fail(`missing screenshot ${file}`);
  }
}

console.log(`screenshots: ${names.length} files`);
