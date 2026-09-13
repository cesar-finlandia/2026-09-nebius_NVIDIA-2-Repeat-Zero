import type * as React from "react";

export function SentGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="currentColor" />
    </svg>
  );
}

export function EscalateGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 1 L11 11 L1 11 Z" fill="currentColor" />
    </svg>
  );
}

export function WorkingGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6 1 A5 5 0 0 1 11 6 L6 6 Z" fill="currentColor" />
    </svg>
  );
}

export function UnverifiedGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function NoSourceGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SunGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="0" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="11.5" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.5" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function MoonGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
      <path d="M11 8 A4.5 4.5 0 0 1 6 3 A4.5 4.5 0 1 0 11 8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CaretGlyph(props: { className?: string }): React.JSX.Element {
  return (
    <svg className={props.className} aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12">
      <path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
