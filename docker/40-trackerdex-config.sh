#!/bin/sh
# trackerdex runtime config (v1.1+).
#
# Auths against Pi-hole on the private docker network using PIHOLE_PASSWORD
# and writes only { piholeHost, sid, expiresAt } into config.json. The
# password never leaves the container.
#
# A backgrounded refresh loop renews the SID before it expires.
#
# If PIHOLE_PASSWORD is unset (e.g. public deploys), writes an empty config
# and exits — the SPA falls back to manual connect.
set -eu

OUT=/usr/share/nginx/html/config.json
UPSTREAM="${PIHOLE_UPSTREAM:-http://pihole}"
REFRESH_MARGIN_SEC=300   # refresh 5 min before expiry

write_empty() {
  cat > "$OUT" <<EOF
{
  "piholeHost": "${PIHOLE_HOST:-}",
  "sid": "",
  "expiresAt": 0
}
EOF
}

write_config() {
  cat > "$OUT" <<EOF
{
  "piholeHost": "${PIHOLE_HOST:-}",
  "sid": "$1",
  "expiresAt": $2
}
EOF
}

# Build the JSON request body in a temp file (avoids shell-quoting bugs).
build_body() {
  TMPF=$(mktemp)
  esc=$(printf '%s' "$PIHOLE_PASSWORD" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
  printf '{"password":"%s"}' "$esc" > "$TMPF"
  echo "$TMPF"
}

do_auth() {
  body=$(build_body)
  attempt=1
  while [ "$attempt" -le 5 ]; do
    resp=$(wget -qO- --post-file="$body" \
                 --header='Content-Type: application/json' \
                 "${UPSTREAM}/api/auth" 2>/dev/null || true)
    if [ -n "$resp" ] && printf '%s' "$resp" | grep -q '"valid":[[:space:]]*true'; then
      rm -f "$body"
      printf '%s' "$resp"
      return 0
    fi
    sleep $((attempt * 2))
    attempt=$((attempt + 1))
  done
  rm -f "$body"
  return 1
}

# Extract a numeric or string JSON field. Naive but fine for the small
# shape Pi-hole returns from /api/auth.
extract() {
  printf '%s' "$1" | sed -nE "s/.*\"$2\":[[:space:]]*\"([^\"]+)\".*/\\1/p" | head -1
}
extract_num() {
  printf '%s' "$1" | sed -nE "s/.*\"$2\":[[:space:]]*([0-9]+).*/\\1/p" | head -1
}

# No password → empty config, SPA shows the connect screen.
if [ -z "${PIHOLE_PASSWORD:-}" ]; then
  write_empty
  echo "trackerdex: no PIHOLE_PASSWORD; manual connect mode"
  exit 0
fi

# Initial auth.
expires=0
sid=""
if resp=$(do_auth); then
  sid=$(extract "$resp" "sid")
  validity=$(extract_num "$resp" "validity")
  [ -z "$validity" ] && validity=1800
  expires=$(( $(date +%s) + validity ))
  write_config "$sid" "$expires"
  echo "trackerdex: authed, sid valid for ${validity}s"
else
  write_empty
  echo "trackerdex: initial auth failed; will retry in background"
fi

# Background refresh loop. Detaches so nginx can start. Lives as a child
# of nginx (after the entrypoint exec's), runs forever inside the container.
(
  while true; do
    now=$(date +%s)
    # Sleep until 5 min before expiry; clamp to 60s minimum so a missed
    # initial auth retries quickly.
    sleep_for=$(( expires - now - REFRESH_MARGIN_SEC ))
    [ "$sleep_for" -lt 60 ] && sleep_for=60
    sleep "$sleep_for"

    if resp=$(do_auth); then
      sid=$(extract "$resp" "sid")
      validity=$(extract_num "$resp" "validity")
      [ -z "$validity" ] && validity=1800
      expires=$(( $(date +%s) + validity ))
      write_config "$sid" "$expires"
      echo "trackerdex: refreshed sid (${validity}s)"
    else
      echo "trackerdex: refresh auth failed, keeping current config"
    fi
  done
) &

exit 0
