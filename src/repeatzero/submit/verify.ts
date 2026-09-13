import { withResilience } from "src/resilience";
import type { DegradedResult } from "src/resilience";
import type { HealthCheckInput, HealthCheckOutput } from "./types.js";

export function checkSubmitHealth(
  input: HealthCheckInput,
): () => Promise<HealthCheckOutput | DegradedResult<HealthCheckOutput>> {
  const base: string = typeof input.demoUrl === "string" ? input.demoUrl.replace(/\/+$/, "") : "";
  const timeoutMs: number = 8000;
  const fetchFn = async (): Promise<HealthCheckOutput> => {
    const url: string = `${base}/healthz`;
    const res: Response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const status: number = res.status;
    if (status !== 200) {
      throw new Error(`healthz_${status}`);
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new Error("healthz_shape");
    }
    const rec = body as { ok?: unknown; models?: unknown };
    if (rec.ok !== true || !Array.isArray(rec.models) || !(rec.models as unknown[]).every((m) => typeof m === "string")) {
      throw new Error("healthz_shape");
    }
    return { ok: true, models: rec.models as string[], url, status };
  };
  const guarded = withResilience(fetchFn, { timeout_ms: timeoutMs, retries: 2 });
  return async (): Promise<HealthCheckOutput | DegradedResult<HealthCheckOutput>> => {
    try {
      const out = await guarded();
      if (typeof out === "object" && out !== null && "degraded" in (out as Record<string, unknown>)) {
        const d = out as DegradedResult<HealthCheckOutput>;
        return {
          degraded: true,
          reason: "healthz_unreachable",
          fallback_source: "none",
          original_error: typeof d.original_error === "string" ? d.original_error : null,
          data: null,
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        };
      }
      return out as HealthCheckOutput;
    } catch (err: unknown) {
      return {
        degraded: true,
        reason: "healthz_unreachable",
        fallback_source: "none",
        original_error: err instanceof Error ? err.message : String(err),
        data: null,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };
    }
  };
}
