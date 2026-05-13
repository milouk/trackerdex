import { useEffect, useMemo } from "react";
import { type LiveEvent } from "../components/observatory";
import { buildDemoFeedSource, nextDemoEvent } from "../demo";
import type { CatchState, Dex } from "../types";
import type { Status } from "./useBoot";

const DEMO_TICK_MS = 4_500;
const DEMO_FEED_CAPACITY = 30;
const DEMO_PRIMER_TICKS = 6;

export function useDemoTicker(args: {
  status: Status;
  dex: Dex | null;
  catches: CatchState;
  setFeed: React.Dispatch<React.SetStateAction<LiveEvent[]>>;
}): void {
  const { status, dex, catches, setFeed } = args;

  const source = useMemo(() => {
    if (status.kind !== "demo" || !dex) return null;
    return buildDemoFeedSource(dex, catches);
  }, [status.kind, dex, catches]);

  useEffect(() => {
    if (!source || source.totalWeight === 0) return;
    let i = 0;
    const tick = () => {
      const evt = nextDemoEvent(source, Date.now() + i++);
      if (evt) setFeed((prev) => [evt, ...prev].slice(0, DEMO_FEED_CAPACITY));
    };
    for (let k = 0; k < DEMO_PRIMER_TICKS; k++) tick();
    const id = window.setInterval(tick, DEMO_TICK_MS);
    return () => window.clearInterval(id);
  }, [source, setFeed]);
}
