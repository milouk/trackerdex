<p align="center">
  <img src="public/favicon.svg" alt="" height="96">
</p>

<h1 align="center">
  Trackerdex
  <br>
  <sub><sup>a bestiary of internet trackers, populated by your Pi-hole</sup></sub>
</h1>

<p align="center">
  built for <a href="https://pi-hole.net">Pi-hole</a> &nbsp;
  <a href="https://pi-hole.net"><img alt="Pi-hole" src="https://github.com/pi-hole/graphics/raw/master/Vortex/Vortex.png" height="22"></a>
</p>

<p align="center">
  <a href="https://github.com/milouk/trackerdex/actions/workflows/build.yml"><img alt="build" src="https://github.com/milouk/trackerdex/actions/workflows/build.yml/badge.svg"></a>
  <a href="https://milouk.me/trackerdex/"><img alt="pages" src="https://github.com/milouk/trackerdex/actions/workflows/pages.yml/badge.svg"></a>
  <a href="https://github.com/milouk/trackerdex/pkgs/container/trackerdex"><img alt="ghcr" src="https://img.shields.io/badge/ghcr.io-milouk%2Ftrackerdex-2496ED?logo=docker&logoColor=white"></a>
  <a href="https://github.com/milouk/trackerdex"><img alt="stars" src="https://img.shields.io/github/stars/milouk/trackerdex?style=flat&logo=github"></a>
  <a href="https://github.com/milouk/trackerdex/commits/main"><img alt="last commit" src="https://img.shields.io/github/last-commit/milouk/trackerdex?logo=github"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-GPL--2.0-blue.svg"></a>
  <a href="https://ko-fi.com/milouk"><img alt="ko-fi" src="https://img.shields.io/badge/ko--fi-buy_me_a_coffee-FF5E5B?logo=ko-fi&logoColor=white"></a>
</p>

