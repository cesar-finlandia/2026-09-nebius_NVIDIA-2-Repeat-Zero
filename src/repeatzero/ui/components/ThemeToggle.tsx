import type * as React from "react";
import type { ThemeId } from "../theme.js";
import { MoonGlyph, SunGlyph } from "./Glyphs.js";

export interface ThemeToggleProps {
  theme: ThemeId;
  onChange: (t: ThemeId) => void;
}

export function ThemeToggle(props: ThemeToggleProps): React.JSX.Element {
  const next: ThemeId = props.theme === "light" ? "dark" : "light";
  const label: string = props.theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.theme === "dark"}
      aria-label={label}
      className="rz-toggle"
      onClick={() => props.onChange(next)}
    >
      <span className="rz-toggle__knob" aria-hidden="true">
        {props.theme === "light" ? <SunGlyph /> : <MoonGlyph />}
      </span>
    </button>
  );
}
