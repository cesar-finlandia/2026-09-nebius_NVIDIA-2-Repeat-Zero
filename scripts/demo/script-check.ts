export type TimingRow = {
  beat: string;
  start_s: number;
  end_s: number;
  duration_s: number;
  on_screen: string;
  audio: string;
};

export type ScriptCheckResult = {
  total_s: number;
  cap_s: number;
  target_s: number;
  pass: boolean;
  summary: string;
};

export function parseTimingTable(markdown: string): TimingRow[] {
  const rows: TimingRow[] = [];
  const lines: string[] = markdown.split("\n");
  for (const line of lines) {
    const m = line.match(/^\|\s*(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)\s*\|/);
    if (m === null) continue;
    const m1: number = Number(m[1]);
    const m2: number = Number(m[2]);
    const m3: number = Number(m[3]);
    const m4: number = Number(m[4]);
    const start_s: number = m1 * 60 + m2;
    const end_s: number = m3 * 60 + m4;
    const duration_s: number = end_s - start_s;
    if (duration_s <= 0 || duration_s > 60) continue;
    const cols: string[] = line.split("|");
    const beat: string = `${m1}:${String(m2).padStart(2, "0")}–${m3}:${String(m4).padStart(2, "0")}`;
    const on_screen: string = (cols[2] ?? "").trim();
    const audio: string = (cols[3] ?? "").trim();
    rows.push({ beat, start_s, end_s, duration_s, on_screen, audio });
  }
  return rows;
}

export function checkScriptTotal(rows: TimingRow[]): ScriptCheckResult {
  const total_s: number = rows.reduce((a, r) => a + r.duration_s, 0);
  const cap_s = 180;
  const target_s = 170;
  if (rows.length === 0) {
    return { total_s: 0, cap_s, target_s, pass: false, summary: "video_script: 0s total — FAIL" };
  }
  const pass: boolean = rows.length === 7 && total_s <= 180 && total_s >= 60;
  const summary: string =
    total_s > 180
      ? `video_script: ${total_s}s total — OVER THE 180s CAP`
      : `video_script: ${total_s}s total — under the 180s cap`;
  return { total_s, cap_s, target_s, pass, summary };
}

const file: string = process.argv[2] ?? "design_documents/video_script.md";
const { readFileSync } = await import("node:fs");
const md: string = readFileSync(file, "utf8");
console.log(checkScriptTotal(parseTimingTable(md)).summary);
