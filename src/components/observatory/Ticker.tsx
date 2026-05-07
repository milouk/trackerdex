import type { LiveEvent } from "./types";

type Props = {
  events: LiveEvent[];
};

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function Ticker({ events }: Props): React.ReactElement {
  // Doubled for marquee continuity, matching the design.
  const items = events.length === 0 ? [] : [...events, ...events];
  return (
    <div className="ob-ticker">
      <span className="ob-ticker-tag">LIVE</span>
      <div className="ob-ticker-track">
        {items.length === 0 ? (
          <span className="ob-ticker-item">
            <span className="ob-ticker-time">—</span>
            <span className="ob-ticker-arrow">→</span>
            <span className="ob-ticker-domain">
              waiting for the next blocked query
            </span>
          </span>
        ) : (
          items.map((evt, i) => (
            <span key={`${evt.id}-${i}`} className="ob-ticker-item">
              <span className="ob-ticker-time">{fmtTime(evt.time)}</span>
              <span className="ob-ticker-arrow">→</span>
              <span className={`ob-ticker-name ob-tier-${evt.entry.tier}`}>
                {evt.entry.displayName}
              </span>
              <span className="ob-ticker-domain">{evt.domain}</span>
              {evt.isFirstCatch ? (
                <span className="ob-ticker-first">FIRST CONTACT</span>
              ) : null}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
