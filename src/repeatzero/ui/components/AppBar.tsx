import type * as React from "react";
import type { ThemeId } from "../theme.js";
import { Brandmark } from "./Brandmark.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { EXPLAINER_TITLE } from "../help.js";

export interface AppBarProps {
  onExplainer: () => void;
  theme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
}

export function AppBar(props: AppBarProps): React.JSX.Element {
  return (
    <header className="rz-appbar" role="banner">
      <div className="rz-appbar__inner">
        <Brandmark size="header" />
        <div className="rz-appbar__controls">
          <button type="button" className="rz-explainer-button" onClick={props.onExplainer} aria-haspopup="dialog">
            {EXPLAINER_TITLE}
          </button>
          <ThemeToggle theme={props.theme} onChange={props.onThemeChange} />
        </div>
      </div>
    </header>
  );
}
