import { memo, useMemo } from "react";
import type { CatchState, DexEntry } from "../../types";
import { fmt, shortNum } from "../../utils/format";
import { SORT_LABEL, SORT_TOOLTIP, type Sort } from "./types";

type Props = {
  entries: DexEntry[];
  catches: CatchState;
  sort: Sort;
  onCycleSort: () => void;
};

export const PanelHead = memo(function PanelHead({
  entries,
  catches,
  sort,
  onCycleSort,
}: Props): React.ReactElement {
  const stats = useMemo(() => {
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
    return { total: entries.length, caught, encounters, rarePlus };
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
        <div className="ob-pstat ob-pstat-clickable">
          <span className="ob-pstat-label">SORT</span>
          <button
            type="button"
            className="ob-pstat-value ob-pstat-sortable"
            onClick={onCycleSort}
            title={SORT_TOOLTIP}
          >
            {SORT_LABEL[sort]}
          </button>
        </div>
      </div>
    </header>
  );
});
