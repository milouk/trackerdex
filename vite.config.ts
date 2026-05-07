import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy:
 *   echo 'VITE_PIHOLE_URL=http://pihole.lan' >> .env.local
 *   npm run dev
 *
 * That makes the browser see Pi-hole at the dev origin (http://localhost:5173)
 * — no CORS, no mixed-content, no pi-hole config required. /api/* is forwarded
 * to VITE_PIHOLE_URL transparently.
 *
 * For production builds, the proxy doesn't apply; ship trackerdex behind the
 * same reverse proxy as Pi-hole instead.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const piholeUrl = env.VITE_PIHOLE_URL;

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: piholeUrl
        ? {
            "/api": {
              target: piholeUrl,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  };
});
