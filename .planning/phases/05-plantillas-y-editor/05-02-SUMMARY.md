---
phase: 05-plantillas-y-editor
plan: "02"
subsystem: backend-plantillas
tags: [nestjs, mongodb, minio, s3, versioning, variable-detection, declare-variable, mammoth, docx, e2e, tdd]
dependency_graph:
  requires:
    - 05-01 (parseVariables, validarVariables, KNOWN_TIPO_OBJETO, Zod schemas)
  provides:
    - POST /plantillas (text/pegado path — PLAN-01)
    - POST /plantillas/upload (.docx path — PLAN-01)
    - PATCH /plantillas/:id (versioning two-step — PLAN-06)
    - POST /plantillas/:id/declarar-variable (PLAN-04)
    - GET /plantillas, GET /plantillas/:id, GET /plantillas/:id/versions
    - DELETE /plantillas/:id (soft-delete)
    - StorageService (putObject + getPresignedUrl — reusable by Phase 6)
    - PlantillasRepository (exported for Phase 6 documentos)
  affects:
    - 05-03-frontend-editor (consumes all endpoints)
    - 06-xx-documentos (imports StorageService + PlantillasRepository)
tech_stack:
  added:
    - "@aws-sdk/client-s3@^3.658.0 (MinIO S3-compatible client)"
    - "@aws-sdk/s3-request-presigner@^3.658.0 (presigned URLs)"
    - "mammoth@^1.8.0 (.docx → plain text extraction)"
    - "docx@^9.0.0 (plain text → .docx buffer)"
    - "@types/multer@^1.4.12 (FileInterceptor types)"
  patterns:
    - TDD London School — RED/GREEN/REFACTOR per task
    - Insert-then-deactivate versioning (no MongoDB transactions)
    - StorageService NODE_ENV=test guard (skip MinIO in CI)
    - EsquemasService injection for declare-variable (PLAN-04)
    - Zod + service defense-in-depth (Pitfall 4: clausula/fecha rejected at both layers)
key_files:
  created:
    - apps/backend/src/common/storage/storage.service.ts
    - apps/backend/src/common/storage/storage.module.ts
    - apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts
    - apps/backend/src/modules/plantillas/plantillas.repository.ts
    - apps/backend/src/modules/plantillas/conversion.ts
    - apps/backend/src/modules/plantillas/conversion.spec.ts
    - apps/backend/src/modules/plantillas/plantillas.service.ts
    - apps/backend/src/modules/plantillas/plantillas.controller.ts
    - apps/backend/src/modules/plantillas/plantillas.module.ts
    - apps/backend/src/modules/plantillas/dto/create-plantilla.dto.ts
    - apps/backend/src/modules/plantillas/dto/update-plantilla.dto.ts
    - apps/backend/src/modules/plantillas/dto/query-plantilla.dto.ts
    - apps/backend/src/modules/plantillas/dto/declarar-variable.dto.ts
    - apps/backend/test/plantillas/plantillas.e2e-spec.ts
  modified:
    - apps/backend/src/app.module.ts (PlantillasModule registered)
    - apps/backend/package.json (@aws-sdk, mammoth, docx, @types/multer added)
    - apps/backend/jest.config.ts (coverageThreshold for plantillas module)
decisions:
  - "insert-then-deactivate versioning with no MongoDB session/transaction (single-node mongod — STATE decision)"
  - "StorageService not @Global() — explicit import per module (DDD; CLAUDE.md)"
  - "NODE_ENV=test guard in StorageService.onModuleInit skips S3 calls entirely in CI"
  - "@types/multer added as devDependency for Express.Multer.File type resolution"
  - "esquema seeding in e2e test setup (empty expediente+contacto rows) enables PLAN-04 coverage"
  - "Zod AND service both reject clausula/fecha tipoObjeto (Pitfall 4 defense-in-depth)"
metrics:
  duration: "~30 min"
  completed_date: "2026-05-31"
  tasks_completed: 3
  files_created: 14
  files_modified: 3
  tests_added: 35
---

# Phase 05 Plan 02: Backend Plantillas Summary

**One-liner:** NestJS plantillas module with MinIO StorageService, insert-then-deactivate versioning (PLAN-06), variable detection+block on save (F-030b), declare-variable EsquemasService proxy (PLAN-04), mammoth/.docx conversion, and 35 tests (7 unit + 28 e2e).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | StorageService + StorageModule (S3/MinIO reusable client) | 90f4c0f | storage.service.ts, storage.module.ts, package.json |
| 2 (RED) | Failing conversion tests (TDD RED) | c8a676e | conversion.spec.ts |
| 2 (GREEN) | Schema + repository + conversion helpers + jest threshold | 81e1a89 | plantilla.schema.ts, plantillas.repository.ts, conversion.ts, jest.config.ts |
| 3 | Service + controller + module + DTOs + e2e (28 tests) | 35949d9 | plantillas.service.ts, plantillas.controller.ts, plantillas.module.ts, 4 DTOs, e2e spec, app.module.ts |

