---
phase: 1
plan: "01-04"
subsystem: infra
tags: [docker, nginx, tls, multi-stage, compose]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [docker-compose-stack, nginx-tls, backend-dockerfile, frontend-dockerfile]
  affects: [infra/docker-compose.yml, infra/nginx/, apps/backend/Dockerfile, apps/frontend/Dockerfile]
tech_stack:
  added:
    - "Docker multi-stage builds (node:22-alpine, pnpm@9.12.0)"
    - "Nginx 1.27-alpine with TLS termination"
    - "mongo:8.0 with mongosh healthcheck"
    - "minio:RELEASE.2024-08-17T01-24-54Z with mc healthcheck"
  patterns:
    - "Multi-stage Dockerfile: deps -> build -> runtime"
    - "Next.js standalone output for minimal runtime image"
    - "Health-gated depends_on in docker-compose"
    - "Named Docker volumes for data persistence"
    - "Internal bridge network (lexscribe_net) — no external ports on app services"
key_files:
  created:
    - apps/backend/Dockerfile
    - apps/backend/.dockerignore
    - apps/frontend/Dockerfile
    - apps/frontend/.dockerignore
    - apps/frontend/public/.gitkeep
    - infra/nginx/Dockerfile
    - infra/nginx/certs/.gitkeep
    - infra/scripts/generate-self-signed-cert.sh
    - infra/scripts/README.md
  modified:
    - infra/nginx/nginx.conf
    - infra/docker-compose.yml
    - .gitignore
decisions:
  - "Multi-stage build pattern chosen for both backend (NestJS dist) and frontend (Next.js standalone) to minimize production image size"
  - "Nginx built from custom Dockerfile (nginx:1.27-alpine + bundled certs) rather than volume-mounted, so the image is self-contained at build time"
  - "All app services isolated on lexscribe_net bridge network — only nginx exposes ports 80/443 externally"
  - "Health-gated service ordering: backend waits for mongodb+minio healthy; frontend waits for backend healthy; nginx waits for both frontend+backend healthy"
  - "Self-signed cert script provided for local dev; cert files excluded from git via .gitignore patterns"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-27"
  tasks_completed: 4
  files_created: 10
  files_modified: 3
---

# Phase 1 Plan 04: Docker Compose + Nginx + Dockerfiles para frontend y backend — Summary

## One-liner

Multi-stage Dockerfiles for NestJS backend and Next.js standalone frontend, full five-service docker-compose stack (frontend + backend + mongodb + minio + nginx) with TLS termination, health-gated startup ordering, named persistent volumes, and a self-signed cert generator for local HTTPS.

## Tasks Completed

| Task | Title | Status |
|------|-------|--------|
| T1 | Dockerfile multi-stage para apps/backend (NestJS) | Done |
| T2 | Dockerfile multi-stage para apps/frontend (Next.js standalone) | Done |
| T3 | Nginx — config TLS + reverse proxy a frontend y backend | Done |
| T4 | docker-compose.yml — frontend + backend + mongodb + minio + nginx | Done |

## What Was Built

**T1 — Backend Dockerfile** (`apps/backend/Dockerfile`): Three-stage build. Stage `deps` installs workspace-aware dependencies via pnpm; stage `build` compiles NestJS to `dist/`; stage `runtime` installs only production deps and runs `node apps/backend/dist/main.js`. Healthcheck polls `/api/v1/health` via wget. Port 3001.

**T2 — Frontend Dockerfile** (`apps/frontend/Dockerfile`): Same three-stage pattern. Build stage runs `pnpm --filter @lexscribe/frontend build` (Next.js standalone output). Runtime stage copies `.next/standalone`, static assets, and public directory. Created `apps/frontend/public/.gitkeep` because the directory was absent (required by the COPY instruction). Port 3000.

