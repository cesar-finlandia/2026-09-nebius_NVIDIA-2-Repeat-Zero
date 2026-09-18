import type * as React from "react";
import { MessageSet } from "./MessageSet.js";

export interface DegradedBannerProps {
  reasons: Array<{ step: string; detail: string }>;
}

export function DegradedBanner(props: DegradedBannerProps): React.JSX.Element {
  if (props.reasons.length === 0) {
    return <div className="rz-banner-slot" role="status" aria-label="no degradation" />;
  }
  const visible = props.reasons.slice(0, 3);
  const extra: number = props.reasons.length - visible.length;
  const detail = visible.map((r) => ({
    step: r.step,
    what: r.detail === "" ? "no reason recorded" : r.detail,
  }));
  return (
    <div className="rz-banner-slot">
      <MessageSet
        tier="page"
        title="Running offline — drafts are not being sent"
        detail={detail}
      />
      {extra > 0 ? (
        <details>
          <summary className="support">and {extra} more</summary>
          {props.reasons.slice(3).map((r, i) => (
            <p key={`extra:${i}`} className="support">
              {r.step} — {r.detail === "" ? "no reason recorded" : r.detail}
            </p>
          ))}
        </details>
      ) : null}
      <p className="support">Other views remain live.</p>
    </div>
  );
}
