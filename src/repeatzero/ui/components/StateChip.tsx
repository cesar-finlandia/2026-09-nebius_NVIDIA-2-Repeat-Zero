import type * as React from "react";
import type { QueueRow } from "../selectors.js";

export interface StateChipProps {
  state: QueueRow["state"];
}

const LABELS: Record<QueueRow["state"], { glyph: string; word: string }> = {
  sent: { glyph: "●", word: "sent" },
  escalated: { glyph: "▲", word: "needs you" },
  working: { glyph: "◐", word: "working" },
  unverified: { glyph: "○", word: "unverified" },
};

export function StateChip(props: StateChipProps): React.JSX.Element {
  const entry = LABELS[props.state];
  return (
    <span className={`rz-chip rz-chip--${props.state}`} aria-label={entry.word} role="status">
      <span aria-hidden="true">{entry.glyph}</span> {entry.word}
    </span>
  );
}
