# --- builder ---
FROM node:22-alpine AS builder
ARG VERSION=dev
# Vite inlines VITE_* env vars at build time so the UI can show the version.
ENV VITE_VERSION=$VERSION
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build dex artifact (fetches Tracker Radar) + the React app.
RUN npm run build

# --- runtime ---
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
