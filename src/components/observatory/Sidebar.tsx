import { memo, useMemo } from "react";
import type { CatchState, DexEntry, Tier, TrackerType } from "../../types";
import { fmt } from "../../utils/format";
import {
  RARITY_TOOLTIP,
  TIERS_ORDER,
  TIER_TOOLTIP,
  TYPE_LABEL,
  TYPES_ORDER,
  type Filter,
  type View,
} from "./types";

type Props = {
  entries: DexEntry[];
  catches: CatchState;
  filter: Filter;
  onChange: (next: Filter) => void;
};

const VIEW_OPTIONS: { value: View; label: string; tip: string }[] = [
  { value: "ALL",      label: "ALL",      tip: "Show every entry — caught and uncaught." },
  { value: "CAUGHT",   label: "CAUGHT",   tip: "Show only the entries you've encountered in your Pi-hole." },
  { value: "UNCAUGHT", label: "UNCAUGHT", tip: "Show only the entries you haven't seen yet — silhouettes." },
];

const EMPTY_TYPE_COUNTS = (): Record<TrackerType, number> => ({
  ADVERTISING: 0,
  ANALYTICS: 0,
  SOCIAL: 0,
  CDN: 0,
  DATA_BROKER: 0,
  OTHER: 0,
});

const EMPTY_TIER_COUNTS = (): Record<Tier, number> => ({
  LEGENDARY: 0,
  RARE: 0,
  UNCOMMON: 0,
  COMMON: 0,
});

export const Sidebar = memo(function Sidebar({
  entries,
  catches,
  filter,
  onChange,
}: Props): React.ReactElement {
  const counts = useMemo(() => {
    const typeTotal = EMPTY_TYPE_COUNTS();
    const typeCaught = EMPTY_TYPE_COUNTS();
    const tierTotal = EMPTY_TIER_COUNTS();
    const tierCaught = EMPTY_TIER_COUNTS();
    let totalCaught = 0;
    for (const e of entries) {
      typeTotal[e.type]++;
      tierTotal[e.tier]++;
      if (catches[e.id]) {
        totalCaught++;
        typeCaught[e.type]++;
        tierCaught[e.tier]++;
      }
    }
    return { typeTotal, typeCaught, tierTotal, tierCaught, totalCaught };
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
        <header
          className="ob-side-head"
          title="Type — what kind of tracker this is. Derived from DuckDuckGo Tracker Radar's category for each entity."
        >
          <span>TYPE</span>
        </header>
        <ul className="ob-side-list">
          <FilterRow
            active={filter.type === "ALL"}
            label="ALL"
            count={fmt(entries.length)}
            onClick={() => onChange({ ...filter, type: "ALL" })}
          />
          {TYPES_ORDER.map((t) => (
            <FilterRow
              key={t}
              active={filter.type === t}
              dotClass={`ob-type-${t}`}
              label={TYPE_LABEL[t].toUpperCase()}
              count={
                <>
                  {counts.typeCaught[t]}
                  <span className="ob-side-denom">/{counts.typeTotal[t]}</span>
                </>
              }
              onClick={() => onChange({ ...filter, type: t })}
            />
          ))}
        </ul>
      </section>

      <section className="ob-side-block">
        <header className="ob-side-head" title={RARITY_TOOLTIP}>
          <span>RARITY</span>
          <span className="ob-side-counter" aria-hidden="true">?</span>
        </header>
        <ul className="ob-side-list">
          <FilterRow
            active={filter.tier === "ALL"}
            label="ALL"
            count={fmt(entries.length)}
            onClick={() => onChange({ ...filter, tier: "ALL" })}
          />
          {TIERS_ORDER.map((t) => (
            <FilterRow
              key={t}
              active={filter.tier === t}
              dotClass={`ob-tier-${t}`}
              label={t}
              tip={TIER_TOOLTIP[t]}
              count={
                <>
                  {counts.tierCaught[t]}
                  <span className="ob-side-denom">/{counts.tierTotal[t]}</span>
                </>
              }
              onClick={() => onChange({ ...filter, tier: t })}
            />
          ))}
        </ul>
      </section>

      <section className="ob-side-block">
        <header className="ob-side-head"><span>VIEW</span></header>
        <ul className="ob-side-list">
          {VIEW_OPTIONS.map((opt) => (
            <FilterRow
              key={opt.value}
              active={filter.view === opt.value}
              label={opt.label}
              tip={opt.tip}
              count={fmt(
                opt.value === "ALL"
                  ? entries.length
                  : opt.value === "CAUGHT"
                    ? counts.totalCaught
                    : entries.length - counts.totalCaught,
              )}
              onClick={() => onChange({ ...filter, view: opt.value })}
            />
          ))}
        </ul>
      </section>
    </aside>
  );
});

type FilterRowProps = {
  active: boolean;
  dotClass?: string;
  label: string;
  count: React.ReactNode;
  tip?: string;
  onClick: () => void;
};

function FilterRow({
  active,
  dotClass,
  label,
  count,
  tip,
  onClick,
}: FilterRowProps): React.ReactElement {
  return (
    <li
      className={`ob-side-item${active ? " is-active" : ""}`}
      onClick={onClick}
      title={tip}
    >
      <span className={`ob-side-dot${dotClass ? ` ${dotClass}` : ""}`} />
      <span className="ob-side-label">{label}</span>
      <span className="ob-side-count">{count}</span>
    </li>
  );
}
