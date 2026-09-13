import type * as React from "react";
import { STEP_IDS } from "../../pipeline/steps.js";
import type { EventEnvelope } from "src/platform/transport";

export interface TraceTimelineProps {
  envelopes: EventEnvelope[];
}

export function TraceTimeline(props: TraceTimelineProps): React.JSX.Element {
  const byStep = new Map<string, EventEnvelope>();
  for (const e of props.envelopes) {
    byStep.set(e.step_id, e);
  }
  return (
    <ol className="rz-timeline" aria-label="trace timeline">
      {STEP_IDS.filter((id) => id !== "dispatch" && id !== "escalate").map((id) => {
        const env: EventEnvelope | undefined = byStep.get(id);
        const status: string = env?.status ?? "pending";
        return (
          <li key={id} className="rz-timeline__step" data-step-id={id} data-status={status}>
            <span className="pip" aria-hidden="true" />
            <span className="small">{id}</span>
          </li>
        );
      })}
    </ol>
  );
}
