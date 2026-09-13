import type * as React from "react";
import type { QueueRow } from "../selectors.js";
import { StateChip } from "../components/StateChip.js";

export interface QueueViewProps {
  rows: QueueRow[];
  selectedTraceId: string | null;
  onSelect: (t: string) => void;
  filter: string;
  onFilter: (f: string) => void;
}

export function QueueView(props: QueueViewProps): React.JSX.Element {
  const needle: string = props.filter.trim().toLowerCase();
  const filtered: QueueRow[] = needle === ""
    ? props.rows
    : props.rows.filter((r) => `${r.subject} ${r.ticketId} ${r.taxonomyId}`.toLowerCase().includes(needle));
  if (props.rows.length === 0) {
    return (
      <section aria-label="Ticket queue">
        <h1 className="h1">No tickets yet.</h1>
        <p className="small">Load the sample queue to watch a shift&apos;s worth of triage in about a minute.</p>
        <input aria-label="Filter tickets" value={props.filter} onChange={(e) => props.onFilter(e.target.value)} />
      </section>
    );
  }
  if (filtered.length === 0) {
    return (
      <section aria-label="Ticket queue">
        <input aria-label="Filter tickets" value={props.filter} onChange={(e) => props.onFilter(e.target.value)} />
        <p className="small">No tickets match this filter.</p>
      </section>
    );
  }
  return (
    <section aria-label="Ticket queue">
      <input aria-label="Filter tickets" value={props.filter} onChange={(e) => props.onFilter(e.target.value)} />
      <table className="rz-queue" aria-label="Ticket queue">
        <thead>
          <tr>
            <th>State</th>
            <th>Subject</th>
            <th>Ticket</th>
            <th>Taxonomy</th>
            <th>Steps</th>
            <th>Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.traceId}
              className={row.state === "sent" ? "row-sent arriving" : row.state === "escalated" ? "row-escalated settling" : "arriving"}
              onClick={() => props.onSelect(row.traceId)}
              data-selected={props.selectedTraceId === row.traceId ? "true" : undefined}
            >
              <td>
                <StateChip state={row.state} />
              </td>
              <td className="subject">{row.subject}</td>
              <td className="id">{row.ticketId}</td>
              <td className="small">{row.taxonomyId}</td>
              <td className="small">{Object.values(row.stepStatus).filter((s) => s === "done").length}/9 done</td>
              <td className="readout">{(row.elapsedMs / 1000).toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
