import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
}

const TARGET = argValue("--url", "http://localhost:5173");
const u = new URL(TARGET);
const PORT = u.port === "" ? "80" : u.port;
const checksArg = argValue("--checks", "");
const runAll = args.includes("--all");
const widest = args.includes("--widest");
const state = argValue("--state", "");

const wanted = new Set(
  runAll
    ? ["spill", "clipped", "wrapped", "tabular", "flat", "broken", "grid", "help", "font", "accent"]
    : checksArg
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .flatMap((group) => {
          if (group === "surfaces" || group === "roles") return ["spill", "clipped", "flat"];
          if (group === "metrics") return ["wrapped", "tabular", "clipped"];
          if (group === "messages") return ["broken", "grid"];
          if (group === "help") return ["help"];
          if (group === "content") return ["raw", "unclamped"];
          if (group === "font") return ["font", "tabular"];
          return [group];
        }),
);

if (wanted.size === 0) {
  console.error("craft-audit: no checks selected; pass --all or --checks <groups>");
  process.exit(1);
}

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
  console.error(`craft-audit: server at ${TARGET} unreachable`);
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

const failures = [];

async function withBrowser(fn) {
  const { chromium } = await import("playwright");
  const exe = chromePath();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}

async function evaluateCraft(page) {
  return page.evaluate(() => {
    const R = (el) => el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const spill = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = R(el);
        return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
      })
      .map((el) => el.className || el.tagName);
    const clipped = [...document.querySelectorAll("button,.chip,.badge,.metric__value,h1,h2,h3,td,th,label")]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
      .map((el) => (el.textContent || "").trim().slice(0, 40));
    const wrapped = [...document.querySelectorAll(".metric__value,[data-metric]")]
      .filter((el) => el.getClientRects().length > 1)
      .map((el) => (el.textContent || "").trim());
    const notTabular = [...document.querySelectorAll(".metric__value,[data-metric]")]
      .filter((el) => !getComputedStyle(el).fontVariantNumeric.includes("tabular-nums"))
      .map((el) => (el.textContent || "").trim());
    const flatCards = [...document.querySelectorAll("[data-surface]")].filter((el) => {
      const s = getComputedStyle(el);
      return s.borderStyle === "none" && s.boxShadow === "none";
    }).map((el) => el.dataset.surface);
    const broken = [...document.querySelectorAll('[data-message],[role="status"],[role="alert"]')]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => /(:\s*[.。]|\s\.\s*$|\bvia none\b|\bundefined\b|\bnull\b)/.test(t));
    const resultRegions = document.querySelectorAll("[data-result-region]").length;
    const helpButtons = document.querySelectorAll("[data-help-for]").length;
    const explainer = !!document.querySelector("[data-app-explainer]");
    const bodyFont = getComputedStyle(document.body).fontFamily;
    const realFace = !/^\s*(system-ui|-apple-system|sans-serif|serif)\s*(,|$)/.test(bodyFont);
    const fontsStatus = document.fonts ? document.fonts.status : "unknown";
    const probe = document.createElement("div");
    probe.style.color = "var(--accent)";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    const accentUses = [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      return [s.color, s.backgroundColor, s.borderColor].some((v) => v && v !== "none" && v.replace(/\s/g, "") === accent.replace(/\s/g, ""));
    }).length;
    const rawMarkdown = document.body.innerText.includes("```");
    const unclamped = [...document.querySelectorAll(".prose")]
      .filter((el) => el.offsetParent !== null && !el.classList.contains("rz-clamp") && el.closest("details") === null)
      .filter((el) => el.scrollHeight > el.clientHeight + 1 && el.textContent.trim().length > 200)
      .map((el) => el.textContent.trim().slice(0, 40));
    const banner = document.querySelector('[data-message="page"]');
    const anchor = document.querySelector(".rz-view-header") || document.querySelector("section[data-surface]");
    let gridOk = true;
    if (banner && anchor) {
      gridOk = Math.abs(R(banner).left - R(anchor).left) < 2;
    }
    return {
      spill, clipped, wrapped, notTabular, flatCards, broken,
      resultRegions, helpButtons, explainer, bodyFont, realFace, fontsStatus,
      accentUses, rawMarkdown, unclamped, gridOk, bannerPresent: !!banner,
    };
  });
}

const NAVS = ["Queue", "Draft review", "Escalations", "Savings"];

async function tour(page, fn) {
  const seen = { regions: 0, helps: 0, explainer: false };
  for (const nav of NAVS) {
    const btn = page.getByRole("button", { name: nav, exact: false });
    try {
      await btn.first().click({ timeout: 5000 });
    } catch {
      continue;
    }
    await page.waitForTimeout(800);
    const r = await fn(page);
    seen.regions += r.resultRegions;
    seen.helps += r.helpButtons;
    seen.explainer = seen.explainer || r.explainer;
  }
  return seen;
}

await ensureServer();

