# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

# === Stage 1: deps ===
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
RUN pnpm install --frozen-lockfile

# === Stage 2: build ===
FROM node:${NODE_VERSION} AS build
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
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
