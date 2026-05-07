import { useCallback, useMemo, useState } from "react";
import type { Theme } from "../../theme";
import type { CatchState, Dex, DexEntry } from "../../types";
import { Card } from "./Card";
import { Footstrip } from "./Footstrip";
import { PanelHead } from "./PanelHead";
import { Sidebar } from "./Sidebar";
import { Ticker } from "./Ticker";
import { Topbar } from "./Topbar";
import {
  SORT_ORDER,
  type Filter,
  type LiveEvent,
  type Sort,
} from "./types";

type Props = {
  dex: Dex;
  catches: CatchState;
  feed: LiveEvent[];
  baseUrl: string;
  filter: Filter;
  onFilterChange: (next: Filter) => void;
  onSelect: (entry: DexEntry) => void;
  onDisconnect: () => void;
  theme: Theme;
  onToggleTheme: () => void;
};

const RENDER_CAP = 240;

function sortEntries(
  list: DexEntry[],
  sort: Sort,
  catches: CatchState,
): DexEntry[] {
  const sorted = list.slice();
  switch (sort) {
    case "PREVALENCE":
      // Already in rank order from the dex builder, but explicit so tier/type
      // filters still produce a stable rank-asc ordering.
      sorted.sort((a, b) => a.rank - b.rank);
      break;
    case "RECENT":
      sorted.sort((a, b) => {
        const la = catches[a.id]?.lastSeen ?? -1;
        const lb = catches[b.id]?.lastSeen ?? -1;
        return lb - la || a.rank - b.rank;
      });
      break;
    case "ENCOUNTERS":
      sorted.sort((a, b) => {
        const ea = catches[a.id]?.encounters ?? 0;
        const eb = catches[b.id]?.encounters ?? 0;
        return eb - ea || a.rank - b.rank;
      });
      break;
    case "NAME":
      sorted.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "en", {
          sensitivity: "base",
        }),
      );
      break;
  }
  return sorted;
}

export function Shell({
  dex,
  catches,
  feed,
  baseUrl,
  filter,
  onFilterChange,
  onSelect,
  onDisconnect,
  theme,
  onToggleTheme,
}: Props): React.ReactElement {
  const [sort, setSort] = useState<Sort>("PREVALENCE");

  // Stable callbacks so memoized children don't re-render on every Shell tick.
  const handleSelect = useCallback(
    (entry: DexEntry) => onSelect(entry),
    [onSelect],
  );
  const cycleSort = useCallback(() => {
    setSort((current) => {
      const idx = SORT_ORDER.indexOf(current);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length]!;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    const out: DexEntry[] = [];
    for (const e of dex.entries) {
      if (filter.type !== "ALL" && e.type !== filter.type) continue;
      if (filter.tier !== "ALL" && e.tier !== filter.tier) continue;
      const isCaught = !!catches[e.id];
      if (filter.view === "CAUGHT" && !isCaught) continue;
      if (filter.view === "UNCAUGHT" && isCaught) continue;
      if (q) {
        if (
          !e.displayName.toLowerCase().includes(q) &&
          !e.entityName.toLowerCase().includes(q)
        ) {
          let matched = false;
          for (const d of e.domains) {
            if (d.includes(q)) {
              matched = true;
              break;
            }
          }
          if (!matched) continue;
        }
      }
      out.push(e);
    }
    return out;
  }, [dex.entries, catches, filter]);

  const sorted = useMemo(
    () => sortEntries(filtered, sort, catches),
    [filtered, sort, catches],
  );

  const visible = sorted.slice(0, RENDER_CAP);
  const overflow = sorted.length - visible.length;

  return (
    <div className="dir-observatory">
      <Topbar
        baseUrl={baseUrl}
        onDisconnect={onDisconnect}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <Ticker events={feed} />
      <div className="ob-body">
        <Sidebar
          entries={dex.entries}
          catches={catches}
          filter={filter}
          onChange={onFilterChange}
        />
        <main className="ob-main">
          <PanelHead
            entries={dex.entries}
            catches={catches}
            sort={sort}
            onCycleSort={cycleSort}
          />
          <div className="ob-grid is-comfy">
            {visible.map((e) => (
              <Card
                key={e.id}
                entry={e}
                capture={catches[e.id]}
                onSelect={handleSelect}
              />
            ))}
            {overflow > 0 && (
              <div className="ob-card is-uncaught" aria-hidden="true">
                <div className="ob-card-tape">
                  <span className="ob-card-rank">…</span>
                  <span className="ob-card-type">OUT OF VIEW</span>
                  <span className="ob-card-tier">···</span>
                </div>
                <div className="ob-card-plate" style={{ aspectRatio: "1.1" }} />
                <div className="ob-card-foot">
                  <div className="ob-card-name">
                    +{overflow.toLocaleString()} more
                  </div>
                  <div className="ob-card-enc ob-card-enc-locked">
                    NARROW QUERY
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footstrip generatedAt={dex.generatedAt} />
    </div>
  );
}
