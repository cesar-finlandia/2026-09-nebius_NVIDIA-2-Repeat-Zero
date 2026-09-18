import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

const args = process.argv.slice(2);
const auditOnly = args.includes("--audit");

function argValue(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
}

const TARGET = process.env["SHOT_URL"] ?? "http://localhost:5173";
const u = new URL(TARGET);
const PORT = u.port === "" ? "80" : u.port;

async function fetchOk(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

let child = null;
async function ensureServer() {
  for (let i = 0; i < 10; i++) {
    if (await fetchOk(`${TARGET}/`)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  child = spawn("npx", ["vite-node", "scripts/serve.ts"], {
    env: { ...process.env, PORT },
    stdio: "ignore",
    shell: true,
  });
  for (let i = 0; i < 40; i++) {
    if (await fetchOk(`${TARGET}/`)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`screenshots: server at ${TARGET} unreachable`);
  process.exit(1);
}

function chromePath() {
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function fail(message) {
  console.error(`screenshots: FAILED ${message}`);
  process.exit(1);
}

await ensureServer();

const { chromium } = await import("playwright");
const exe = chromePath();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});

async function newPage(vp, theme) {
  const context = await browser.newContext({ viewport: vp });
  await context.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("rz-theme")) window.localStorage.setItem("rz-theme", t);
    } catch {
      // ignore
    }
  }, theme);
  const page = await context.newPage();
  await page.goto(TARGET, { waitUntil: "networkidle" });
  await page.waitForSelector(".rz-layout", { timeout: 15000 });
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch {
    // ignore
  }
  return { context, page };
}

async function runTriage(page) {
  try {
    const before = await page.evaluate(() =>
      fetch("/api/queue").then((r) => r.json()).then((q) => q.length).catch(() => 0),
    );
    await page.getByRole("button", { name: "Run triage" }).click({ timeout: 8000 });
    // The server replays envelopes on connect only — wait for the POST's ticket
    // to land, then reload so the fresh stream carries the backlog (steps +
    // degraded flags) into this page.
    await page.waitForFunction(
      (n) => fetch("/api/queue").then((r) => r.json()).then((q) => q.length > n).catch(() => false),
      before,
      { timeout: 60000 },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".rz-queue tbody tr", { timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

async function gotoView(page, name) {
  await page.getByRole("button", { name, exact: false }).first().click({ timeout: 8000 });
  await page.waitForTimeout(900);
}

if (auditOnly) {
  const problems = [];
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const { context, page } = await newPage(vp, "light");
    await runTriage(page);
    // Keyboard-driven focus matches :focus-visible; programmatic .focus() often does not.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    const res = await page.evaluate(() => {
      const scrollX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      const smallTd = [...document.querySelectorAll(".rz-queue td")]
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 14)
        .map((el) => el.textContent.trim().slice(0, 30));
      const noName = [];
      for (const el of document.querySelectorAll("button,a,input,select,textarea")) {
        const name = (el.getAttribute("aria-label") || el.textContent || el.value || "").trim();
        if (name === "") noName.push(el.tagName);
      }
      const active = document.activeElement;
      let focusOk = true;
      if (active && active !== document.body) {
        const o = getComputedStyle(active).outlineStyle;
        const w = getComputedStyle(active).outlineWidth;
        focusOk = !(o === "none" || w === "0px");
      }
      const banner = document.querySelector('[data-message="page"]');
      // The banner's content must share the main column's content left edge —
      // compare against in-flow content, not .rz-main (its rect includes padding).
      const anchor = document.querySelector(".rz-view-header") || document.querySelector("section[data-surface]");
      let gridOk = true;
      if (banner && anchor) {
        gridOk = Math.abs(banner.getBoundingClientRect().left - anchor.getBoundingClientRect().left) < 2;
      }
      return { scrollX, smallTd, noName, focusOk, gridOk };
    });
    if (res.scrollX) problems.push(`${vp.width}px horizontal scroll`);
    if (res.smallTd.length > 0) problems.push(`${vp.width}px queue cells <14px`);
    if (res.noName.length > 0) problems.push(`${vp.width}px unnamed controls: ${res.noName.slice(0, 3).join(",")}`);
    if (!res.focusOk) problems.push(`${vp.width}px focus outline missing`);
    if (!res.gridOk) problems.push(`${vp.width}px banner off grid`);
    // Theme toggle persists across reload.
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.getByRole("switch").click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".rz-layout", { timeout: 15000 });
    const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
    if (before !== null && after !== null && after !== before && persisted !== after) {
      problems.push(`${vp.width}px theme did not persist`);
    }
    // Reduced motion.
    const reduced = await page.evaluate(() => {
      const el = document.querySelector(".rz-work__bar");
      if (!el) return "no-bar";
      return getComputedStyle(el).animationDuration;
    });
    void reduced;
    await context.close();
  }
  // Reduced-motion emulation pass.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(TARGET, { waitUntil: "networkidle" });
    await page.waitForSelector(".rz-layout", { timeout: 15000 });
    const dur = await page.evaluate(() => {
      const el = document.querySelector(".rz-work__bar");
      return el ? getComputedStyle(el).animationDuration : "no-bar";
    });
    // 0.01ms may serialize as "0.01ms", "0s" or "1e-05s" depending on the build.
    const durOk = dur === "no-bar" || Number.parseFloat(dur) <= 0.0001;
    if (!durOk) problems.push(`reduced-motion bar ${dur}`);
    await context.close();
  }
  await browser.close();
  if (child !== null) child.kill();
  if (problems.length > 0) {
    for (const p of problems) console.error(`screenshots: FAILED ${p}`);
    process.exit(1);
  }
  console.log("a11y-ok");
  process.exit(0);
}

