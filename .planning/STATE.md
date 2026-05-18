---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-18T14:15:00.000Z"
last_activity: 2026-05-18
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
---

# Lexscribe — State

## Current Position

Phase: 03 (Contactos) — COMPLETE
Plan: 3 of 3

- **Milestone:** v1.0 MVP
- **Phase:** 3
- **Phase:** 2 — Complete (2026-05-02)
- **Plan:** 03-01 — Complete (2026-05-03)
- **Plan:** 03-02 — Complete (2026-05-18) — UAT approved
- **Plan:** 03-03 — Complete (2026-05-18)
- **Status:** Phase 03 Complete — Next: Phase 04
- **Last activity:** 2026-05-18

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

## Phase 3 Progress

**Plans executed:**

- `03-01` — NestJS ContactosModule: schema+softDeletePlugin, repository, service, controller, e2e tests (CONT-01..05), EsquemasService integration for dynamic params
- `03-02` — Next.js frontend: QueryClientProvider layout, lib/api/contactos.ts, ContactoForm+ContactoTable+ParametrosEditor components, 3 CRUD pages, 14 Vitest tests, UAT 5 scenarios approved
- `03-03` — Unit tests backend: 30 tests (14 repo, 10 service, 6 controller), 87.31% line coverage, 96.15% function coverage, coverageThreshold configured in jest.config.ts

**Requirements addressed:** CONT-01, CONT-02, CONT-03, CONT-04, CONT-05

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
- **ZodValidationPipe throws BadRequestException (not DomainError)** — Zod strict() errors return 400 without `code:VALIDATION` in body; DomainExceptionFilter only catches DomainError subclasses
- **returnDocument:'after' instead of {new:true}** — Mongoose v9 deprecates `{new:true}` in findOneAndUpdate; all contactos repository calls use `returnDocument:'after'`
- **FilterQuery removed in Mongoose v9** — use `Record<string,unknown>` or `QueryFilter<T>` for filter types in repositories
- **@hookform/resolvers pinned to v3.x** — v5 imports `zod/v4/core`, incompatible with project's zod v3 schemas; v3.10.0 is the correct bridge version
- **@tanstack/query-core pinned as explicit frontend dep** — pnpm isolated node_modules does not auto-hoist it from react-query internals into frontend webpack resolution scope; must be listed explicitly
- **Next.js 14 sync params** — `params: { id: string }` is synchronous in Next.js 14; `use(params)` async pattern is Next.js 15+ only
- **Schema pre-hook coverage via kareem internals** — extract hooks from `schema.s.hooks._pres`, skip `_setTimestampsOnUpdate` by name, call synchronously with fake query; no DB required for unit tests (03-03)

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
| 03 | 01 | ~30min | 3 | 13 |
| 03 | 02 | ~45min | 3 | 15 |
| 03 | 03 | ~15min | 4 | 1 |

## Next Up

Phase 04 — Cláusulas y Expedientes (biblioteca de cláusulas + expedientes con contactos asociados).
