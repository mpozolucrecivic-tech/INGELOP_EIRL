# Compila el frontend de la intranet y lo sirve con Caddy (que además hace de proxy HTTPS)
# Contexto de build: raíz del repositorio

FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# La API se sirve en el mismo dominio bajo /api/v1
ENV VITE_API_URL=/api/v1
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv/intranet
COPY deploy/Caddyfile /etc/caddy/Caddyfile