## Verification Results

- `pnpm --filter @lexscribe/backend type-check` — clean (0 errors)
- `pnpm --filter @lexscribe/backend jest --runTestsByPath src/modules/plantillas/conversion.spec.ts` — 7/7 pass
- `pnpm --filter @lexscribe/backend test:e2e -- --runTestsByPath test/plantillas/plantillas.e2e-spec.ts` — 28/28 pass
- No `session`/`startTransaction` calls in plantillas.repository.ts (insert-then-deactivate)
- No `docxtemplater` import anywhere in plantillas module (only mammoth + docx)
- `parseVariables(` referenced in plantillas.service.ts (shared parser linked)
- `addParametro(` referenced in plantillas.service.ts (EsquemasService linked)
- `putObject(` referenced in plantillas.service.ts (StorageService linked)
- `plantillaRaizId` present in schema
- `PlantillasModule` present in app.module.ts
- `Solo se pueden declarar variables de expediente o contacto` in service (Pitfall 4 defense)

## Decisions Made

1. **Insert-then-deactivate versioning** — No MongoDB sessions/transactions (single-node mongod). New active version inserted FIRST, then old deactivated. A crash leaves TWO active versions (fixable by operator) rather than ZERO (unrecoverable).

2. **StorageService not @Global()** — Explicit import in PlantillasModule follows DDD/bounded-context principle. Phase 6 documentos will import StorageModule explicitly too.

3. **NODE_ENV=test guard in onModuleInit** — Skips HeadBucket/CreateBucket calls entirely when `NODE_ENV=test`. No live MinIO needed in CI/e2e.

4. **@types/multer devDependency** — Resolves `Express.Multer` namespace for FileInterceptor type. Multer itself is bundled with @nestjs/platform-express.

5. **Esquema seed in e2e setup** — Empty expediente+contacto esquema rows required for EsquemasService.addParametro to find the schema for PLAN-04 tests. Pattern mirrors expedientes.e2e-spec.ts.

6. **Zod + service Pitfall 4 defense** — DeclararVariableSchema already restricts tipoObjeto to expediente|contacto. Service also explicitly guards with `if (dto.tipoObjeto !== 'expediente' && dto.tipoObjeto !== 'contacto')`. Double protection per plan spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] e2e declarar-variable tests returned 404 (missing esquema seed)**
- **Found during:** Task 3 — PLAN-04 e2e tests
- **Issue:** `EsquemasService.addParametro` calls `findByUsuarioAndTipo` internally; when no esquema rows exist in the test DB, the method throws `NotFoundError → 404`. The seed step was missing from the test setup.
- **Fix:** Added esquema seeding in `beforeAll` (empty expediente + contacto rows) and reset in `afterEach` (`$set: { parametros: [] }`). Pattern mirrors expedientes.e2e-spec.ts.
- **Files modified:** `apps/backend/test/plantillas/plantillas.e2e-spec.ts`
- **Commit:** 35949d9 (included in main Task 3 commit)

**2. [Rule 3 - Blocking] TypeScript error — Express.Multer type missing**
- **Found during:** Task 3 — type-check after controller creation
- **Issue:** `Express.Multer.File` type unavailable; `@types/multer` not in devDependencies.
- **Fix:** Added `"@types/multer": "^1.4.12"` to devDependencies.
- **Files modified:** `apps/backend/package.json`
- **Commit:** 35949d9 (included in main Task 3 commit)

## Known Stubs

None. All endpoints are fully implemented and tested. StorageService.putObject is mocked in tests but the implementation is real (calls S3 in production). No hardcoded empty values or placeholders in the data flow.

## Self-Check: PASSED

Files verified present:
- apps/backend/src/common/storage/storage.service.ts — FOUND
- apps/backend/src/common/storage/storage.module.ts — FOUND
- apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.repository.ts — FOUND
- apps/backend/src/modules/plantillas/conversion.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.service.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.controller.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.module.ts — FOUND
- apps/backend/test/plantillas/plantillas.e2e-spec.ts — FOUND

Commits verified:
- 90f4c0f — feat(05-02): StorageService + StorageModule
- c8a676e — test(05-02): failing conversion tests (TDD RED)
- 81e1a89 — feat(05-02): plantilla schema + repository + conversion helpers
- 35949d9 — feat(05-02): plantillas service + controller + module + DTOs + e2e
