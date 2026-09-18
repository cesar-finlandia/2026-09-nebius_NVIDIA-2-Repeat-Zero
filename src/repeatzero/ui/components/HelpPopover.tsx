import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { helpContent } from "../help.js";

export interface HelpPopoverProps {
  regionId: string;
}

export function HelpPopover(props: HelpPopoverProps): React.JSX.Element {
  const entry = helpContent[props.regionId];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent): void => {
      const node: HTMLSpanElement | null = wrapRef.current;
      if (node !== null && e.target instanceof Node && !node.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onPointer, true);
    };
  }, [open ]);

  if (entry === undefined) return <></>;
  return (
    <span className="rz-help" ref={wrapRef}>
      <button
        type="button"
        className="rz-help__button"
        data-help-for={props.regionId}
        aria-label={entry.ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <span className="rz-help__popover" role="dialog" aria-label={entry.ariaLabel}>
          <span className="support">{entry.copy}</span>
        </span>
      ) : null}
    </span>
  );
}
