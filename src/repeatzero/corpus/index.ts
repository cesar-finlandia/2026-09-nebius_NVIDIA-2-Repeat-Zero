import type { Citation, RetrievalCandidate, RunbookDoc, TaxonomyId, Ticket } from "../types.js";
import { TAXONOMY } from "../taxonomy.js";
import { CONFIG } from "../config.js";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by",
  "can", "could", "did", "do", "does", "for", "from", "had", "has",
  "have", "how", "in", "is", "it", "its", "may", "not", "of", "on",
  "or", "our", "shall", "should", "that", "the", "their", "this",
  "to", "was", "with",
]);

export const K1 = 1.2;
export const B = 0.75;
export const TITLE_WEIGHT = 2.0;
export const BODY_WEIGHT = 1.0;

interface IdfMemo {
  N: number;
  df: Map<string, number>;
  avgTitleLen: number;
  avgBodyLen: number;
  titleTokens: string[][];
  bodyTokens: string[][];
}

const MEMO: IdfMemo = {
  N: 0,
  df: new Map<string, number>(),
  avgTitleLen: 1,
  avgBodyLen: 1,
  titleTokens: [],
  bodyTokens: [],
};

type ParseResult = { ok: true; doc: RunbookDoc } | { ok: false; reason: string };

function parseRunbook(filename: string, content: string): ParseResult {
  const id: string = basename(filename, ".md");
  const lines: string[] = content.split("\n");
  if (lines.length === 0 || (lines[0] as string).trim() !== "---") {
    return { ok: false, reason: "missing opening ---" };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] as string).trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    return { ok: false, reason: "missing closing ---" };
  }
  const header: Record<string, string> = {};
  for (let i = 1; i < close; i++) {
    const line: string = lines[i] as string;
    if (line.trim() === "") continue;
    const colon: number = line.indexOf(":");
    if (colon === -1) {
      return { ok: false, reason: `header line ${i + 1} has no colon` };
    }
    const key: string = line.slice(0, colon).trim();
    let value: string = line.slice(colon + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    header[key] = value;
  }
  let body: string = lines.slice(close + 1).join("\n");
  if (body.startsWith("\n")) {
    body = body.slice(1);
  }
  const headerId: string | undefined = header["id"];
  const title: string | undefined = header["title"];
  const url: string | undefined = header["url"];
  const taxonomy: string | undefined = header["taxonomy"];
  const updatedAt: string | undefined = header["updated_at"];
  if (headerId !== id) {
    return { ok: false, reason: `id mismatch: header ${headerId ?? "missing"} vs filename ${id}` };
  }
  if (!title || !url || !taxonomy || !updatedAt) {
    return { ok: false, reason: "missing required front-matter key" };
  }
  let known = false;
  for (const row of TAXONOMY) {
    if (row.id === taxonomy) {
      known = true;
      break;
    }
  }
  if (!known) {
    return { ok: false, reason: `unknown taxonomy ${taxonomy}` };
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    return { ok: false, reason: "url must start with https:// or http://" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    return { ok: false, reason: "updated_at must match YYYY-MM-DD" };
  }
  return { ok: true, doc: { id, title, url, taxonomy: taxonomy as TaxonomyId, body, updated_at: updatedAt } };
}

export function tokenise(s: string): string[] {
  const lower: string = s.toLowerCase();
  const parts: string[] = lower.split(/[^a-z0-9]+/);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length < 3) continue;
    if (STOPWORDS.has(p)) continue;
    out.push(p);
  }
  return out;
}

function rebuildMemo(docs: RunbookDoc[]): void {
  const N: number = docs.length;
  MEMO.N = N;
  MEMO.df = new Map<string, number>();
  MEMO.titleTokens = [];
  MEMO.bodyTokens = [];
  if (N === 0) {
    MEMO.avgTitleLen = 1;
    MEMO.avgBodyLen = 1;
    return;
  }
  let titleSum = 0;
  let bodySum = 0;
  for (const d of docs) {
    const tt: string[] = tokenise(d.title);
    const bt: string[] = tokenise(d.body);
    MEMO.titleTokens.push(tt);
    MEMO.bodyTokens.push(bt);
    titleSum += tt.length;
    bodySum += bt.length;
    const seen = new Set<string>([...tt, ...bt]);
    for (const t of seen) {
      MEMO.df.set(t, (MEMO.df.get(t) ?? 0) + 1);
    }
  }
  MEMO.avgTitleLen = titleSum > 0 ? titleSum / N : 1;
  MEMO.avgBodyLen = bodySum > 0 ? bodySum / N : 1;
}

