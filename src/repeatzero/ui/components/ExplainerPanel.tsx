import { useEffect, useRef } from "react";
import type * as React from "react";
import { EXPLAINER_TITLE, explainerCopy } from "../help.js";

export interface ExplainerPanelProps {
  open: boolean;
  onClose: () => void;
  onTryIt: () => void;
}

export function ExplainerPanel(props: ExplainerPanelProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!props.open) return;
    openerRef.current = document.activeElement;
    const node: HTMLDivElement | null = dialogRef.current;
    node?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      props.onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const opener: Element | null = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [props.open, props.onClose]);

  if (!props.open) return <></>;
  return (
    <div className="rz-explainer-backdrop" onClick={props.onClose}>
      <div
        ref={dialogRef}
        className="rz-explainer"
        role="dialog"
        aria-modal="true"
        aria-label={EXPLAINER_TITLE}
        data-app-explainer="how-repeatzero-works"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="h2">{EXPLAINER_TITLE}</h2>
        <p className="prose">{explainerCopy.what}</p>
        <p className="prose">{explainerCopy.who}</p>
        <ol className="prose rz-explainer__flow">
          {explainerCopy.flow.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="prose">{explainerCopy.howToRead}</p>
        <p className="strong">{explainerCopy.rule}</p>
        <button type="button" className="rz-primary-button" onClick={props.onTryIt}>
          Load the sample queue
        </button>
        <p className="support">{explainerCopy.tryIt}</p>
        <button type="button" className="rz-explainer__close" onClick={props.onClose} aria-label="Close explainer">
          Close
        </button>
      </div>
    </div>
  );
}
