import type { TriageResult } from "../types.js";

const QUEUE_CAPACITY = 500;
const store: TriageResult[] = [];

export function pushResult(r: TriageResult): void {
  store.unshift(r);
  while (store.length > QUEUE_CAPACITY) {
    store.pop();
  }
}

export function listQueue(limit?: number): TriageResult[] {
  let n: number = limit === undefined ? 50 : Number(limit);
  if (Number.isNaN(n)) n = 50;
  n = Math.min(200, Math.max(1, Math.floor(n)));
  return store.slice(0, n);
}

export function clearQueue(): void {
  store.length = 0;
}
