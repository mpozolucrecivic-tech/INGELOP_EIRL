# ---------- Build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
# "build" genera primero el cliente de Prisma en src/generated (prebuild) y luego compila
RUN npm run build && npm prune --omit=dev

# ---------- Runtime ----------
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY package*.json ./
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 4000
# Aplica migraciones pendientes y arranca la API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
