# trackerdex

> **Gotta block 'em all.** A Pokédex of internet trackers, filled in by your Pi-hole.

trackerdex turns your Pi-hole's blocked-query log into a collectible dex of
~19,000 procedurally-illustrated tracker monsters, ranked by how much of the
web they spy on. Every blocked DNS query is an encounter; the first time you
see a tracker, it's "caught" and joins your dex.

The catalog itself comes from
[DuckDuckGo's Tracker Radar](https://github.com/duckduckgo/tracker-radar) —
a curated list of ~3,800 tracking entities and ~38,000 owned domains, with
real prevalence stats. trackerdex flattens that into a static
`domain → entity` lookup, generates a deterministic pixel sprite for every
entity, and joins it against your Pi-hole's live data.

## Features

- **Real entities, real stats.** Web prevalence (e.g. *Google: 72.7% of crawled
  sites*), domain ownership rollups (50+ Google subdomains → one *Google*
  monster), tier (legendary / rare / common) based on actual cross-web
  prevalence.
- **Procedural pixel sprites.** Every tracker is rendered as a unique 16×16
  RPG-style character — body, hair, clothing, boots, weapon, optional shield —
  generated deterministically from the entity's name. The same tracker always
  looks the same; ~19,000 entities yield ~19,000 distinct loadouts. Powered by
  a TypeScript port of [daboth/pagan](https://github.com/daboth/pagan).
- **Live encounter feed.** Polls Pi-hole every 8 seconds and shows new blocks
  as they happen, with a "*A wild Doubleclick appeared!*" animation for
  first-time catches in a session.
- **Catch progress survives.** All catch data is kept in `localStorage`;
  disconnecting from Pi-hole doesn't wipe your dex.
- **Shiny variants** at 1,000+ encounters per tracker (a different deterministic
  sprite — same monster, alternate look).
- **Pi-hole v6 only.** Uses the new REST API exclusively.

## Quickstart

### Run with Docker

```bash
docker run -d --name trackerdex -p 8080:80 ghcr.io/<you>/trackerdex:latest
# or build locally:
docker build -t trackerdex .
docker run -d --name trackerdex -p 8080:80 trackerdex
```

Open `http://<host>:8080`, enter your Pi-hole URL and password, done.

### Run from source (dev)

```bash
git clone https://github.com/<you>/trackerdex.git
cd trackerdex
npm install
npm run build:dex   # downloads Tracker Radar, builds public/dex.json (~5 MB)

# Point dev at your Pi-hole — Vite will proxy /api/* and side-step CORS:
echo 'VITE_PIHOLE_URL=http://pihole.lan' > .env.local

npm run dev         # http://localhost:5173
```

In dev mode, leave the *Pi-hole URL* field on the connect screen as the default
(`http://localhost:5173`). The Vite proxy forwards every `/api/*` request to
`VITE_PIHOLE_URL` for you, so the browser treats Pi-hole as same-origin —
no CORS config, no mixed-content blocking.

## Pi-hole CORS

Pi-hole v6 doesn't send permissive CORS headers by default. You have three
options, in order of simplicity:

1. **Same-origin (recommended).** Run trackerdex behind the same reverse proxy
   as Pi-hole's admin UI, so `/api/*` and `/dex/*` share an origin. No CORS
   config needed on Pi-hole.
2. **Allowlist trackerdex.** Edit `/etc/pihole/pihole-FTL.toml`:

   ```toml
   [webserver.api]
   cors_hosts = ["http://your-host:8080"]
   ```

   Restart pihole-FTL.
3. **Same host, different port.** Run trackerdex on the same host as Pi-hole;
   most browsers won't enforce CORS strictly between localhost ports for the
   v6 API path. (Still cleanest to do option 1.)

> **App passwords.** Generate an app password in Pi-hole's settings rather
> than using your main admin password. trackerdex stores only the *session
> token* in your browser, not the password.

## How it works

```text
                  ┌────────────────────┐
                  │  Tracker Radar     │  build-time fetch
                  │  (~3.8k entities,  │  via npm run build:dex
                  │   ~38k domains)    │
                  └────────┬───────────┘
                           ▼
                  ┌────────────────────┐
                  │   public/dex.json  │  flat domain→entity
                  │   ~5 MB            │  + per-entity metadata
                  └────────┬───────────┘
                           ▼ static fetch
        Pi-hole v6  ───►  trackerdex SPA  ◄─── procgen sprites
        /api/queries        |                   (in-browser canvas)
        /api/stats/...      ▼
                       localStorage
                       (catch progress)
```

The runtime is pure browser code:

1. On first run, fetches the static `dex.json` once.
2. POSTs to `/api/auth` with your password → receives a session ID.
3. Bulk-seeds catches from `/api/stats/top_domains?blocked=true&count=1000`.
4. Polls `/api/queries?from=<since>` every 8 seconds, resolves each blocked
   domain to a registrable form (via the Public Suffix List), looks it up in
   the static map, and records the encounter.

## Roadmap

- **v0.2:** Domain → category mapping (currently derived from heuristics on
  entity name; Tracker Radar's per-domain files have explicit categories).
  Better type assignment for conglomerates (Microsoft, Amazon).
- **v0.3:** Multi-Pi-hole support, dex export/import, achievements
  (catch all legendaries, etc.).
- **v0.4:** Per-client filtering ("which devices on my network catch
  Facebook?"), historical encounter heatmaps.

## Credits

- Tracker data from [DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar) (Apache 2.0).
- Sprite generator and templates ported from [daboth/pagan](https://github.com/daboth/pagan)
  (GPL-2.0). The `.pgn` template files under `src/sprite-templates/` are taken
  unmodified from that project; the algorithm in `src/sprite/` is a faithful
  TypeScript reimplementation.
- Built on top of [Pi-hole](https://pi-hole.net/) v6.

Not affiliated with The Pokémon Company. The "dex" framing is parody.

## License

GPL-2.0-or-later — see [LICENSE](./LICENSE).

This project is GPL because it incorporates pagan (also GPL-2.0). If you fork
trackerdex, your fork must also be GPL-2.0 or compatible.
