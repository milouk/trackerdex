import { useEffect, useState } from "react";
import { loadConfig, type RuntimeConfig } from "../config";
import { loadDex } from "../dex";
import { PiholeClient } from "../pihole";
import { loadConnection, saveConnection } from "../storage";
import { warmSpriteCache } from "../sprite";
import type { Dex, StoredConnection } from "../types";

export type Status =
  | { kind: "loading" }
  | { kind: "needs-connection" }
  | { kind: "connected"; client: PiholeClient; baseUrl: string }
  | { kind: "demo" }
  | { kind: "error"; message: string };

const SPRITE_WARM_COUNT = 240;
const MIN_VALIDITY_BUFFER_MS = 30_000;

export function useBoot(): {
  status: Status;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  dex: Dex | null;
  config: RuntimeConfig;
} {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [dex, setDex] = useState<Dex | null>(null);
  const [config, setConfig] = useState<RuntimeConfig>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [loaded, runtime] = await Promise.all([loadDex(), loadConfig()]);
        if (!alive) return;
        setDex(loaded);
        setConfig(runtime);
        warmSpriteCache(
          loaded.entries.slice(0, SPRITE_WARM_COUNT).map((e) => e.entityName),
        );

        const autoConnected = await tryAutoConnect(runtime);
        if (!alive) return;
        if (autoConnected) {
          setStatus(autoConnected);
          return;
        }

        const fromSaved = await trySavedSession();
        if (!alive) return;
        if (fromSaved) {
          setStatus(fromSaved);
          return;
        }

        setStatus({ kind: "needs-connection" });
      } catch (err) {
        if (!alive) return;
        setStatus({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Failed to load tracker dex",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { status, setStatus, dex, config };
}

// Container-provided SID takes priority over any stale saved session. The
// container's entrypoint re-authenticates against Pi-hole at startup, so a
// just-written SID is the freshest signal we have.
async function tryAutoConnect(
  runtime: RuntimeConfig,
): Promise<Status | null> {
  if (
    !runtime.sid ||
    !runtime.expiresAt ||
    runtime.expiresAt * 1000 <= Date.now() + MIN_VALIDITY_BUFFER_MS
  ) {
    return null;
  }
  const url = runtime.piholeHost || window.location.origin;
  const expiresAtMs = runtime.expiresAt * 1000;
  const client = new PiholeClient(url, {
    sid: runtime.sid,
    validity: Math.max(30, Math.floor(runtime.expiresAt - Date.now() / 1000)),
    expiresAt: expiresAtMs,
  });
  try {
    await client.getSummary();
  } catch {
    return null;
  }
  const stored: StoredConnection = {
    baseUrl: client.baseUrl,
    sid: runtime.sid,
    expiresAt: expiresAtMs,
  };
  saveConnection(stored);
  return { kind: "connected", client, baseUrl: client.baseUrl };
}

async function trySavedSession(): Promise<Status | null> {
  const saved = loadConnection();
  if (!saved) return null;
  const client = new PiholeClient(saved.baseUrl, {
    sid: saved.sid,
    validity: Math.max(30, Math.floor((saved.expiresAt - Date.now()) / 1000)),
    expiresAt: saved.expiresAt,
  });
  try {
    await client.getSummary();
    return { kind: "connected", client, baseUrl: client.baseUrl };
  } catch {
    saveConnection(null);
    return null;
  }
}
