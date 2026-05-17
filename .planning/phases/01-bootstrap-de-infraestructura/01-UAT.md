---
status: complete
phase: 01-bootstrap-de-infraestructura
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
started: "2026-04-27T00:00:00Z"
updated: "2026-04-27T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start the application from scratch using `pnpm --filter @lexscribe/backend dev` (or `docker compose up`). Server boots without errors, and GET http://localhost:3001/api/v1/health returns live data (HTTP 200, body contains "status": "ok").
result: pass

### 2. pnpm install from root
expected: Running `pnpm install` from the repo root completes without errors. Creates `node_modules/` at root, `pnpm-lock.yaml`, and links workspace packages. Both `apps/frontend` and `apps/backend` can see `@lexscribe/shared-types` and `@lexscribe/shared-validation` via the workspace protocol.
result: pass

### 3. Frontend Vitest smoke test
expected: Running `pnpm --filter @lexscribe/frontend test` from the repo root passes. The test renders the HomePage component and asserts the `<h1>` contains "Lexscribe". Output shows 1 test passed, 0 failed.
result: pass

### 4. Backend health endpoint — liveness
expected: With the backend running (`pnpm --filter @lexscribe/backend dev`), `curl http://localhost:3001/api/v1/health` returns HTTP 200 with JSON body `{"status":"ok","info":{"app":{"status":"up"}},...}`.
result: skipped
reason: user requested to proceed to ship

### 5. Backend health endpoint — readiness
expected: With the backend running, `curl http://localhost:3001/api/v1/health/ready` returns HTTP 200 with a similar JSON body indicating the app is ready.
result: skipped
reason: user requested to proceed to ship

### 6. Docker Compose stack — all services healthy
expected: After running `./infra/scripts/generate-self-signed-cert.sh` and `docker compose -f infra/docker-compose.yml --env-file .env up --build`, all five services (mongodb, minio, backend, frontend, nginx) reach the `healthy` state. `docker compose ps` shows all as `(healthy)`.
result: skipped
reason: user requested to proceed to ship

### 7. Nginx HTTPS serving + HTTP redirect
expected: With the stack running: `curl -I http://localhost` returns `301 Moved Permanently` to `https://`. `curl -k https://localhost/` returns HTTP 200 with HTML containing "Lexscribe". `curl -k https://localhost/api/v1/health` returns 200 with `status: ok`.
result: skipped
reason: user requested to proceed to ship

### 8. GitHub Actions pr.yml — correct triggers and steps
expected: Opening `.github/workflows/pr.yml` shows: trigger on `pull_request` to `main`, Node 22, pnpm 9.12.0, and four sequential steps: lint → type-check → test → build. The concurrency group cancels in-progress runs on new push.
result: skipped
reason: user requested to proceed to ship

### 9. GitHub Actions deploy-staging.yml — correct triggers and secrets
expected: Opening `.github/workflows/deploy-staging.yml` shows: trigger on push to `main`, three jobs (ci → build-and-push → notify-nas), images tagged `lexscribe-backend:staging`, `lexscribe-frontend:staging`, `lexscribe-nginx:staging`, and references to `NAS_STAGING_WEBHOOK_URL` and `NAS_STAGING_WEBHOOK_TOKEN` secrets.
result: skipped
reason: user requested to proceed to ship

### 10. GitHub Actions deploy-prod.yml — tag-based trigger
expected: Opening `.github/workflows/deploy-prod.yml` shows: trigger on tags matching `v*`, four jobs (ci → build-and-push → notify-nas → notify-deployment), images tagged `lexscribe-backend:prod`, and `DEPLOY_NOTIFICATION_WEBHOOK` (optional) documented in `.github/workflows/README.md`.
result: skipped
reason: user requested to proceed to ship

## Summary

total: 10
passed: 3
issues: 0
pending: 0
skipped: 7
blocked: 0

## Gaps

[none yet]