function idf(term: string): number {
  return Math.log(1 + MEMO.N / (1 + (MEMO.df.get(term) ?? 0)));
}

export function loadCorpus(path?: string): RunbookDoc[] {
  let dir: string;
  if (path !== undefined && path !== "") {
    dir = path;
  } else if (CONFIG.corpusPath !== "") {
    dir = CONFIG.corpusPath;
  } else {
    dir = "engine/rag/runbooks";
  }
  let files: string[];
  try {
    files = readdirSync(dir).sort();
  } catch {
    console.warn(`[corpus] missing dir ${dir}`);
    lastDocs = [];
    rebuildMemo([]);
    return [];
  }
  const docs: RunbookDoc[] = [];
  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;
    let content: string;
    try {
      content = readFileSync(join(dir, filename), "utf8");
    } catch {
      console.warn(`[corpus] skip ${filename}: unreadable`);
      continue;
    }
    const parsed: ParseResult = parseRunbook(filename, content);
    if (!parsed.ok) {
      const reason: string = (parsed as { ok: false; reason: string }).reason;
      console.warn(`[corpus] skip ${filename}: ${reason}`);
      continue;
    }
    docs.push((parsed as { ok: true; doc: RunbookDoc }).doc);
  }
  lastDocs = docs;
  rebuildMemo(docs);
  return docs;
}

export function retrieve(ticket: Ticket, k?: number): RetrievalCandidate[] {
  let kk: number = k === undefined ? 5 : Math.floor(k);
  if (typeof kk !== "number" || Number.isNaN(kk)) {
    kk = 5;
  }
  kk = Math.max(1, Math.min(20, kk));
  const subject: string = typeof ticket.subject === "string" ? ticket.subject : "";
  const body: string = typeof ticket.body === "string" ? ticket.body : "";
  const qterms: string[] = tokenise(`${subject} ${body}`);
  if (MEMO.N === 0) {
    return [];
  }
  if (qterms.length === 0) {
    return [];
  }
  const qset: string[] = [...new Set<string>(qterms)];
  return scoredList(qset, kk);
}

function scoredList(qset: string[], kk: number): RetrievalCandidate[] {
  const out: RetrievalCandidate[] = [];
  const docs: RunbookDoc[] = currentDocs();
  for (let i = 0; i < docs.length; i++) {
    const doc: RunbookDoc = docs[i] as RunbookDoc;
    const tt: string[] = MEMO.titleTokens[i] as string[];
    const bt: string[] = MEMO.bodyTokens[i] as string[];
    let score = 0;
    for (const t of qset) {
      const termIdf: number = idf(t);
      const tfTitle: number = countOccurrences(tt, t);
      const tfBody: number = countOccurrences(bt, t);
      const titlePart: number = bm25tf(tfTitle, tt.length, MEMO.avgTitleLen);
      const bodyPart: number = bm25tf(tfBody, bt.length, MEMO.avgBodyLen);
      score += termIdf * (TITLE_WEIGHT * titlePart + BODY_WEIGHT * bodyPart);
    }
    if (score === 0) continue;
    const matched: string[] = qset
      .filter((t) => tt.includes(t) || bt.includes(t))
      .sort();
    out.push({ doc, score: Math.round(score * 10000) / 10000, matched_terms: matched });
  }
  out.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.doc.id < b.doc.id ? -1 : a.doc.id > b.doc.id ? 1 : 0));
  return out.slice(0, kk);
}

function countOccurrences(tokens: string[], term: string): number {
  let n = 0;
  for (const t of tokens) {
    if (t === term) n++;
  }
  return n;
}

function bm25tf(tf: number, len: number, avg: number): number {
  if (tf === 0) return 0;
  return (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (len / avg)));
}

let lastDocs: RunbookDoc[] = [];

