import type * as React from "react";

export function Brandmark(props: { size?: "header" | "slide" | "cover" }): React.JSX.Element {
  const cls: string =
    props.size === "slide"
      ? "brandmark brandmark--slide"
      : props.size === "cover"
        ? "brandmark brandmark--cover"
        : "brandmark brandmark--header";
  return (
    <span className={cls} aria-label="RepeatZero — The queue clears itself.">
      <svg className="brandmark__mark" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="11.25" stroke="currentColor" strokeWidth="3" />
        <rect x="9.25" y="12.25" width="13.5" height="3" rx="1.5" fill="currentColor" />
        <rect x="9.25" y="19" width="6.75" height="3" rx="1.5" fill="currentColor" />
      </svg>
      <span className="brandmark__stack">
        <span className="brandmark__word">RepeatZero</span>
        <span className="brandmark__slogan">The queue clears itself.</span>
      </span>
    </span>
  );
}
