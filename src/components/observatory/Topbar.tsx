import type { Theme } from "../../theme";

const VERSION = import.meta.env.VITE_VERSION ?? "dev";

type Props = {
  baseUrl: string;
  onDisconnect: () => void;
  theme: Theme;
  onToggleTheme: () => void;
};

export function Topbar({
  baseUrl,
  onDisconnect,
  theme,
  onToggleTheme,
}: Props): React.ReactElement {
  const host = baseUrl.replace(/^https?:\/\//, "");
  return (
    <header className="ob-topbar">
      <div className="ob-brand">
        <div className="ob-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="0.6" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="ob-brand-text">
          <span className="ob-brand-name">TRACKERDEX</span>
          <span className="ob-brand-sub">
            SIGNAL OBSERVATORY · v{VERSION}
          </span>
        </div>
      </div>
      <div className="ob-topbar-status">
        <span className="ob-pulse" />
        <span className="ob-status-line">UPLINK</span>
        <span className="ob-status-value">{host}</span>
        <span className="ob-status-sep">·</span>
        <span className="ob-status-line">SAMPLE</span>
        <span className="ob-status-value">live</span>
      </div>
      <div className="ob-topbar-actions">
        <button
          type="button"
          className="ob-iconbtn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          type="button"
          className="ob-textbtn"
          onClick={onDisconnect}
          title="Disconnect"
        >
          DISCONNECT
        </button>
      </div>
    </header>
  );
}
