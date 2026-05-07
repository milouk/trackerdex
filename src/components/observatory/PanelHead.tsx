import { useMemo } from "react";
import type { CatchState, DexEntry } from "../../types";

type Props = {
  entries: DexEntry[];
  catches: CatchState;
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

export function PanelHead({ entries, catches }: Props): React.ReactElement {
  const stats = useMemo(() => {
    const total = entries.length;
    let caught = 0;
    let encounters = 0;
    let rarePlus = 0;
    for (const e of entries) {
      const cap = catches[e.id];
      if (!cap) continue;
      caught++;
      encounters += cap.encounters;
      if (e.tier === "RARE" || e.tier === "LEGENDARY") rarePlus++;
    }
    return { total, caught, encounters, rarePlus };
  }, [entries, catches]);

  return (
    <header className="ob-panel-head">
      <div className="ob-panel-title">
        <span className="ob-panel-eyebrow">PANEL · 01</span>
        <h2>Index — known emitters in observable range</h2>
      </div>
      <div className="ob-panel-stats">
        <div className="ob-pstat">
          <span className="ob-pstat-label">CATALOGUED</span>
          <span className="ob-pstat-value">
            {fmt(stats.caught)}
            <span className="ob-pstat-denom">/ {fmt(stats.total)}</span>
          </span>
        </div>
        <div className="ob-pstat">
          <span className="ob-pstat-label">ENCOUNTERS</span>
          <span className="ob-pstat-value">{shortNum(stats.encounters)}</span>
        </div>
        <div className="ob-pstat">
          <span className="ob-pstat-label">RARE+ ON GRID</span>
          <span className="ob-pstat-value">{stats.rarePlus}</span>
        </div>
        <div className="ob-pstat">
          <span className="ob-pstat-label">SORT</span>
          <span className="ob-pstat-value ob-pstat-sortable">
            PREVALENCE ↓
          </span>
        </div>
      </div>
    </header>
  );
}
