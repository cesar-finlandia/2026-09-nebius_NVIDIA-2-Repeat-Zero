import { useEffect, useRef } from "react";
import type * as React from "react";

export interface SendDialogProps {
  open: boolean;
  citationCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SendDialog(props: SendDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!props.open) return;
    openerRef.current = document.activeElement;
    const node: HTMLDivElement | null = dialogRef.current;
    node?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        props.onCancel();
      }
      if (e.key === "Tab" && node !== null) {
        const focusables: NodeListOf<HTMLElement> = node.querySelectorAll(
          'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first: HTMLElement = focusables[0] as HTMLElement;
        const last: HTMLElement = focusables[focusables.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const opener: Element | null = openerRef.current;
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, [props.open, props.onCancel]);
  if (!props.open) {
    return <div aria-hidden="true" />;
  }
  return (
    <div className="rz-dialog-backdrop">
      <div ref={dialogRef} role="dialog" aria-label="Send reply" aria-modal="true" tabIndex={-1} className="rz-dialog">
        <p className="prose">
          This reply cites {props.citationCount} source{props.citationCount === 1 ? "" : "s"}. Send it now?
        </p>
        <div className="rz-dialog__actions">
          <button type="button" onClick={props.onConfirm} aria-label="Confirm send">
            Confirm send
          </button>
          <button type="button" onClick={props.onCancel} aria-label="Cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