function currentDocs(): RunbookDoc[] {
  return lastDocs;
}

export function candidatesToCorpusCitations(
  candidates: RetrievalCandidate[],
  retrievedAt?: string,
): Citation[] {
  if (!Array.isArray(candidates)) {
    return [];
  }
  let ts: string = retrievedAt ?? "2026-09-01T00:00:00.000Z";
  if (ts === "") {
    ts = "2026-09-01T00:00:00.000Z";
  }
  const out: Citation[] = [];
  for (const c of candidates) {
    const collapsed: string = c.doc.body.replace(/\s+/g, " ").trim();
    const snippet: string = collapsed.slice(0, 200) + (collapsed.length > 200 ? "…" : "");
    out.push({ url: c.doc.url, title: c.doc.title, snippet, source: "corpus", retrieved_at: ts });
  }
  return out;
}

export function reindex(
  resolutionLogPath: string,
  corpusPath: string,
): { docs_indexed: number; terms: number } {
  let existing: RunbookDoc[] = [];
  try {
    const files: string[] = readdirSync(corpusPath).sort();
    void files;
    existing = loadCorpus(corpusPath);
  } catch {
    try {
      mkdirSync(corpusPath, { recursive: true });
    } catch {
      // ignore
    }
    existing = [];
  }
  const existingIds = new Set<string>(existing.map((d) => d.id));
  let raw: string;
  try {
    raw = readFileSync(resolutionLogPath, "utf8");
  } catch {
    console.warn(`[corpus] reindex: unreadable log ${resolutionLogPath}`);
    const docs: RunbookDoc[] = loadCorpus(corpusPath);
    return { docs_indexed: docs.length, terms: MEMO.df.size };
  }
  const groups = new Map<string, string[]>();
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      console.warn(`[corpus] reindex: skip malformed log line`);
      continue;
    }
    if (
      typeof obj !== "object" ||
      obj === null ||
      typeof (obj as Record<string, unknown>)["ticket_id"] !== "string" ||
      typeof (obj as Record<string, unknown>)["taxonomy"] !== "string" ||
      typeof (obj as Record<string, unknown>)["resolution_body"] !== "string" ||
      ((obj as Record<string, unknown>)["resolution_body"] as string).length === 0 ||
      typeof (obj as Record<string, unknown>)["at"] !== "string"
    ) {
      console.warn(`[corpus] reindex: skip invalid log line`);
      continue;
    }
    const rec = obj as { taxonomy: string; resolution_body: string };
    let known = false;
    for (const row of TAXONOMY) {
      if (row.id === rec.taxonomy) {
        known = true;
        break;
      }
    }
    if (!known) {
      console.warn(`[corpus] reindex: skip unknown taxonomy ${rec.taxonomy}`);
      continue;
    }
    const bucket: string[] = groups.get(rec.taxonomy) ?? [];
    bucket.push(rec.resolution_body);
    groups.set(rec.taxonomy, bucket);
  }
  for (const [taxonomy, bodies] of groups) {
    if (bodies.length > 3 && !existingIds.has(`rb-${taxonomy}`)) {
      const titleCase: string = taxonomy
        .split("-")
        .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
        .join(" ");
      const today: string = new Date().toISOString().slice(0, 10);
      const last3: string[] = bodies.slice(-3).map((b) => b.slice(0, 2000));
      const fileBody: string =
        `id: rb-${taxonomy}\n` +
        `title: ${titleCase} — field resolutions\n` +
        `url: https://example.internal/runbooks/${taxonomy}\n` +
        `taxonomy: ${taxonomy}\n` +
        `updated_at: ${today}\n` +
        `---\n` +
        `Resolved cases for ${taxonomy}.\n\n` +
        last3.join("\n\n---\n\n") +
        `\n`;
      try {
        writeFileSync(join(corpusPath, `rb-${taxonomy}.md`), "---\n" + fileBody, "utf8");
        existingIds.add(`rb-${taxonomy}`);
      } catch {
        console.warn(`[corpus] reindex: failed to write rb-${taxonomy}.md`);
      }
    }
  }
  const docs: RunbookDoc[] = loadCorpus(corpusPath);
  return { docs_indexed: docs.length, terms: MEMO.df.size };
}
