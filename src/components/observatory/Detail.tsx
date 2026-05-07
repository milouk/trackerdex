import { useEffect } from "react";
import type { Catch, DexEntry } from "../../types";
import {
  fmt,
  isoMinuteUtc,
  shortNum,
  signalBars,
  tierGlyph,
} from "../../utils/format";
import { SpriteImg } from "../SpriteImg";
import {
  DEC_TOOLTIP,
  RA_TOOLTIP,
  SHINY_THRESHOLD,
  TIER_TOOLTIP,
  TYPE_LABEL,
} from "./types";

type Props = {
  entry: DexEntry;
  capture: Catch | undefined;
  onBack: () => void;
};

const SIGNAL_BARS = [0, 1, 2, 3, 4] as const;
const SPARK_BARS = Array.from({ length: 24 }, (_, i) => i);

function fakeRA(entry: DexEntry): string {
  const a = (entry.entityName.length * 13) % 360;
  const b = (entry.rank * 7) % 60;
  return `${a}.${String(b).padStart(2, "0")}°`;
}

function sparkHeight(rank: number, i: number): number {
  return (Math.sin((i + rank) * 0.7) * 0.5 + 0.6) * 30 + 6;
}

export function Detail({
  entry,
  capture,
  onBack,
}: Props): React.ReactElement {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const caught = !!capture;
  const bars = signalBars(entry.prevalence);
  const isShiny = caught && capture.encounters >= SHINY_THRESHOLD;

  return (
    <div className="dir-observatory ob-detail-page">
      <header className="ob-detail-head">
        <span
          className="ob-detail-back"
          onClick={onBack}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBack();
            }
          }}
        >
          ← INDEX
        </span>
        <span className="ob-detail-crumb">PANEL · 02 · OBJECT</span>
        <span className="ob-detail-id">
          DEX-{entry.rank.toString().padStart(4, "0")}
        </span>
      </header>
      <div className="ob-detail-body">
        <section className="ob-detail-plate-wrap">
          <div className="ob-detail-plate">
            <SpriteImg
              entry={entry}
              scale={16}
              silhouette={!caught}
              variant={isShiny ? 1 : 0}
            />
            {isShiny && (
              <span
                className="ob-card-shiny ob-card-shiny-lg"
                title={`Shiny variant — unlocked at ≥${fmt(SHINY_THRESHOLD)} encounters with this tracker.`}
                aria-label="Shiny variant"
              >
                ★
              </span>
            )}
            <div
              className="ob-card-reticle ob-card-reticle-lg"
              aria-hidden="true"
            >
              <span className="ob-r ob-r-tl" />
              <span className="ob-r ob-r-tr" />
              <span className="ob-r ob-r-bl" />
              <span className="ob-r ob-r-br" />
            </div>
          </div>
          <div className="ob-detail-tape">
            <span title={RA_TOOLTIP}>RA · {fakeRA(entry)}</span>
            <span title={DEC_TOOLTIP}>
              DEC · +{(entry.prevalence * 90).toFixed(2)}°
            </span>
            <span title={TIER_TOOLTIP[entry.tier]}>
              TIER {tierGlyph(entry.tier)}
            </span>
          </div>
        </section>
        <section className="ob-detail-text">
          <div className="ob-detail-eyebrow">
            ORDER · {TYPE_LABEL[entry.type].toUpperCase()}
          </div>
          <h2 className="ob-detail-name">
            {caught ? entry.displayName : "Unknown emitter"}
            {isShiny && <span className="ob-shiny-badge">★ shiny</span>}
          </h2>
          <div className="ob-detail-binomial">{entry.entityName}</div>

          <div className="ob-detail-bars">
            <span className="ob-detail-bars-label">SIGNAL</span>
            <span className="ob-bars">
              {SIGNAL_BARS.map((i) => (
                <span key={i} className={`ob-bar${i < bars ? " is-on" : ""}`} />
              ))}
            </span>
            <span className="ob-detail-bars-val">
              {entry.prevalence > 0
                ? `${(entry.prevalence * 100).toFixed(2)}% OF CRAWL`
                : "BELOW DETECTION"}
            </span>
          </div>

          <dl className="ob-detail-stats">
            <div>
              <dt>OWNED DOMAINS</dt>
              <dd>{fmt(entry.domainCount)}</dd>
            </div>
            <div>
              <dt>ENCOUNTERS · THIS NET</dt>
              <dd>{caught ? fmt(capture.encounters) : "—"}</dd>
            </div>
            <div>
              <dt>FIRST CONTACT</dt>
              <dd>{caught ? isoMinuteUtc(capture.firstSeen) : "PENDING"}</dd>
            </div>
            <div>
              <dt>LAST CONTACT</dt>
              <dd>{caught ? isoMinuteUtc(capture.lastSeen) : "—"}</dd>
            </div>
            <div>
              <dt>PRIMARY DOMAIN</dt>
              <dd>
                <code>{entry.domains[0] ?? "—"}</code>
              </dd>
            </div>
            <div title={TIER_TOOLTIP[entry.tier]}>
              <dt>CLASSIFICATION</dt>
              <dd>{entry.tier}</dd>
            </div>
          </dl>

          <div className="ob-detail-spark">
            <div className="ob-detail-spark-head">
              <span>ENCOUNTER VELOCITY · INDICATIVE</span>
              <span>{shortNum(caught ? capture.encounters : 0)} TOTAL</span>
            </div>
            <div className="ob-detail-spark-grid">
              {SPARK_BARS.map((i) => (
                <span
                  key={i}
                  className="ob-spark-bar"
                  style={{ height: `${sparkHeight(entry.rank, i)}%` }}
                />
              ))}
            </div>
          </div>

          <div className="ob-detail-domains">
            <div className="ob-detail-spark-head">
              <span>OWNED DOMAINS · {fmt(entry.domainCount)}</span>
              {entry.domainCount > 200 && <span>showing first 200</span>}
            </div>
            <ul className="ob-detail-domains-list">
              {entry.domains.slice(0, 200).map((d) => (
                <li key={d}>
                  <code>{d}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
