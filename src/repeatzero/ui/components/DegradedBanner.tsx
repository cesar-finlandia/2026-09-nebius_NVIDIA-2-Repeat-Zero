import type * as React from "react";

export interface DegradedBannerProps {
  reasons: Array<{ step: string; detail: string }>;
}

export function DegradedBanner(props: DegradedBannerProps): React.JSX.Element {
  if (props.reasons.length === 0) {
    return <div className="rz-banner-slot" role="status" aria-label="no degradation" />;
  }
  const visible = props.reasons.slice(0, 3);
  const extra: number = props.reasons.length - visible.length;
  return (
    <div className="rz-banner" role="status" aria-live="polite">
      {visible.map((r, i) => (
        <div key={`${r.step}:${i}`} className="small">
          {r.step} degraded — {r.detail}. Other views remain live.
        </div>
      ))}
      {extra > 0 ? (
        <details>
          <summary className="small">and {extra} more</summary>
          {props.reasons.slice(3).map((r, i) => (
            <div key={`extra:${i}`} className="small">
              {r.step} degraded — {r.detail}. Other views remain live.
            </div>
          ))}
        </details>
      ) : null}
    </div>
  );
}
