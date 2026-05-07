import { useEffect } from "react";
import type { Catch, DexEntry } from "../../types";
import { SpriteImg } from "../SpriteImg";
import { TYPE_LABEL } from "./types";

type Props = {
  entry: DexEntry;
  capture: Catch | undefined;
  onBack: () => void;
};

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function shortNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

function tierGlyph(tier: DexEntry["tier"]): string {
  if (tier === "LEGENDARY") return "◆◆◆";
  if (tier === "RARE") return "◆◆·";
  if (tier === "UNCOMMON") return "◆··";
  return "···";
}

function signalBars(prevalence: number): number {
  return Math.max(1, Math.min(5, Math.round(prevalence * 28)));
}

function fakeRA(entry: DexEntry): string {
  const a = (entry.entityName.length * 13) % 360;
  const b = (entry.rank * 7) % 60;
  return `${a}.${String(b).padStart(2, "0")}°`;
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

  return (
    <div className="dir-observatory ob-detail-page">
      <header className="ob-detail-head">
        <span
          className="ob-detail-back"
          onClick={onBack}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? onBack() : null)}
        >
          ← INDEX
        </span>
        <span className="ob-detail-crumb">PANEL · 02 · OBJECT</span>
        <span className="ob-detail-id">
          DEX-{String(entry.rank).padStart(4, "0")}
        </span>
      </header>
      <div className="ob-detail-body">
        <section className="ob-detail-plate-wrap">
          <div className="ob-detail-plate">
            <SpriteImg entry={entry} scale={16} silhouette={!caught} />
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
            <span>RA · {fakeRA(entry)}</span>
            <span>DEC · +{(entry.prevalence * 90).toFixed(2)}°</span>
            <span>TIER {tierGlyph(entry.tier)}</span>
          </div>
        </section>
        <section className="ob-detail-text">
          <div className="ob-detail-eyebrow">
            ORDER · {TYPE_LABEL[entry.type].toUpperCase()}
          </div>
          <h2 className="ob-detail-name">
            {caught ? entry.displayName : "Unknown emitter"}
          </h2>
          <div className="ob-detail-binomial">{entry.entityName}</div>

          <div className="ob-detail-bars">
            <span className="ob-detail-bars-label">SIGNAL</span>
            <span className="ob-bars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`ob-bar ${i < bars ? "is-on" : ""}`}
                />
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
              <dd>
                {caught
                  ? new Date(capture.firstSeen).toISOString().slice(0, 16) +
                    "Z"
                  : "PENDING"}
              </dd>
            </div>
            <div>
              <dt>LAST CONTACT</dt>
              <dd>
                {caught
                  ? new Date(capture.lastSeen).toISOString().slice(0, 16) +
                    "Z"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>PRIMARY DOMAIN</dt>
              <dd>
                <code>{entry.domains[0] ?? "—"}</code>
              </dd>
            </div>
            <div>
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
              {Array.from({ length: 24 }).map((_, i) => {
                const h =
                  (Math.sin((i + entry.rank) * 0.7) * 0.5 + 0.6) * 30 + 6;
                return (
                  <span
                    key={i}
                    className="ob-spark-bar"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
