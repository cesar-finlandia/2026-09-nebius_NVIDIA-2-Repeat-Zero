import type * as React from "react";
import type { AppViewId } from "../App.js";
import { ConnectionPill } from "./ConnectionPill.js";
import { CorpusFreshness } from "./CorpusFreshness.js";

export interface SideNavProps {
  active: AppViewId;
  escalationCount: number;
  onNavigate: (v: AppViewId) => void;
  status: "connecting" | "open" | "closed" | "error";
  onReconnect: () => void;
  corpusAgeHours: number | null;
  buildMarker: string;
  collapsed: boolean;
}

const NAV: Array<{ id: AppViewId; label: string }> = [
  { id: "queue", label: "Queue" },
  { id: "draft", label: "Draft review" },
  { id: "escalations", label: "Escalations" },
  { id: "savings", label: "Savings" },
];

export function SideNav(props: SideNavProps): React.JSX.Element {
  return (
    <nav className="rz-nav" aria-label="RepeatZero views" role="navigation">
      <div className="rz-nav__links" role="group" aria-label="views">
        {NAV.map((item) => {
          const isActive: boolean = props.active === item.id;
          const showCount: boolean = item.id === "escalations" && props.escalationCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? "strong rz-nav__link rz-nav__link--active" : "strong rz-nav__link"}
              aria-current={isActive ? "page" : undefined}
              onClick={() => props.onNavigate(item.id)}
            >
              {item.label}
              {showCount ? <span className="rz-nav__count"> {props.escalationCount}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="rz-nav__utils">
        <CorpusFreshness ageHours={props.corpusAgeHours} />
        <ConnectionPill status={props.status} onReconnect={props.onReconnect} />
        <span className="id">{props.buildMarker}</span>
      </div>
    </nav>
  );
}
