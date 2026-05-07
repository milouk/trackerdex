#!/bin/sh
# trackerdex runtime config.
#
# Writes /usr/share/nginx/html/config.json from PIHOLE_* env vars at
# container start, so operators can pre-fill connect-screen credentials
# without baking them into the image. Empty/unset values become empty
# strings — the SPA treats them as "not configured" and shows the form
# normally.
#
# SECURITY: config.json is served as a static asset. Anyone who can fetch
# the trackerdex URL can read PIHOLE_PASSWORD in plaintext. Only set this
# in deployments where access is already restricted (e.g. behind a
# reverse-proxy auth middleware, or a homelab LAN).
set -eu

escape_json() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

OUT=/usr/share/nginx/html/config.json
cat > "$OUT" <<EOF
{
  "piholeHost": "$(escape_json "${PIHOLE_HOST:-}")",
  "piholePassword": "$(escape_json "${PIHOLE_PASSWORD:-}")"
}
EOF

# Don't log the password value itself.
host_msg="${PIHOLE_HOST:-<unset>}"
pw_msg=""
if [ -n "${PIHOLE_PASSWORD:-}" ]; then pw_msg="<set>"; else pw_msg="<unset>"; fi
echo "trackerdex: wrote $OUT (host=${host_msg}, password=${pw_msg})"
