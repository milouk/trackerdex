import type { CatchState, StoredConnection } from "./types";

const NS = "trackerdex:v1:";
const KEY_CATCHES = `${NS}catches`;
const KEY_CONN = `${NS}connection`;

export function loadCatches(): CatchState {
  try {
    const raw = localStorage.getItem(KEY_CATCHES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as CatchState) : {};
  } catch {
    return {};
  }
}

export function saveCatches(state: CatchState): void {
  try {
    localStorage.setItem(KEY_CATCHES, JSON.stringify(state));
  } catch {
    // quota exceeded; ignore silently
  }
}

export function loadConnection(): StoredConnection | null {
  try {
    const raw = localStorage.getItem(KEY_CONN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConnection;
    if (!parsed.baseUrl || !parsed.sid || !parsed.expiresAt) return null;
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
