import type { EventEnvelope } from "../../platform/transport/index.js";

export type FallbackSnapshot = { trace_id: string; envelopes: EventEnvelope[]; complete: boolean };

export type EventHub = {
  append(env: EventEnvelope): void;
  framesFor(traceId: string | null): EventEnvelope[];
  snapshot(traceId: string): FallbackSnapshot;
};

const RING_CAPACITY = 5000;
const ring: EventEnvelope[] = [];

const TERMINAL_STEPS = new Set(["dispatch", "escalate"]);

function isKnownStep(stepId: string): boolean {
  return stepId.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(stepId);
}

export function getHub(): EventHub {
  return hub;
}

const hub: EventHub = {
  append(env: EventEnvelope): void {
    ring.push(env);
    while (ring.length > RING_CAPACITY) {
      ring.shift();
    }
  },
  framesFor(traceId: string | null): EventEnvelope[] {
    if (traceId === null) return [...ring];
    return ring.filter((e) => e.trace_id === traceId);
  },
  snapshot(traceId: string): FallbackSnapshot {
    return snapshotFor(traceId);
  },
};

export function publishEnvelope(env: EventEnvelope): void {
  if (!isKnownStep(env.step_id)) return;
  hub.append(env);
}

export function snapshotFor(traceId: string): FallbackSnapshot {
  const envelopes: EventEnvelope[] = ring.filter((e) => e.trace_id === traceId);
  let complete = false;
  for (const e of envelopes) {
    if (TERMINAL_STEPS.has(e.step_id) && e.status === "done") {
      complete = true;
      break;
    }
  }
  return { trace_id: traceId, envelopes, complete };
}

export function streamResponse(traceId: string | null): Response {
  const frames: EventEnvelope[] = hub.framesFor(traceId);
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // client disconnected
        }
      }, 15000);
    },
    cancel() {
      if (heartbeat !== undefined) {
        clearInterval(heartbeat);
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function clearHub(): void {
  ring.length = 0;
}