**T3 — Nginx** (`infra/nginx/`): Full TLS nginx.conf with HTTP-to-HTTPS redirect (301), `upstream frontend_upstream` (3000) and `upstream backend_upstream` (3001), `/api/` proxy to backend, `/` proxy to frontend with WebSocket upgrade headers, gzip, 50 MB client body limit. Custom `nginx:1.27-alpine` Dockerfile bundles conf and certs at image build time. Cert files excluded from git; `generate-self-signed-cert.sh` automates local cert creation with openssl.

**T4 — docker-compose.yml** (`infra/docker-compose.yml`): Named `lexscribe`, five services on `lexscribe_net` bridge. `mongodb` (mongo:8.0) and `minio` (RELEASE.2024-08-17) have named volumes (`mongodb_data`, `minio_data`) and healthchecks. `backend` depends on both with `service_healthy` condition. `frontend` depends on `backend` healthy. `nginx` depends on both `frontend` and `backend` healthy. Only nginx exposes host ports 80/443. `README.md` documents the three-step local setup: copy env, run cert script, docker compose up.

## Deviations from Plan

**1. [Rule 2 - Missing prerequisite] Created apps/frontend/public/.gitkeep**
- **Found during:** T2
- **Issue:** `apps/frontend/public/` directory did not exist; the frontend Dockerfile COPY instruction would fail at build time without it.
- **Fix:** Created empty `apps/frontend/public/.gitkeep` to ensure the directory is tracked in git and the COPY succeeds.
- **Files modified:** `apps/frontend/public/.gitkeep`

**2. [Rule 1 - Existing file replaced] infra/docker-compose.yml was a stub with old schema**
- **Found during:** T4
- **Issue:** The existing `infra/docker-compose.yml` lacked `name:`, used direct volumes (not named), no healthchecks, no network, and had a placeholder `nginx:alpine` image instead of the custom built Dockerfile. The plan's T4 is explicitly to replace it.
- **Fix:** Replaced entirely with the plan's specified content. This was the intended action per the plan, not an unplanned deviation.

**3. [Rule 1 - Existing file replaced] infra/nginx/nginx.conf was a placeholder**
- **Found during:** T3
- **Issue:** Existing nginx.conf was marked as placeholder (comment: "TODO: configurar TLS"), HTTP-only, no TLS, different upstream names. The plan requires full TLS config.
- **Fix:** Replaced with the full TLS configuration specified in the plan. Intended action.

## Known Stubs

None. All files contain production-ready content. The docker-compose stack requires `.env` secrets to be filled in before running (documented in `infra/scripts/README.md`), but this is expected operational behavior, not a stub.

## Self-Check: PASSED

Files verified present:
- `apps/backend/Dockerfile` - contains `FROM node:${NODE_VERSION} AS runtime`, `EXPOSE 3001`, `/api/v1/health`, `CMD ["node", "apps/backend/dist/main.js"]`
- `apps/backend/.dockerignore` - contains `node_modules`, `.env`
- `apps/frontend/Dockerfile` - contains `.next/standalone`, `EXPOSE 3000`, `CMD ["node", "apps/frontend/server.js"]`
- `apps/frontend/.dockerignore` - contains `node_modules`
- `apps/frontend/public/.gitkeep` - created (directory was missing)
- `infra/nginx/nginx.conf` - contains `listen 443 ssl`, both upstreams, `location /api/`, `return 301 https`
- `infra/nginx/Dockerfile` - contains `nginx:1.27-alpine`
- `infra/nginx/certs/.gitkeep` - created
- `infra/scripts/generate-self-signed-cert.sh` - contains `openssl req -x509`
- `infra/scripts/README.md` - contains nginx section + Local stack section
- `infra/docker-compose.yml` - `name: lexscribe`, mongo:8.0, minio/minio, both Dockerfiles, `context: ./nginx`, `"443:443"`, `/api/v1/health` healthcheck, named volumes, `lexscribe_net`
- `.gitignore` - contains `infra/nginx/certs/*.crt` and `infra/nginx/certs/*.key`

All 10 acceptance criteria across T1–T4 verified via Grep.
