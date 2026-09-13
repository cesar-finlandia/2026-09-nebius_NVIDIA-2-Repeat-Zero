import type * as React from "react";
import type { SavingsFigures } from "../selectors.js";

export interface SavingsViewProps {
  savings: SavingsFigures | null;
  degraded: boolean;
}

function tile(label: string, value: string, note: string): React.JSX.Element {
  return (
    <div className="rz-tile">
      <div className="caption">{label}</div>
      <div className="readout-lg">{value}</div>
      <div className="small">{note}</div>
    </div>
  );
}

export function SavingsView(props: SavingsViewProps): React.JSX.Element {
  if (props.savings === null) {
    return (
      <section aria-label="Savings" role="region">
        <div className="rz-tiles">
          {["Tickets", "Auto-sent", "Deflection rate", "USD per ticket", "Hours saved", "Source lookups"].map((label) => (
            <div key={label} className="rz-tile">
              <div className="caption">{label}</div>
              <div className="readout-lg">—</div>
              <div className="small">waiting for the first ticket</div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  const s: SavingsFigures = props.savings;
  const deflectionPct: string = `${(s.deflection_rate * 100).toFixed(1)}%`;
  const total: number = Math.max(1, s.tickets);
  const sentPct: number = (s.auto_sent / total) * 100;
  const escPct: number = 100 - sentPct;
  return (
    <section aria-label="Savings" role="region">
      {props.degraded ? <p className="small">figures may be stale</p> : null}
      <div className="rz-tiles">
        {tile("Tickets", String(s.tickets), "completed tickets this session")}
        {tile("Auto-sent", String(s.auto_sent), "replies sent without a human")}
        {tile("Deflection rate", deflectionPct, "auto-sent share of completed tickets")}
        {tile("USD per ticket", s.usd_per_ticket.toFixed(4), "local estimate from the published price list — not a billing figure")}
        {tile("Hours saved", s.hours_saved.toFixed(1), "assumption: 6 minutes per deflected ticket")}
        {tile("Source lookups", String(s.tickets), "grounding attempts this session")}
      </div>
      <div className="rz-bar" role="img" aria-label={`sent ${s.auto_sent}, escalated ${s.escalated}`}>
        <div title={`sent ${s.auto_sent}`} style={{ width: `${sentPct}%`, background: "var(--chart-1)" }} />
        <div title={`escalated ${s.escalated}`} style={{ width: `${escPct}%`, background: "var(--chart-2)" }} />
      </div>
      <table aria-label="spend by role">
        <tbody>
          <tr>
            <td>classifier</td>
            <td className="readout">{s.usd_per_ticket.toFixed(4)}</td>
          </tr>
          <tr>
            <td>drafter</td>
            <td className="readout">{s.usd_per_ticket.toFixed(4)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
