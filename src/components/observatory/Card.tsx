import { memo, useCallback } from "react";
import type { Catch, DexEntry } from "../../types";
import {
  fmt,
  relativeTime,
  shortNum,
  signalBars,
  tierGlyph,
} from "../../utils/format";
import { SpriteImg } from "../SpriteImg";
import { SHINY_THRESHOLD, TIER_TOOLTIP, TYPE_LABEL } from "./types";

type Props = {
  entry: DexEntry;
  capture: Catch | undefined;
  onSelect: (entry: DexEntry) => void;
};

const SIGNAL_BARS = [0, 1, 2, 3, 4] as const;

export const Card = memo(function Card({
  entry,
  capture,
  onSelect,
}: Props): React.ReactElement {
  const caught = !!capture;
  const bars = signalBars(entry.prevalence);
  const isShiny = caught && capture.encounters >= SHINY_THRESHOLD;

  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(entry);
      }
    },
    [entry, onSelect],
  );

  return (
    <article
      className={`ob-card ${caught ? "is-caught" : "is-uncaught"}${isShiny ? " is-shiny" : ""} ob-tier-bg-${entry.tier}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      aria-label={caught ? entry.displayName : "Unknown tracker"}
    >
      <div className="ob-card-tape">
        <span className="ob-card-rank">
          #{entry.rank.toString().padStart(3, "0")}
        </span>
        <span className="ob-card-type">
          {TYPE_LABEL[entry.type].toUpperCase()}
        </span>
        <span className="ob-card-tier" title={TIER_TOOLTIP[entry.tier]}>
          {tierGlyph(entry.tier)}
        </span>
      </div>
      <div className="ob-card-plate">
        <SpriteImg
          entry={entry}
          scale={6}
          silhouette={!caught}
          variant={isShiny ? 1 : 0}
        />
        {isShiny && (
          <span
            className="ob-card-shiny"
            title={`Shiny variant — unlocked at ≥${fmt(SHINY_THRESHOLD)} encounters with this tracker.`}
            aria-label="Shiny variant"
          >
            ★
          </span>
        )}
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
            {SIGNAL_BARS.map((i) => (
              <span key={i} className={`ob-bar${i < bars ? " is-on" : ""}`} />
            ))}
          </span>
        </div>
        {caught ? (
          <div className="ob-card-enc">
            {shortNum(capture.encounters)} ENC · {relativeTime(capture.lastSeen)}
          </div>
        ) : (
          <div className="ob-card-enc ob-card-enc-locked">UNSEEN</div>
        )}
      </div>
    </article>
  );
});
