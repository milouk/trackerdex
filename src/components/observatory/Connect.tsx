import { useState } from "react";
import { PiholeClient, PiholeError } from "../../pihole";
import type { StoredConnection } from "../../types";

type Props = {
  onConnect: (
    client: PiholeClient,
    storedConnection: StoredConnection,
  ) => void;
};

const DEFAULT_URL =
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://pi.hole";

export function Connect({ onConnect }: Props): React.ReactElement {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const client = new PiholeClient(url);
      const session = await client.login(password);
      const stored: StoredConnection = {
        baseUrl: client.baseUrl,
        sid: session.sid,
        expiresAt: session.expiresAt,
      };
      onConnect(client, stored);
    } catch (err) {
      const msg =
        err instanceof PiholeError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Connection failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dir-observatory ob-connect-page">
      <div className="ob-connect-grid" aria-hidden="true" />
      <div className="ob-connect-card">
        <div className="ob-connect-tape">
          <span>OBS·LINK</span>
          <span>READY</span>
          <span className="ob-pulse" />
        </div>
        <h1 className="ob-connect-title">Establish uplink.</h1>
        <p className="ob-connect-sub">
          Trackerdex needs to talk to your Pi-hole. Credentials are sent only
          to the host you specify; a session token is kept in this browser.
        </p>
        <form className="ob-connect-form" onSubmit={handleSubmit}>
          <label className="ob-field">
            <span className="ob-field-label">HOST</span>
            <span className="ob-field-input">
              <span className="ob-prompt">›</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                spellCheck={false}
                autoComplete="url"
                placeholder="http://pi.hole"
                required
              />
            </span>
          </label>
          <label className="ob-field">
            <span className="ob-field-label">KEY</span>
            <span className="ob-field-input">
              <span className="ob-prompt">›</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pi-hole admin (or app) password"
                autoComplete="current-password"
                required
              />
            </span>
            <span className="ob-field-hint">
              Generate an APP password under Settings · API in Pi-hole v6.
            </span>
          </label>
          {error && (
            <div className="ob-field-hint" style={{ color: "var(--ob-rust)" }}>
              {error}
            </div>
          )}
          <div className="ob-connect-cta">
            <button
              type="submit"
              className="ob-btn-primary"
              disabled={busy}
            >
              {busy ? "UPLINK …" : "UPLINK →"}
            </button>
          </div>
        </form>
        <footer className="ob-connect-foot">
          <span>v0.1</span>
          <span>·</span>
          <span>RADAR data: DUCKDUCKGO</span>
          <span>·</span>
          <span>PI-HOLE v6 ONLY</span>
        </footer>
      </div>
    </div>
  );
}
