import { useMemo } from "react";
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
  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return dex.entries.filter((e) => {
      const isCaught = !!catches[e.id];
      if (filter.type !== "ALL" && e.type !== filter.type) return false;
      if (filter.tier !== "ALL" && e.tier !== filter.tier) return false;
      if (isCaught && !filter.showCaught) return false;
      if (!isCaught && !filter.showUncaught) return false;
      if (q) {
        if (
          !e.displayName.toLowerCase().includes(q) &&
          !e.entityName.toLowerCase().includes(q) &&
          !e.domains.some((d) => d.includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [dex.entries, catches, filter]);

  // Cap render: show all caught + first N uncaught.
  const visible = useMemo(() => {
    const caught: DexEntry[] = [];
    const uncaught: DexEntry[] = [];
    for (const e of filtered) {
      (catches[e.id] ? caught : uncaught).push(e);
    }
    const tail = Math.max(0, RENDER_CAP - caught.length);
    return [...caught, ...uncaught.slice(0, tail)];
  }, [filtered, catches]);

  const overflow = filtered.length - visible.length;

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
                onClick={() => onSelect(e)}
              />
            ))}
            {overflow > 0 && (
              <div className="ob-card is-uncaught">
                <div className="ob-card-tape">
                  <span className="ob-card-rank">…</span>
                  <span className="ob-card-type">OUT OF VIEW</span>
                  <span className="ob-card-tier">···</span>
                </div>
                <div
                  className="ob-card-plate"
                  style={{ aspectRatio: "1.1" }}
                />
                <div className="ob-card-foot">
                  <div className="ob-card-name">+{overflow.toLocaleString()} more</div>
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
