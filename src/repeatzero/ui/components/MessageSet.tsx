import type * as React from "react";

export interface MessageDetail {
  step: string;
  what: string;
}

export interface MessageSetProps {
  tier: "page" | "inline" | "toast";
  title: string;
  detail: MessageDetail[];
  action?: { label: string; onAct: () => void };
}

const TIER_GLYPH: Record<string, string> = {
  page: "○",
  inline: "○",
  toast: "●",
};

export function MessageSet(props: MessageSetProps): React.JSX.Element {
  return (
    <div className="rz-message" data-message={props.tier} role="status" aria-live="polite">
      <span className="rz-message__glyph" aria-hidden="true">
        {TIER_GLYPH[props.tier] ?? "○"}
      </span>
      <div className="rz-message__body">
        <p className="subject rz-message__title">{props.title}</p>
        <dl className="support rz-message__detail">
          {props.detail.map((d, i) => (
            <div key={`${d.step}:${i}`} className="rz-message__row">
              <dt>{d.step}</dt>
              <dd>{d.what}</dd>
            </div>
          ))}
        </dl>
        {props.action !== undefined ? (
          <button type="button" className="rz-message__action" onClick={props.action.onAct}>
            {props.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
