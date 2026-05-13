import type { Catch, CatchState, StoredConnection } from "./types";

const NS = "trackerdex:v1:";
const KEY_CATCHES = `${NS}catches`;
const KEY_CONN = `${NS}connection`;

function isCatch(x: unknown): x is Catch {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.firstSeen === "number" &&
    typeof c.lastSeen === "number" &&
    typeof c.encounters === "number"
  );
}

function isCatchState(x: unknown): x is CatchState {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  return Object.values(x as Record<string, unknown>).every(isCatch);
}

function isStoredConnection(x: unknown): x is StoredConnection {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.baseUrl === "string" &&
    typeof c.sid === "string" &&
    typeof c.expiresAt === "number"
  );
}

export function loadCatches(): CatchState {
  try {
    const raw = localStorage.getItem(KEY_CATCHES);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isCatchState(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCatches(state: CatchState): void {
  try {
    localStorage.setItem(KEY_CATCHES, JSON.stringify(state));
  } catch {
    // quota exceeded; nothing we can do here
  }
}

export function loadConnection(): StoredConnection | null {
  try {
    const raw = localStorage.getItem(KEY_CONN);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredConnection(parsed)) return null;
    if (parsed.expiresAt < Date.now() + 5_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConnection(conn: StoredConnection | null): void {
  if (!conn) {
    localStorage.removeItem(KEY_CONN);
    return;
  }
  localStorage.setItem(KEY_CONN, JSON.stringify(conn));
}