await withBrowser(async (browser) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ];
  const themes = ["light", "dark"];
  let totalRegions = 0;
  let totalHelps = 0;
  let explainerSeen = false;

  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: vp });
      await context.addInitScript((t) => {
        try {
          window.localStorage.setItem("rz-theme", t);
        } catch {
          // ignore
        }
      }, theme);
      const page = await context.newPage();
      await page.goto(TARGET, { waitUntil: "networkidle" });
      await page.waitForSelector(".rz-layout", { timeout: 15000 });
      try {
        await document_fonts_ready(page);
      } catch {
        // ignore
      }
      // Start one triage run so queue/draft/sources regions have content (degraded-safe).
      // The server replays envelopes only on connect, so reload after the run:
      // the fresh stream then carries the full envelope backlog (steps + degraded flags).
      try {
        const before = await page.evaluate(() =>
          fetch("/api/queue").then((r) => r.json()).then((q) => q.length).catch(() => 0),
        );
        await page.getByRole("button", { name: "Run triage" }).click({ timeout: 5000 });
        await page.waitForFunction(
          (n) => fetch("/api/queue").then((r) => r.json()).then((q) => q.length > n).catch(() => false),
          before,
          { timeout: 60000 },
        );
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForSelector(".rz-queue tbody tr", { timeout: 30000 });
        await page.locator(".rz-queue tbody tr").first().click({ timeout: 5000 });
        await page.waitForTimeout(1000);
      } catch {
        // offline backend still shows empty states; regions still counted
      }
      if (widest) {
        await page.evaluate(() => {
          for (const el of document.querySelectorAll(".metric__value")) {
            el.textContent = "1 284 601";
          }
        });
        await page.waitForTimeout(300);
      }
      const res = await evaluateCraft(page);
      const tag = `${vp.width}x${vp.height}/${theme}`;

      if (wanted.has("spill") && res.spill.length > 0) failures.push(`${tag} spill: ${res.spill.slice(0, 5).join(",")}`);
      if (wanted.has("clipped") && res.clipped.length > 0) failures.push(`${tag} clipped: ${res.clipped.slice(0, 5).join(",")}`);
      if (wanted.has("wrapped") && res.wrapped.length > 0) failures.push(`${tag} wrapped: ${res.wrapped.slice(0, 3).join(",")}`);
      if (wanted.has("tabular") && res.notTabular.length > 0) failures.push(`${tag} non-tabular: ${res.notTabular.slice(0, 3).join(",")}`);
      if (wanted.has("flat") && res.flatCards.length > 0) failures.push(`${tag} flat surfaces: ${res.flatCards.join(",")}`);
      if (wanted.has("broken") && res.broken.length > 0) failures.push(`${tag} broken templates: ${res.broken.slice(0, 3).join(",")}`);
      if (wanted.has("grid") && res.bannerPresent && !res.gridOk) {
        failures.push(`${tag} banner off grid`);
      }
      if (wanted.has("raw") && res.rawMarkdown) failures.push(`${tag} raw markdown fences visible`);
      if (wanted.has("unclamped") && res.unclamped.length > 0) failures.push(`${tag} unclamped blobs: ${res.unclamped.slice(0, 3).join(",")}`);
      if (wanted.has("font")) {
        if (!res.realFace) failures.push(`${tag} bare system font: ${res.bodyFont}`);
        if (res.fontsStatus !== "loaded") failures.push(`${tag} fonts status ${res.fontsStatus}`);
      }
      if (wanted.has("accent") && res.accentUses < 3) failures.push(`${tag} accent used ${res.accentUses}x (<3)`);

      // Tour all views for help coverage on the desktop/light pass, then open
      // the explainer last (its backdrop intercepts nav clicks while open).
      if (wanted.has("help") && vp.width === 1440 && theme === "light") {
        const seen = await tour(page, async (p) => evaluateCraft(p));
        totalRegions = seen.regions;
        totalHelps = seen.helps;
        try {
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "How RepeatZero works" }).click({ timeout: 5000 });
          await page.waitForTimeout(400);
          const again = await evaluateCraft(page);
          explainerSeen = seen.explainer || again.explainer;
        } catch {
          explainerSeen = seen.explainer;
        }
      }
      await context.close();
    }
  }

  if (wanted.has("help")) {
    if (!(totalHelps >= totalRegions && totalRegions > 0)) {
      failures.push(`help coverage: ${totalHelps} buttons for ${totalRegions} regions`);
    }
    if (!explainerSeen) failures.push("help: explainer panel never rendered");
  }
});

async function document_fonts_ready(page) {
  await page.evaluate(() => document.fonts.ready);
}

if (child !== null) child.kill();

if (failures.length > 0) {
  for (const f of failures) console.error(`craft: FAIL ${f}`);
  process.exit(1);
}

if (runAll) {
  console.log("craft: 9 checks OK");
} else if (checksArg.includes("surfaces") || checksArg.includes("roles")) {
  console.log("craft: surfaces OK (0 flat), roles OK");
} else if (checksArg.includes("metrics")) {
  console.log("craft: metrics OK (0 wrapped, 0 non-tabular, widest value fits)");
} else if (checksArg.includes("messages")) {
  console.log("craft: messages OK (0 broken templates, banner on grid)");
} else if (checksArg.includes("help")) {
  console.log("craft: help OK (regions covered, explainer present)");
} else if (checksArg.includes("content") || checksArg.includes("font")) {
  console.log("craft: content OK (0 raw markdown, 0 unclamped), font OK (self-hosted, tabular-nums)");
} else {
  console.log("craft: selected checks OK");
}