mkdirSync("design_documents/ui-screenshots", { recursive: true });

async function shot(name, vp, theme, act, opts) {
  const skipTriage = opts !== undefined && opts.triage === false;
  const { context, page } = await newPage(vp, theme);
  if (!skipTriage) await runTriage(page);
  if (act) await act(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `design_documents/ui-screenshots/${name}.png` });
  await context.close();
}

const DESKTOP = { width: 1440, height: 900 };
const WIDE = { width: 1920, height: 1080 };
const MOBILE = { width: 390, height: 844 };

async function openFirstDraft(page) {
  try {
    await page.locator(".rz-queue tbody tr").first().click({ timeout: 8000 });
    await gotoView(page, "Draft review");
  } catch {
    await gotoView(page, "Draft review");
  }
}

await shot("01-queue-empty-light", DESKTOP, "light", null, { triage: false });
await shot("02-queue-empty-dark", DESKTOP, "dark", null, { triage: false });
await shot("09-escalations-empty-light", DESKTOP, "light", async (page) => {
  await gotoView(page, "Escalations");
}, { triage: false });
await shot("03-queue-running-light", DESKTOP, "light", async (page) => {
  try {
    await page.getByRole("button", { name: "Run triage" }).click({ timeout: 8000 });
    await page.waitForSelector('[data-testid="work-indicator-text"]', { timeout: 30000 });
  } catch {
    // ignore — capture whatever in-flight state exists
  }
}, { triage: false });
await shot("04-queue-settled-light", WIDE, "light", null);
await shot("05-queue-settled-dark", WIDE, "dark", null);
await shot("06-draft-cited-light", WIDE, "light", openFirstDraft);
await shot("07-draft-cited-dark", WIDE, "dark", openFirstDraft);
await shot("08-draft-no-citation-light", DESKTOP, "light", openFirstDraft);
await shot("10-escalations-full-light", DESKTOP, "light", async (page) => {
  await gotoView(page, "Escalations");
});
await shot("11-savings-light", DESKTOP, "light", async (page) => {
  await gotoView(page, "Savings");
});
await shot("12-degraded-light", DESKTOP, "light", null);
await shot("13-mobile-queue-light", MOBILE, "light", null);
await shot("14-mobile-queue-dark", MOBILE, "dark", null);
await shot("15-appbar-light", DESKTOP, "light", null);
await shot("16-appbar-dark", DESKTOP, "dark", null);
await shot("17-explainer-open-light", DESKTOP, "light", async (page) => {
  try {
    await page.getByRole("button", { name: "How RepeatZero works" }).click({ timeout: 8000 });
    await page.waitForTimeout(500);
  } catch {
    // ignore
  }
});
await shot("18-help-popover-light", DESKTOP, "light", async (page) => {
  try {
    await page.locator('[data-help-for="queue"]').first().click({ timeout: 8000 });
    await page.waitForTimeout(500);
  } catch {
    // ignore
  }
});
await shot("19-savings-widest-light", DESKTOP, "light", async (page) => {
  await gotoView(page, "Savings");
  await page.evaluate(() => {
    const widest = ["1 284 601", "1 284 601", "100.0", "$12 840.62", "1 284.5", "1 284 601"];
    const els = [...document.querySelectorAll(".metric__value")];
    els.forEach((el, i) => {
      el.textContent = widest[i % widest.length];
    });
  });
  await page.waitForTimeout(300);
});

// 20: brandmark contact sheet — the mark alone at 16/24/32/64/128px.
{
  const context = await browser.newContext({ viewport: { width: 800, height: 400 } });
  const page = await context.newPage();
  const mark = readFileSync("public/brand/mark.svg", "utf8");
  await page.setContent(
    `<html><head><style>body{background:#FAF9F7;color:#16706B;display:flex;gap:32px;align-items:end;padding:48px}</style></head><body>` +
      [16, 24, 32, 64, 128].map((s) => `<div style="width:${s}px;height:${s}px">${mark}</div>`).join("") +
      `</body></html>`,
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: "design_documents/ui-screenshots/20-brandmark-contact-sheet.png" });
  await context.close();
}

await browser.close();
if (child !== null) child.kill();

const names = [
  "01-queue-empty-light", "02-queue-empty-dark", "03-queue-running-light",
  "04-queue-settled-light", "05-queue-settled-dark", "06-draft-cited-light",
  "07-draft-cited-dark", "08-draft-no-citation-light", "09-escalations-empty-light",
  "10-escalations-full-light", "11-savings-light", "12-degraded-light",
  "13-mobile-queue-light", "14-mobile-queue-dark", "15-appbar-light", "16-appbar-dark",
  "17-explainer-open-light", "18-help-popover-light", "19-savings-widest-light",
  "20-brandmark-contact-sheet",
];
for (const name of names) {
  const file = `design_documents/ui-screenshots/${name}.png`;
  try {
    const stat = statSync(file);
    if (stat.size === 0) fail(`empty screenshot ${file}`);
  } catch {
    fail(`missing screenshot ${file}`);
  }
}

console.log(`screenshots: ${names.length} files`);
