/*
 * Runtime config — fetched once from /config.json, which the container
 * entrypoint writes from env vars at startup. Used to pre-fill connect-
 * screen credentials without baking them into the image.
 *
 * The endpoint is always present (entrypoint writes empty strings when
 * env vars are unset). A fetch failure is treated as "no config" and
 * the SPA falls back to its built-in defaults.
 */

export type RuntimeConfig = {
  piholeHost?: string;
  piholePassword?: string;
};

let cached: RuntimeConfig | null = null;

export async function loadConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`config.json: ${res.status}`);
    const raw = (await res.json()) as RuntimeConfig;
    cached = {
      piholeHost: raw.piholeHost?.trim() || undefined,
      piholePassword: raw.piholePassword || undefined,
    };
  } catch {
    // Public deploys (the personal-site snapshot) don't ship config.json;
    // a missing file is expected, not an error.
    cached = {};
  }
  return cached;
}
