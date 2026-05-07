import type { Catch, DexEntry } from "../../types";
import { SpriteImg } from "../SpriteImg";
import { TYPE_LABEL } from "./types";

type Props = {
  entry: DexEntry;
  capture: Catch | undefined;
  onClick: () => void;
};

function tierGlyph(tier: DexEntry["tier"]): string {
  if (tier === "LEGENDARY") return "◆◆◆";
  if (tier === "RARE") return "◆◆·";
  if (tier === "UNCOMMON") return "◆··";
  return "···";
}

function shortNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function signalBars(prevalence: number): number {
  // 0..1 → 1..5 bars, matching the design's mapping (×28).
  return Math.max(1, Math.min(5, Math.round(prevalence * 28)));
}

export function Card({ entry, capture, onClick }: Props): React.ReactElement {
  const caught = !!capture;
  const bars = signalBars(entry.prevalence);

  return (
    <article
      className={`ob-card ${caught ? "is-caught" : "is-uncaught"} ob-tier-bg-${entry.tier}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="ob-card-tape">
        <span className="ob-card-rank">
          #{String(entry.rank).padStart(3, "0")}
        </span>
        <span className="ob-card-type">
          {TYPE_LABEL[entry.type].toUpperCase()}
        </span>
        <span className="ob-card-tier">{tierGlyph(entry.tier)}</span>
      </div>
      <div className="ob-card-plate">
        <SpriteImg entry={entry} scale={6} silhouette={!caught} />
        <div className="ob-card-reticle" aria-hidden="true">
          <span className="ob-r ob-r-tl" />
          <span className="ob-r ob-r-tr" />
          <span className="ob-r ob-r-bl" />
          <span className="ob-r ob-r-br" />
        </div>
      </div>
      <div className="ob-card-foot">
        <div className="ob-card-name">
          {caught ? entry.displayName : "·  ·  ·  ·  ·"}
        </div>
        <div className="ob-card-meta">
          <span className="ob-card-prev">
            {entry.prevalence > 0
              ? `${(entry.prevalence * 100).toFixed(2)}%`
              : "—"}
          </span>
          <span className="ob-bars" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`ob-bar ${i < bars ? "is-on" : ""}`}
              />
            ))}
          </span>
        </div>
        {caught ? (
          <div className="ob-card-enc">
            {shortNum(capture.encounters)} ENC ·{" "}
            {relativeTime(capture.lastSeen)}
          </div>
        ) : (
          <div className="ob-card-enc ob-card-enc-locked">UNSEEN</div>
        )}
      </div>
    </article>
  );
}
