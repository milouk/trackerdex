import { useCallback, useMemo } from "react";
import type { Theme } from "../../theme";
import type { CatchState, Dex, DexEntry } from "../../types";
import { Card } from "./Card";
import { Footstrip } from "./Footstrip";
import { PanelHead } from "./PanelHead";
import { Sidebar } from "./Sidebar";
import { Ticker } from "./Ticker";
import { Topbar } from "./Topbar";
import type { Filter, LiveEvent } from "./types";

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
  // Stable callback so memoized Card never re-renders just because Shell did.
  const handleSelect = useCallback(
    (entry: DexEntry) => onSelect(entry),
    [onSelect],
  );

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
          // Fall back to scanning owned domains only when the cheap checks miss.
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

  // Cap render: keep all caught + first N uncaught.
  const { visible, overflow } = useMemo(() => {
    const caughtList: DexEntry[] = [];
    const uncaughtList: DexEntry[] = [];
    for (const e of filtered) {
      (catches[e.id] ? caughtList : uncaughtList).push(e);
    }
    const tail = Math.max(0, RENDER_CAP - caughtList.length);
    const list = caughtList.concat(uncaughtList.slice(0, tail));
    return { visible: list, overflow: filtered.length - list.length };
  }, [filtered, catches]);

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
          <PanelHead entries={dex.entries} catches={catches} />
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
