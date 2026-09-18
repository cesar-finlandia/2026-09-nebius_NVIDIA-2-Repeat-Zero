import type * as React from "react";

export interface MetricProps {
  label: string;
  value: string;
  unit?: string;
  pair?: string;
  size?: "lg" | "md" | "sm";
  title?: string;
}

const SIZE_CLASS: Record<string, string> = {
  lg: "metric__value metric__value--lg",
  md: "metric__value metric__value--md",
  sm: "metric__value metric__value--sm",
};

export function Metric(props: MetricProps): React.JSX.Element {
  const size: string = props.size ?? "lg";
  return (
    <div className="metric" data-metric={props.label} role="group" aria-label={props.label}>
      <span className="eyebrow">{props.label}</span>
      <span className={SIZE_CLASS[size] ?? SIZE_CLASS["lg"]} title={props.title}>
        {props.value}
        {props.pair !== undefined ? (
          <>
            <span className="metric__sep">/</span>
            {props.pair}
          </>
        ) : null}
      </span>
      {props.unit !== undefined ? <span className="metric__unit">{props.unit}</span> : null}
    </div>
  );
}
