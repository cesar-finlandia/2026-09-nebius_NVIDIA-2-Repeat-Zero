import type * as React from "react";

export interface CorpusFreshnessProps {
  ageHours: number | null;
}

export function CorpusFreshness(props: CorpusFreshnessProps): React.JSX.Element {
  if (props.ageHours === null) {
    return (
      <span className="small" role="status" aria-label="corpus freshness unknown">
        runbooks re-indexed recently
      </span>
    );
  }
  const stale: boolean = props.ageHours > 36;
  const text: string = `runbooks re-indexed ${Math.floor(props.ageHours)}h ago${stale ? " — stale" : ""}`;
  return (
    <span className="small" role="status" aria-label={text}>
      {text}
    </span>
  );
}
