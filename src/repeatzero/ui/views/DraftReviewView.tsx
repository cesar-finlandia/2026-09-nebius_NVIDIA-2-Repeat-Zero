import { useState } from "react";
import type * as React from "react";
import { CitationDisplay, StreamingTextRenderer } from "src/platform/ui";
import type { EventEnvelope } from "src/platform/transport";
import type { TriageResult } from "../../types.js";
import { SendDialog } from "../components/SendDialog.js";
import { HelpPopover } from "../components/HelpPopover.js";

export interface DraftReviewViewProps {
  result: TriageResult | null;
  envelopes: EventEnvelope[];
  onSend: (traceId: string) => void;
  sending: boolean;
  error: string | null;
}

function draftEnvelopes(result: TriageResult): EventEnvelope[] {
  const now: string = new Date().toISOString();
  const out: EventEnvelope[] = [];
  if (result.citations.length > 0) {
    out.push({
      step_id: "ground",
      status: "done",
      payload: { citations: result.citations },
      timestamp: now,
      sequence: 100,
      trace_id: result.trace_id,
    });
  }
  out.push({
    step_id: "draft",
    status: "done",
    payload: { text: result.draft.body },
    timestamp: now,
    sequence: 101,
    trace_id: result.trace_id,
  });
  return out;
}

export function DraftReviewView(props: DraftReviewViewProps): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  if (props.result === null) {
    return (
      <section aria-label="Draft review" role="region">
        <p className="small">Pick a ticket from the queue to review its draft.</p>
      </section>
    );
  }
  const result: TriageResult = props.result;
  const cited: boolean = result.draft.citations.length > 0;
  const sent: boolean = result.decision.action === "auto_send";
  const draftEnvs: EventEnvelope[] = [...props.envelopes, ...draftEnvelopes(result)];
  return (
    <section aria-label="Draft review" role="region">
      <h2 className="h2 subject">{result.ticket.subject}</h2>
      <div className="rz-draft-cols">
        <div>
          <p className="prose">{result.ticket.body}</p>
          <p className="caption">
            {result.ticket.requester} — {result.ticket.created_at}
          </p>
        </div>
        <div>
          <p className="small">
            {result.classification.label} — confidence {result.classification.confidence.toFixed(2)}
          </p>
          <StreamingTextRenderer envelopes={draftEnvs} stepId="draft" />
          <p className="prose">{result.draft.body}</p>
          <section aria-label="Sources" role="region" data-surface="sources">
            <div role="region" aria-label="Sources" data-result-region="sources">
              <h3 className="h3">Sources <HelpPopover regionId="sources" /></h3>
              {cited ? (
                <CitationDisplay envelopes={draftEnvs} />
              ) : (
                <div>
                  <span className="rz-chip" aria-label="no source">
                    ⊘ no source
                  </span>
                  <p className="strong">This draft has no source, so it cannot be sent.</p>
                </div>
              )}
            </div>
          </section>
          <p className="strong">{result.decision.explanation}</p>
          <p className="id">{result.decision.reason_code}</p>
          {result.degraded ? <p className="small">Drafted without live sources — offline fallback.</p> : null}
          {cited && !sent ? (
            <button type="button" aria-label="Send reply" onClick={() => setDialogOpen(true)} disabled={props.sending}>
              Send reply
            </button>
          ) : null}
          {sent ? <p className="small">● sent</p> : null}
          {props.error !== null ? <p className="small">{props.error}</p> : null}
          <SendDialog
            open={dialogOpen}
            citationCount={result.draft.citations.length}
            onConfirm={() => {
              setDialogOpen(false);
              props.onSend(result.trace_id);
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </div>
    </section>
  );
}
