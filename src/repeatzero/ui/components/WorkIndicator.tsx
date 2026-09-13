import type * as React from "react";
import type { ActivityLine } from "../selectors.js";

export interface WorkIndicatorProps {
  active: boolean;
  line: ActivityLine;
  elapsedS: number;
  stalledS: number | null;
}

export function WorkIndicator(props: WorkIndicatorProps): React.JSX.Element {
  if (!props.active) {
    return <div className="rz-work" role="status" aria-label="idle" />;
  }
  const stalled: boolean = props.stalledS !== null && props.stalledS > 10;
  const text: string = stalled
    ? `${props.line.text} — no update for ${props.stalledS as number}s`
    : props.line.text;
  return (
    <div className="rz-work-wrap" role="status" aria-label={text}>
      <div className="rz-work">
        <div className="rz-work__bar" />
      </div>
      <div className="small" data-testid="work-indicator-text">
        {text}
      </div>
      <div className="readout">{props.elapsedS.toFixed(1)}s</div>
    </div>
  );
}
