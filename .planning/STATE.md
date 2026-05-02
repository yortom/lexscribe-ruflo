---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-02T17:20:00.000Z"
last_activity: 2026-05-02
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 9
  completed_plans: 8
---

# Lexscribe — State

## Current Position

Phase: 02 (auth-y-bases-transversales) — EXECUTING
Plan: 4 of 4

- **Milestone:** v1.0 MVP
- **Phase:** 1 — Complete (2026-04-27)
- **Plan:** 02-01 — Complete (2026-05-02)
- **Plan:** 02-02 — Complete (2026-05-02)
- **Plan:** 02-03 — Complete (2026-05-02)
- **Status:** Executing Phase 02, Plan 02-04 next
- **Last activity:** 2026-05-02

## Accumulated Context

- Toda la definición funcional, de datos y de arquitectura vive en `docs/FUNCIONAL.md`, `docs/DATOS.md`, `docs/ARQUITECTURA.md`. Esos son la fuente de verdad — `.planning/` solo registra estructura ejecutiva.
- Cada `REQ-ID` mapea a una o varias `F-XXX` definidas en `FUNCIONAL.md`.
- Cada fase del roadmap mapea a uno o varios módulos funcionales (4.1–4.7).

## Phase 1 Summary

**Plans executed:**

- `01-01` — Monorepo pnpm workspaces, shared-types, shared-validation, tooling (ESLint/Prettier/tsconfig)
- `01-02` — Next.js 14 App Router standalone + Tailwind + Vitest smoke test
- `01-03` — NestJS + Pino logger + Terminus health endpoints (`/api/v1/health`, `/api/v1/health/ready`) + Jest e2e
- `01-04` — Multi-stage Dockerfiles (frontend + backend) + Nginx TLS reverse proxy + docker-compose (5 services)
- `01-05` — GitHub Actions: `pr.yml` (PR checks), `deploy-staging.yml` (push to main), `deploy-prod.yml` (tag v*)

**Requirements addressed:** INF-01, INF-02, INF-03, INF-04, INF-05

## Phase 2 Progress

**Plans executed:**

- `02-01` — NestJS 11 bump, JWT auth (login/refresh/logout), argon2id, refresh rotation+reuse detection, JwtStrategy+@CurrentUser, Next.js login form, 12 e2e tests green
- `02-02` — softDeletePlugin Mongoose (unit-tested, 6 assertions), DomainError hierarchy (NotFound/Conflict/Validation/Unauthorized), DomainExceptionFilter global, ZodValidationPipe global, AuthService refactored to domain errors
- `02-03` — AuditoriaModule: schema (no soft-delete), AuditoriaService.writeAsync (setImmediate), AuditInterceptor (@Audited decorator, tap+deep-object-diff), AuditListener (*.linked/*.unlinked/*.generated/auth.*), AuthService emits login/logout events, 22 e2e tests green

**Requirements addressed:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-06, AUTH-07

## Key Decisions

- **Refresh token format `<userId>:<hex>`** — userId prefix enables reuse detection after rotation without DB scan or JWT
- **Two-step rotate in MongoDB 8** — `$pull`+`$push` on same array path must be sequential operations
- **`declaration: false` in backend tsconfig** — fixes TS2742 with nestjs-zod `createZodDto` (app, not library)
- **jest.config.ts targets `.spec.ts` only** — e2e tests have their own config with MongoMemoryServer setup
- **softDeletePlugin per-schema only** — never `mongoose.plugin()` global; auditoria/esquemas schemas excluded per DATOS.md §4.8
- **DomainExceptionFilter excludes stack/statusCode** — body shape `{code, message}` only; ValidationError.details only in non-production
- **e2e test setups updated with DomainExceptionFilter** — required after AuthService refactor; NestJS default filter doesn't catch domain errors
- **interceptor.spec.ts renamed to interceptor.e2e-spec.ts** — unit test config catches *.spec.ts; interceptor test needs MongoMemoryServer, belongs to e2e suite
- **AuditListener @OnEvent({async:true})** — prevents blocking event emitter thread
- **Audit payload contract**: `{usuarioId, recurso, recursoId, contexto, ip?, userAgent?}` — documented in AuditListener JSDoc; all future modules must follow this shape

## Pending Todos / Blockers

- User must configure GitHub repository secrets before CI/CD pipelines activate:
  - `NAS_STAGING_WEBHOOK_URL`, `NAS_STAGING_WEBHOOK_TOKEN`
  - `NAS_PROD_WEBHOOK_URL`, `NAS_PROD_WEBHOOK_TOKEN`
  - `DEPLOY_NOTIFICATION_WEBHOOK` (optional)
- User must run `./infra/scripts/generate-self-signed-cert.sh` before first `docker compose up`
- User must `cp .env.example .env` and fill secrets before running locally or in Docker
- `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` env vars required before running `pnpm seed` (plan 02-04)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02 | 01 | ~2h | 3 | 30 |
| 02 | 02 | ~6min | 2 | 15 |
| 02 | 03 | ~45min | 2 | 15 |

## Next Up

Plan 02-04 — Seed idempotente + esquemas dinámicos + backup rclone (AUTH-05, AUTH-08, INF-06).
