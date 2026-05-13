import { useCallback, useEffect, useState } from "react";
import {
  Connect,
  Detail,
  Shell,
  type Filter,
  type LiveEvent,
} from "./components/observatory";
import { DEMO_BASE_URL, generateDemoCatches } from "./demo";
import { useBoot } from "./hooks/useBoot";
import { useDemoTicker } from "./hooks/useDemoTicker";
import { useLiveFeed } from "./hooks/useLiveFeed";
import { PiholeClient } from "./pihole";
import {
  loadCatches,
  saveCatches,
  saveConnection,
} from "./storage";
import { useTheme } from "./theme";
import type { CatchState, DexEntry, StoredConnection } from "./types";

const SAVE_DEBOUNCE_MS = 400;

const DEFAULT_FILTER: Filter = {
  type: "ALL",
  tier: "ALL",
  query: "",
  view: "ALL",
};

export default function App(): React.ReactElement {
  const { status, setStatus, dex, config } = useBoot();
  const [catches, setCatches] = useState<CatchState>(() => loadCatches());
  const [selected, setSelected] = useState<DexEntry | null>(null);
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const { theme, toggle: toggleTheme } = useTheme();

  // Demo state is in-memory only — never persist synthetic catches.
  useEffect(() => {
    if (status.kind === "demo") return;
    const id = window.setTimeout(() => saveCatches(catches), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [catches, status.kind]);

  useLiveFeed({ status, dex, setCatches, setFeed });
  useDemoTicker({ status, dex, catches, setFeed });

  const handleConnect = useCallback(
    (client: PiholeClient, conn: StoredConnection) => {
      saveConnection(conn);
      setStatus({ kind: "connected", client, baseUrl: client.baseUrl });
    },
    [setStatus],
  );

  const handleDisconnect = useCallback(async () => {
    if (status.kind === "connected") {
      try {
        await status.client.logout();
      } catch {
        /* ignore */
      }
    }
    if (status.kind === "demo") {
      setCatches(loadCatches());
    }
    saveConnection(null);
    setFeed([]);
    setSelected(null);
    setStatus({ kind: "needs-connection" });
  }, [status, setStatus]);

  const handleDemo = useCallback(() => {
    if (!dex) return;
    setCatches(generateDemoCatches(dex));
    setFeed([]);
    setStatus({ kind: "demo" });
  }, [dex, setStatus]);

  if (status.kind === "loading") return <Loading />;
  if (status.kind === "error") return <ErrorPanel message={status.message} />;
  if (status.kind === "needs-connection") {
    return (
      <Connect
        onConnect={handleConnect}
        onDemo={handleDemo}
        defaults={{ host: config.piholeHost }}
      />
    );
  }
  if (!dex) return <Loading />;

  if (selected) {
    return (
      <Detail
        entry={selected}
        capture={catches[selected.id]}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <Shell
      dex={dex}
      catches={catches}
      feed={feed}
      baseUrl={status.kind === "connected" ? status.baseUrl : DEMO_BASE_URL}
      filter={filter}
      onFilterChange={setFilter}
      onSelect={setSelected}
      onDisconnect={handleDisconnect}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

function Loading(): React.ReactElement {
  return (
    <div className="dir-observatory ob-states-page">
      <div className="ob-state">
        <div className="ob-state-tape">SCAN · ACQUIRING</div>
        <div className="ob-state-body">
          <div className="ob-state-loading">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="ob-loading-cell"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
          <div className="ob-state-cap">Reading the catalogue…</div>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }): React.ReactElement {
  return (
    <div className="dir-observatory ob-states-page">
      <div className="ob-state">
        <div className="ob-state-tape ob-state-err">UPLINK · LOST</div>
        <div className="ob-state-body">
          <div className="ob-state-error">!</div>
          <div className="ob-state-headline">{message}</div>
          <div className="ob-state-cap">
            Reload the page once you've fixed the issue.
          </div>
        </div>
      </div>
    </div>
  );
}