> A companion to [**Pi-hole**](https://pi-hole.net/). Every blocked DNS query
> turns into a *catch* in your personal dex of ~19,000 internet trackers,
> each rendered as a deterministic 16×16 RPG character. Tiers (legendary /
> rare / uncommon / common) reflect how widely each tracker is deployed
> across the web. Watch your dex fill up over hours of normal browsing.

Live data via the [Pi-hole v6 REST API](https://docs.pi-hole.net/api/).
Real entity catalogue from
[DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar).
Sprite engine ported from [daboth/pagan](https://github.com/daboth/pagan).

**🛰️ Live demo: <https://milouk.me/trackerdex/>**

Zero-config self-host: `docker run -p 8080:80 ghcr.io/milouk/trackerdex:latest` — done.

![Observatory · dark](docs/screenshots/dark.png)

## What is it

Trackerdex turns your Pi-hole's `/api/queries` and `/api/stats/top_domains`
endpoints into a Pokédex-style game where the "monsters" are real ad
networks, analytics platforms, social trackers, CDNs, and data brokers.

Every blocked DNS query is an encounter. The first time your network
blocks a tracker we have on file, you *catch* it — its sprite is unlocked,
its silhouette becomes a real character, and an entry joins your dex.

The dex is shared across users (the same domain → the same character for
everyone), but your **catch state** lives only in your browser's
`localStorage`. No accounts, no telemetry, no cloud — just you and your
Pi-hole.

## Themes

Dark default, light optional. Toggle in the topbar.

### Dark

![Dark theme](docs/screenshots/dark.png)

### Light

![Light theme](docs/screenshots/light.png)

### Detail · sprite overview

Click any catch for the full file: signal strength bars, fake astronomical
coordinates, full-size sprite (with shiny variant if you've broken
15,000 encounters), the tracker's owned domains, and a 24-hour encounter
sparkline.

![Sprite overview](docs/screenshots/sprite-overview.png)

## Quickstart

### Docker

```bash
docker run -d \
  --name trackerdex \
  -p 8080:80 \
  ghcr.io/milouk/trackerdex:latest
```

Open `http://<host>:8080`, enter your Pi-hole URL and an
[app password](https://docs.pi-hole.net/api/auth/), done.

### docker-compose

```yaml
services:
  trackerdex:
    image: ghcr.io/milouk/trackerdex:latest
    container_name: trackerdex
    restart: unless-stopped
    ports:
      - "8080:80"
```

### From source

```bash
git clone https://github.com/milouk/trackerdex.git
cd trackerdex
npm install
npm run build:dex      # downloads Tracker Radar (~5 MB dex.json)
echo 'VITE_PIHOLE_URL=http://pihole.lan' > .env.local
npm run dev            # http://localhost:5173
```

In dev mode, Vite proxies `/api/*` to `VITE_PIHOLE_URL` so the browser
treats Pi-hole as same-origin — no CORS dance.

## How it works

```text
                  ┌────────────────────┐
                  │  Tracker Radar     │  build-time fetch
                  │  (~3.8k entities,  │  via npm run build:dex
                  │   ~38k domains)    │
                  └────────┬───────────┘
                           ▼
                  ┌────────────────────┐
                  │   public/dex.json  │  flat domain→entity index
                  │   ~5 MB            │  + per-entity metadata
                  └────────┬───────────┘
                           ▼ static fetch
        Pi-hole v6  ───►  trackerdex SPA  ◄─── pagan-derived sprites
        /api/queries        │                   (in-browser canvas)
        /api/stats/...      ▼
                       localStorage
                       (catch progress)
```

1. **Build time**: pull DuckDuckGo Tracker Radar's
   `domain_map.json` (~38k subdomains → 3.8k parent companies) and
   `entity_prevalence.json`. Join into one flat `domain → entity` index
   with tiered metadata. Output: `public/dex.json`.

2. **First run**: the SPA `POST /api/auth` with your Pi-hole password,
   stashes the session ID, then bulk-seeds your catches from
   `/api/stats/top_domains?blocked=true&count=1000`.

3. **Live polling**: every 8 seconds, fetch the latest queries from
   `/api/queries?from=<since>`, filter to blocked statuses (GRAVITY,
   REGEX, DENYLIST, …), strip subdomains via the Public Suffix List, look
   up the parent entity, and increment the encounter counter.

4. **Sprite rendering** is pure browser code: each entity name is hashed
   (chained 32-bit FNV-1a) to seed pagan's algorithm — body silhouette,
   hair, clothing, weapon, optional shield + decoration — composited into
   a 16×16 deterministic character. Same name in, same character out.

## Tiers and rarity

Tier comes from Tracker Radar's prevalence stat — what fraction of the
crawled web includes this tracker. **Higher tier = more influential, not
harder to catch.**

| Tier      | Threshold | Count  | Examples                            |
|-----------|-----------|--------|-------------------------------------|
| LEGENDARY | ≥ 5%      | 41     | Google, Cloudflare, Meta, Adobe     |
| RARE      | ≥ 0.5%    | 190    | Criteo, Index Exchange, MediaMath   |
| UNCOMMON  | ≥ 0.05%   | 475    | Smaller ad-tech, regional networks  |
| COMMON    | rest      | 18,384 | Long-tail / single-site trackers    |

A tracker becomes **shiny** at ≥15,000 cumulative encounters in your
network — its sprite flips to a different deterministic loadout (same for
every user; everyone's shiny Google looks identical).

## CORS, hosting, security

Pi-hole v6 doesn't send permissive CORS headers by default. Easiest path:
**run trackerdex behind the same reverse proxy as your Pi-hole UI**, so
`/api/*` and the SPA share an origin. No CORS config needed.

If you need cross-origin, allowlist trackerdex's URL in
`/etc/pihole/pihole-FTL.toml`:

```toml
[webserver.api]
cors_hosts = ["http://your-host:8080"]
```

> **App passwords.** Generate an app password under *Pi-hole → Settings →
> API* rather than using your main admin password. Trackerdex stores only
> the *session token* in your browser, never the password.

## Tech stack

- **Frontend**: TypeScript, React 19, Vite, no runtime UI framework
- **Sprites**: TypeScript port of [daboth/pagan](https://github.com/daboth/pagan)
  with all 22 `.pgn` templates — body, hair, torso, boots, 6 one-handers,
  5 two-handers, 4 shields, shield deco
- **Data**: [DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar)
- **Hash**: chained 32-bit FNV-1a (deterministic, sync, non-cryptographic)
- **PSL**: [`tldts`](https://github.com/remusao/tldts) for registrable-domain extraction
- **Persistence**: `localStorage` only
- **Deploy**: nginx + Docker (multi-arch ghcr image)

## Credits

- Tracker data: [DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar) (Apache-2.0).
- Sprite engine and `.pgn` templates: [daboth/pagan](https://github.com/daboth/pagan) (GPL-2.0).
- Built on top of [Pi-hole](https://pi-hole.net/) v6.

Not affiliated with The Pokémon Company. The "dex" framing is parody.

## License

GPL-2.0-or-later — see [LICENSE](./LICENSE).

This project is GPL-2.0 because it incorporates pagan's templates and
algorithm verbatim. Forks must remain GPL-2.0 or compatible.
