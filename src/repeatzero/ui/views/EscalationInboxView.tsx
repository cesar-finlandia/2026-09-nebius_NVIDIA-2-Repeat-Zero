import type * as React from "react";
import type { TriageResult } from "../../types.js";

export interface EscalationInboxViewProps {
  items: TriageResult[];
  onSelect: (t: string) => void;
}

export function EscalationInboxView(props: EscalationInboxViewProps): React.JSX.Element {
  if (props.items.length === 0) {
    return (
      <section aria-label="Escalations">
        <h1 className="h1">Nothing needs you right now.</h1>
        <p className="small">Escalations appear here when the policy engine is not confident enough to send.</p>
      </section>
    );
  }
  const groups = new Map<string, TriageResult[]>();
  for (const item of props.items) {
    const key: string = item.decision.reason_code;
    const bucket: TriageResult[] = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return (
    <section aria-label="Escalations">
      {[...groups.entries()].map(([reason, items]) => (
        <div key={reason}>
          <h3 className="h3">
            {reason} ({items.length})
          </h3>
          {items.map((item) => (
            <article key={item.trace_id}>
              <h4 className="subject">{item.ticket.subject}</h4>
              <p className="prose">{item.classification.rationale}</p>
              <div className="small">
                {item.citations.map((c) => (
                  <a key={c.url} href={c.url}>
                    {c.title}
                  </a>
                ))}
              </div>
              <div className="rz-start-here">
                <h5 className="h3">Start here</h5>
                <p className="prose">{item.draft.suggested_first_action}</p>
              </div>
              <button type="button" onClick={() => props.onSelect(item.trace_id)} aria-label={`Open ${item.ticket.id}`}>
                Open
              </button>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
