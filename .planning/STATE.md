---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: "Phase 02 shipped — PR #1"
last_updated: "2026-05-03T06:39:05.248Z"
last_activity: 2026-05-03
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
---

# Lexscribe — State

## Current Position

Phase: 02 (auth-y-bases-transversales) — COMPLETE
Plan: 4 of 4 — COMPLETE

- **Milestone:** v1.0 MVP
- **Phase:** 3
- **Phase:** 2 — Complete (2026-05-02)
- **Plan:** Not started
- **Plan:** 02-02 — Complete (2026-05-02)
- **Plan:** 02-03 — Complete (2026-05-02)
- **Plan:** 02-04 — Complete (2026-05-02)
- **Status:** Phase 02 shipped — PR #1
- **Last activity:** 2026-05-03

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
- `02-04` — EsquemasModule: GET/POST/DELETE with JwtAuthGuard + $addToSet idempotency + 409/400/501 errors; seed idempotente (pnpm seed, no password overwrite); backup-daily.sh rclone + dry-run + README, 34 e2e tests green

**Requirements addressed:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, INF-06

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
- **Explicit Types.ObjectId in EsquemasRepository** — Mongoose 9 does not auto-coerce string to ObjectId in all query paths; `toObjectId()` helper added
- **TipoObjetoSchema.parse() in handler, not pipe** — ZodError caught and translated to ValidationError so DomainExceptionFilter maps to 400
- **NotImplementedError (501)** — DomainError subclass for post-MVP features (F-095 delete parameter)
- **runSeed() exported** — allows e2e test import without spawning subprocess; `process.exit` only in `require.main === module` branch
- **backup-daily.sh --dry-run** — validates script syntax and flow without touching Drive; CI runs `bash -n` only

## Pending Todos / Blockers

- User must configure GitHub repository secrets before CI/CD pipelines activate:
  - `NAS_STAGING_WEBHOOK_URL`, `NAS_STAGING_WEBHOOK_TOKEN`
  - `NAS_PROD_WEBHOOK_URL`, `NAS_PROD_WEBHOOK_TOKEN`
  - `DEPLOY_NOTIFICATION_WEBHOOK` (optional)
- User must run `./infra/scripts/generate-self-signed-cert.sh` before first `docker compose up`
- User must `cp .env.example .env` and fill secrets before running locally or in Docker
- User must run `pnpm seed` (with `.env` and Mongo running) to initialize user + esquemas before first use
- User must run `rclone config` on NAS and configure `gdrive` remote (see `infra/scripts/README.md`)
- User must install backup-daily.sh in cron of NAS (see `infra/scripts/README.md` step 7)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02 | 01 | ~2h | 3 | 30 |
| 02 | 02 | ~6min | 2 | 15 |
| 02 | 03 | ~45min | 2 | 15 |
| 02 | 04 | ~45min | 3 | 18 |

## Next Up

Phase 03 — Contactos (CRUD, soft-delete, AES encryption for PII, e2e tests).
