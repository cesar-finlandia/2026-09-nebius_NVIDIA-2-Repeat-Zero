import type { EventEnvelope } from "../../src/platform/transport/index.js";

export async function collectEvents(baseURL: string, traceId: string): Promise<EventEnvelope[]> {
  const res: Response = await fetch(`${baseURL}/api/events?trace_id=${encodeURIComponent(traceId)}`);
  if (!res.ok) {
    throw new Error(`collectEvents ${res.status}`);
  }
  const snapshot: { envelopes: EventEnvelope[] } = (await res.json()) as { envelopes: EventEnvelope[] };
  return snapshot.envelopes;
}

export async function waitForStep(
  baseURL: string,
  traceId: string,
  stepId: string,
  timeoutMs: number,
): Promise<EventEnvelope> {
  const deadline: number = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events: EventEnvelope[] = await collectEvents(baseURL, traceId);
    const hit: EventEnvelope | undefined = events.find((e) => e.step_id === stepId && e.status === "done");
    if (hit !== undefined) return hit;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`waitForStep timeout: ${stepId}`);
}
