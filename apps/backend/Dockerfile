# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

# === Stage 1: deps — instala paquetes externos (sin fuentes workspace) ===
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
# node-linker=hoisted: sin symlinks al .pnpm store, seguro para copiar entre stages
RUN pnpm install --frozen-lockfile --node-linker=hoisted

# === Stage 2: build — fuentes + re-link de workspace packages ===
FROM node:${NODE_VERSION} AS build
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
# Copia deps externos pre-instalados (layer cacheado)
COPY --from=deps /repo/node_modules ./node_modules
# Copia TODO el monorepo (incluye packages/shared-*/src/)
COPY . .
# Re-corre install para crear los symlinks workspace ahora que el fuente existe
# Las deps externas ya están en node_modules, pnpm solo añade los links workspace
RUN pnpm install --frozen-lockfile --node-linker=hoisted
# Build shared packages first — backend resuelve @lexscribe/shared-* a dist/index.js
RUN pnpm --filter "./packages/*" run build
RUN pnpm --filter @lexscribe/backend build

# === Stage 3: runtime ===
FROM node:${NODE_VERSION} AS runtime
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml* ./
COPY --from=build /repo/apps/backend/package.json ./apps/backend/
COPY --from=build /repo/packages/shared-types ./packages/shared-types
COPY --from=build /repo/packages/shared-validation ./packages/shared-validation
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
RUN pnpm install --prod --frozen-lockfile --filter @lexscribe/backend...
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/v1/health || exit 1
CMD ["node", "apps/backend/dist/main.js"]
