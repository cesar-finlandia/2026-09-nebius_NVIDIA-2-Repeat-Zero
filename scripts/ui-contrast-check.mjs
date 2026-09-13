import { readFileSync } from "node:fs";

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync("src/repeatzero/ui/repeatzero.css", "utf8");

function block(theme) {
  const start = css.indexOf(theme);
  if (start === -1) throw new Error(`missing ${theme}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const out = {};
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out[`--${m[1]}`] = m[2];
  }
  return out;
}

const light = block(":root, [data-theme=");
const dark = block('[data-theme="dark"]');

const textTokens = ["--text", "--text-muted", "--accent", "--accent-hover", "--escalate", "--danger", "--degraded"];
const chartTokens = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"];

let count = 0;
const failures = [];

function check(theme, fg, bg, min, tokens) {
  const fgVal = tokens[fg];
  const bgVal = tokens[bg];
  if (fgVal === undefined || bgVal === undefined) {
    failures.push(`${theme} ${fg} on ${bg}: missing token`);
    return;
  }
  const r = ratio(fgVal, bgVal);
  count++;
  if (r < min) {
    failures.push(`${theme} ${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
  }
}

for (const theme of ["light", "dark"]) {
  const tokens = theme === "light" ? light : dark;
  for (const fg of textTokens) {
    check(theme, fg, "--bg", 4.5, tokens);
    check(theme, fg, "--bg-elevated", 4.5, tokens);
  }
  check(theme, "--border-strong", "--bg", 3.0, tokens);
  for (const chart of chartTokens) {
    check(theme, chart, "--bg", 3.0, tokens);
  }
  check(theme, "--accent-contrast", "--accent", 4.5, tokens);
  check(theme, "--text", "--bg-sent", 4.5, tokens);
  check(theme, "--text", "--bg-escalate", 4.5, tokens);
}

if (failures.length > 0) {
  for (const f of failures) {
    console.error(f);
  }
  process.exit(1);
}
console.log(`contrast: ${count} pairs OK`);
