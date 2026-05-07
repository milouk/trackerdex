import { useMemo } from "react";
import type { CatchState, DexEntry, Tier, TrackerType } from "../../types";
import {
  TIERS_ORDER,
  TYPE_LABEL,
  TYPES_ORDER,
  type Filter,
} from "./types";

type Props = {
  entries: DexEntry[];
  catches: CatchState;
  filter: Filter;
  onChange: (next: Filter) => void;
};

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function Sidebar({
  entries,
  catches,
  filter,
  onChange,
}: Props): React.ReactElement {
  const { typeCounts, typeCaught, tierCounts, tierCaught } = useMemo(() => {
    const tc: Record<TrackerType, number> = {
      ADVERTISING: 0,
      ANALYTICS: 0,
      SOCIAL: 0,
      CDN: 0,
      DATA_BROKER: 0,
      OTHER: 0,
    };
    const tCaught: Record<TrackerType, number> = { ...tc };
    const trc: Record<Tier, number> = {
      LEGENDARY: 0,
      RARE: 0,
      UNCOMMON: 0,
      COMMON: 0,
    };
    const trCaught: Record<Tier, number> = { ...trc };
    for (const e of entries) {
      tc[e.type]++;
      trc[e.tier]++;
      if (catches[e.id]) {
        tCaught[e.type]++;
        trCaught[e.tier]++;
      }
    }
    return {
      typeCounts: tc,
      typeCaught: tCaught,
      tierCounts: trc,
      tierCaught: trCaught,
    };
  }, [entries, catches]);

  return (
    <aside className="ob-sidebar">
      <section className="ob-side-block">
        <header className="ob-side-head">
          <span>QUERY</span>
          <span className="ob-side-counter">/</span>
        </header>
        <div className="ob-side-search">
          <span className="ob-side-prompt">$</span>
          <input
            type="text"
            value={filter.query}
            placeholder="grep entity / domain / type"
            onChange={(e) => onChange({ ...filter, query: e.target.value })}
          />
        </div>
      </section>

      <section className="ob-side-block">
        <header className="ob-side-head">
          <span>TAXA</span>
        </header>
        <ul className="ob-side-list">
          <li
            className={`ob-side-item ${filter.type === "ALL" ? "is-active" : ""}`}
            onClick={() => onChange({ ...filter, type: "ALL" })}
          >
            <span className="ob-side-dot" />
            <span className="ob-side-label">ALL</span>
            <span className="ob-side-count">{fmt(entries.length)}</span>
          </li>
          {TYPES_ORDER.map((t) => (
            <li
              key={t}
              className={`ob-side-item ${filter.type === t ? "is-active" : ""}`}
              onClick={() => onChange({ ...filter, type: t })}
            >
              <span className={`ob-side-dot ob-type-${t}`} />
              <span className="ob-side-label">
                {TYPE_LABEL[t].toUpperCase()}
              </span>
              <span className="ob-side-count">
                {typeCaught[t]}
                <span className="ob-side-denom">/{typeCounts[t]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ob-side-block">
        <header className="ob-side-head">
          <span>RARITY</span>
        </header>
        <ul className="ob-side-list">
          <li
            className={`ob-side-item ${filter.tier === "ALL" ? "is-active" : ""}`}
            onClick={() => onChange({ ...filter, tier: "ALL" })}
          >
            <span className="ob-side-dot" />
            <span className="ob-side-label">ALL</span>
            <span className="ob-side-count">{fmt(entries.length)}</span>
          </li>
          {TIERS_ORDER.map((t) => (
            <li
              key={t}
              className={`ob-side-item ${filter.tier === t ? "is-active" : ""}`}
              onClick={() => onChange({ ...filter, tier: t })}
            >
              <span className={`ob-side-dot ob-tier-${t}`} />
              <span className="ob-side-label">{t}</span>
              <span className="ob-side-count">
                {tierCaught[t]}
                <span className="ob-side-denom">/{tierCounts[t]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ob-side-block">
        <header className="ob-side-head">
          <span>STATUS</span>
        </header>
        <ul className="ob-side-list">
          <li
            className="ob-side-item is-toggle"
            onClick={() =>
              onChange({ ...filter, showCaught: !filter.showCaught })
            }
          >
            <span className="ob-side-label">CAUGHT</span>
            <span className={`ob-toggle ${filter.showCaught ? "is-on" : ""}`}>
              {filter.showCaught ? "ON" : "OFF"}
            </span>
          </li>
          <li
            className="ob-side-item is-toggle"
            onClick={() =>
              onChange({ ...filter, showUncaught: !filter.showUncaught })
            }
          >
            <span className="ob-side-label">UNSEEN</span>
            <span className={`ob-toggle ${filter.showUncaught ? "is-on" : ""}`}>
              {filter.showUncaught ? "ON" : "OFF"}
            </span>
          </li>
        </ul>
      </section>
    </aside>
  );
}
