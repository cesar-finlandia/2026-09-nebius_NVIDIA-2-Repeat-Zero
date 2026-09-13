import type * as React from "react";

export interface ConnectionPillProps {
  status: "connecting" | "open" | "closed" | "error";
  onReconnect: () => void;
}

export function ConnectionPill(props: ConnectionPillProps): React.JSX.Element {
  if (props.status === "open") {
    return (
      <span className="rz-pill rz-pill--open caption" role="status" aria-label="connection open">
        connected
      </span>
    );
  }
  if (props.status === "error") {
    return (
      <span className="rz-pill rz-pill--error caption" role="status" aria-label="connection error">
        disconnected{" "}
        <button type="button" onClick={props.onReconnect} aria-label="Reconnect">
          Reconnect
        </button>
      </span>
    );
  }
  if (props.status === "closed") {
    return (
      <span className="rz-pill rz-pill--closed caption" role="status" aria-label="connection snapshot">
        snapshot — showing the completed queue
      </span>
    );
  }
  return (
    <span className="rz-pill rz-pill--connecting caption" role="status" aria-label="connection connecting">
      connecting
    </span>
  );
}
