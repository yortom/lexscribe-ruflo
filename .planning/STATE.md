---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-06-02T19:39:43.629Z"
last_activity: 2026-06-02
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 24
  completed_plans: 20
---

# Lexscribe — State

## Current Position

Phase: 06 (generaci-n-y-documentos) — EXECUTING
Plan: 3 of 4

- **Milestone:** v1.0 MVP
- **Phase:** 6
- **Phase:** 3 — Complete (2026-05-18)
- **Plan:** Not started
- **Plan:** 04-02 — Complete (2026-05-28) — backend expedientes + CONT-05 closed, 24 e2e tests
- **Plan:** 05-01 — Complete (2026-05-31) — parser shared: variable-parser, clausula-renumber, plantilla Zod schemas + shared-types, 52 vitest tests (TDD)
- **Plan:** 05-02 — Complete (2026-05-31) — backend plantillas: StorageService (MinIO), schema+versioning, service+controller, 35 tests (7 unit + 28 e2e)
- **Plan:** 05-03 — Complete (2026-05-31) — frontend editor: CM6 editor + VariablesPanel + InsertarClausulaModal + DeclararVariableModal + plantillas pages
- **Plan:** 05-04 — Complete (2026-05-31) — SEC-06 coverage gate: 67 new unit tests, plantillas module 99.13% lines / 79.03% branches, full pipeline green
- **Plan:** 06-01 — Complete (2026-06-02) — docxtemplater+pizzip, StorageService.getObject, Documento schema+repo, GenerationService pipeline, 7 TDD tests (DOC-01/03/04/07)
- **Plan:** 06-02 — Complete (2026-06-02) — DocumentosModule (controller/service/DTOs/module), EXPE-07 closed, GenerationService DI fixed, 27 tests (12 unit + 15 e2e), DOC-02/04/05/06/07
- **Status:** Executing Phase 06
- **Last activity:** 2026-06-02

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

## Phase 4 Progress (Wave 1 complete)

**Plans executed:**

- `04-01` — NestJS ClausulasModule: schema + softDeletePlugin + `$text` index (nombre/texto weights 5/1) + compound {usuarioId,activo,labels} index, repository, service, controller (JwtAuthGuard + @Audited), Zod DTOs, 24 e2e tests (CLAU-01..03 + búsqueda + filtro labels + soft-delete + audit)
- `04-02` — NestJS ExpedientesModule: schema with embedded `contactos[{contactoId,rol}]` + 3 indexes + softDelete, repository (findByContactoId/pushContacto/pullContacto), service (link/unlink with (contactoId,rol) uniqueness → 409, eventos, dynamic params), controller (CRUD + POST/DELETE :id/contactos). **CONT-05 closed** via bidirectional forwardRef (ContactosService.getById populates real expedientesVinculados). 24 e2e tests (EXPE-01..07 + audit + CONT-05 real-link)

**Requirements addressed:** CLAU-01, CLAU-02, CLAU-03, EXPE-01..07 (backend), CONT-05 (closed)

**Integration verified:** 48/48 e2e tests pass (clausulas + expedientes together), backend build + shared packages build green.

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
- **Bidirectional forwardRef ContactosModule ↔ ExpedientesModule** — CONT-05 closure injects ExpedientesRepository into ContactosService.getById; both modules use `forwardRef` to break circular DI (04-02)
- **Unicidad (contactoId, rol) validada en aplicación** — MongoDB no soporta unique en sub-array del mismo doc; ExpedientesService.linkContacto lanza ConflictError → 409 (04-02)
- **`minimize: false` en expediente schema** — sin él, `parametros: {}` vacío serializa como undefined y rompe el contrato del detalle (04-02)
- **$text index Mongoose con weights** — clausula schema usa `index({nombre:'text', texto:'text'}, {weights:{nombre:5, texto:1}})` para full-text search priorizando nombre (04-01)
- **Eventos `expedientes.linked` / `expedientes.unlinked`** — terminan en `.linked`/`.unlinked`, capturados por wildcards existentes del AuditListener (04-02)
- **`rol` con encode/decodeURIComponent** — rol viaja como path param en DELETE :id/contactos/:contactoId/:rol; soporta espacios/acentos (04-02)
- **KNOWN_TIPO_OBJETO standalone 4-value const** — parser recognizes expediente/contacto/clausula/fecha; distinct from esquemas.TIPO_OBJETO (expediente/contacto only for addParametro) (05-01)
- **DeclararVariableSchema restricts tipoObjeto to expediente|contacto** — clausula/fecha not persistable to dynamic schema; Pitfall 4 enforced at Zod boundary (05-01)
- **esArray always false in MVP** — F-025 iteration syntax {{#each}} is P1/post-MVP and explicitly not parsed (05-01)
- **insert-then-deactivate versioning** — new active doc inserted BEFORE deactivating old; no MongoDB transactions (single-node mongod). Crash leaves 2 active (fixable) not 0 (unrecoverable) (05-02)
- **StorageService not @Global()** — explicit import per module (DDD). Phase 6 documentos will import StorageModule explicitly (05-02)
- **NODE_ENV=test guard in StorageService.onModuleInit** — skips HeadBucket/CreateBucket in CI; no live MinIO needed for tests (05-02)
- **Zod + service defense-in-depth Pitfall 4** — DeclararVariableSchema restricts tipoObjeto to expediente|contacto AND service checks explicitly (05-02)
- **MISSING_ID = '000000000000000000000000' pattern** — valid 24-char hex for "not found" branches in repository unit tests; avoids BSONError from toObjectId() (05-04)
- **Directory-level jest threshold includes controller/DTOs** — coverageThreshold per `./src/modules/plantillas/` counts all files; controller spec required to avoid 0% dragging aggregate below 80% (05-04)
- **Contactos branch coverage at 69.69% deferred** — pre-existing from 03-03, out of scope for 05-04; `pnpm -r run test` not affected (no --coverage in test script) (05-04)
- **datosCongelados is same object passed to doc.render() and repo.create()** — DOC-07 immutability by design; no copy needed, one reference (06-01)
- **docId pre-computed via new Types.ObjectId() before MinIO upload** — key includes docId; no second DB round-trip needed after upload (06-01)
- **StorageService.getObject uses GetObjectCommand already imported in Phase 5** — only Readable from 'stream' added as new import (06-01)
- **NuevoCampoSchema restricts tipoObjeto to expediente|contacto** — clausula/fecha not declarable in dynamic schema; same Pitfall 4 boundary as DeclararVariableSchema (06-01)
- **GenerationService DI uses concrete class types** — NestJS reflect-metadata cannot resolve anonymous duck-typed interfaces at runtime; PlantillasService and ExpedientesRepository used as concrete tokens with @Inject(forwardRef(...)) (06-02)
- **EXPE-07 closed via DocumentosRepository injection in ExpedientesService** — uses forwardRef at provider level to break circular DI; limit=100 paginates real documentos in expediente detail (06-02)
- **Extension validation uses file.originalname (Pitfall 5)** — MIME_BY_EXT[ext] lookup by lowercase extension; browser-provided mimetype ignored; .exe and unknown extensions → ValidationError (06-02)

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
| Phase 05 P01 | 6min | 3 tasks | 11 files |
| Phase 05 P02 | 30min | 3 tasks | 17 files |
| 05 | 04 | ~20min | 3 | 4 |
| Phase 06 P01 | ~6min | 3 tasks | 12 files |
| Phase 06 P02 | ~35min | 3 tasks | 12 files |

## Next Up

Phase 06 — Documentos (generación de documentos .docx desde plantillas + expedientes, docxtemplater).
