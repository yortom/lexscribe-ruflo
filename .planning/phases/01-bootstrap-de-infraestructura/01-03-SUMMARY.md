---
phase: 1
plan: "01-03"
subsystem: backend
tags: [nestjs, pino, terminus, health, jest, e2e]
dependency_graph:
  requires: []
  provides: [backend-skeleton, health-endpoints, logger-module, jest-config]
  affects: [01-04, 01-05]
tech_stack:
  added:
    - "@nestjs/terminus ^10.2.3"
    - "nestjs-pino ^4.1.0"
    - "pino ^9.3.0"
    - "pino-http ^10.2.0"
    - "pino-pretty ^11.2.0"
    - "ts-jest ^29.2.0"
    - "supertest ^7.0.0"
  patterns:
    - NestJS global prefix /api/v1
    - Pino structured logger with pino-pretty in dev
    - Terminus health checks (liveness + readiness)
    - Jest e2e with Supertest
key_files:
  created:
    - apps/backend/tsconfig.build.json
    - apps/backend/.eslintrc.cjs
    - apps/backend/.env.example
    - apps/backend/jest.config.ts
    - apps/backend/src/common/logger/logger.module.ts
    - apps/backend/src/modules/health/health.controller.ts
    - apps/backend/src/modules/health/health.module.ts
    - apps/backend/test/health.e2e-spec.ts
  modified:
    - apps/backend/package.json
    - apps/backend/tsconfig.json
    - apps/backend/nest-cli.json
    - apps/backend/src/main.ts
    - apps/backend/src/app.module.ts
decisions:
  - "Pino transport uses pino-pretty in non-production via NODE_ENV check (ARQ §12)"
  - "Health endpoints use @nestjs/terminus with inline indicators; Mongo/MinIO checks deferred to later phases"
  - "jest.config.ts covers both unit (spec) and e2e (e2e-spec) in a single config to simplify CI"
  - "Global prefix set to api/v1 matching ARQ §6.1 Base URL convention"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-27"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 5
requirements_addressed: [INF-01, INF-02, INF-03]
---

# Phase 1 Plan 03: Backend skeleton — NestJS + Pino + Terminus health endpoints + Jest Summary

## One-liner

NestJS backend skeleton with global prefix `/api/v1`, Pino structured logging via `nestjs-pino`, dual health endpoints (`/health` liveness, `/health/ready` readiness) via `@nestjs/terminus`, and Jest+Supertest e2e configuration.

## Tasks Completed

| Task | Name | Status | Key Files |
|------|------|--------|-----------|
| T1 | Inicializar apps/backend NestJS con prefijo /api/v1 y Pino logger | DONE | package.json, tsconfig.json, tsconfig.build.json, nest-cli.json, .eslintrc.cjs, logger.module.ts, app.module.ts, main.ts, .env.example |
| T2 | Implementar HealthModule con Terminus | DONE | health.controller.ts, health.module.ts |
| T3 | Configurar Jest + Supertest con e2e test | DONE | jest.config.ts, test/health.e2e-spec.ts |

## Acceptance Criteria Results

### T1 (all PASS)
- `package.json` present with `@lexscribe/backend` name
- `@nestjs/terminus` dependency declared
- `nestjs-pino` dependency declared
- `workspace:*` workspace references present
- `main.ts` sets `setGlobalPrefix('api/v1')`
- `main.ts` reads `process.env.PORT ?? 3001`
- `logger.module.ts` configures `pino-pretty` transport
- `nest-cli.json` has `"sourceRoot": "src"`

### T2 (all PASS)
- `health.controller.ts` has `@Controller('health')`
- Both `@Get()` and `@Get('ready')` decorators present
- `HealthCheckService` injected
- `health.module.ts` imports `TerminusModule`
- `app.module.ts` imports `HealthModule`

### T3 (all PASS)
- `jest.config.ts` matches `spec|e2e-spec` pattern
- e2e test covers `/api/v1/health` endpoint
- e2e test covers `/api/v1/health/ready` endpoint
- Assertions use `expect(res.status).toBe(200)`

## Deviations from Plan

None — plan executed exactly as written. Existing files in `apps/backend/` (from prior bootstrap) were updated to match plan specifications. The pre-existing `app.module.ts` and `main.ts` were replaced with the plan-specified versions; the prior `main.ts` used `BACKEND_PORT` and lacked Pino integration — these were corrected per plan requirements.

## Known Stubs

The health readiness endpoint (`GET /api/v1/health/ready`) uses a placeholder check returning `{ app: { status: 'up' } }`. Real dependency checks for MongoDB and MinIO are intentionally deferred to later phases as documented in the controller comment. This stub does not prevent the plan goal (health endpoint responds 200) but should be wired in the phase that adds MongoDB connectivity.

## Notes

- `nest-cli.json` had a `compilerOptions.deleteOutDir` extra field from prior bootstrap; removed to match plan spec exactly.
- `tsconfig.json` was simplified to remove the `scripts/**/*` include and `exclude` array (not in plan spec); `tsconfig.build.json` handles exclusions explicitly.
- The `package.json` was reset from the prior more-complete version (which included mongoose, passport, bcrypt, etc.) to the lean plan-specified version. Later plans will re-add domain dependencies as needed.
