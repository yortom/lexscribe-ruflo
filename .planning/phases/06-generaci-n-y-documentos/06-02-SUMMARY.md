---
phase: 06-generaci-n-y-documentos
plan: "02"
subsystem: documentos-module-backend
tags: [nestjs, documentos, minio, forwardref, tdd, e2e, doi02, doc04, doc05, doc06, doc07, expe07]
dependency_graph:
  requires: [06-01-backend-pipeline-generacion, 04-02-backend-expedientes, 05-02-backend-plantillas]
  provides: [DocumentosModule, DocumentosService, DocumentosController, documentos.e2e-spec, documentos.service.spec]
  affects: [ExpedientesService.getById (EXPE-07 closed), GenerationService (DI fixed), AppModule]
tech_stack:
  added: []
  patterns: [forwardRef circular DI, TDD London School, multipart upload FileInterceptor, presigned URL 300s TTL, soft-delete universal, extension validation Pitfall-5]
key_files:
  created:
    - apps/backend/src/modules/documentos/dto/generate-documento.dto.ts
    - apps/backend/src/modules/documentos/dto/query-documento.dto.ts
    - apps/backend/src/modules/documentos/dto/upload-documento.dto.ts
    - apps/backend/src/modules/documentos/documentos.service.ts
    - apps/backend/src/modules/documentos/documentos.controller.ts
    - apps/backend/src/modules/documentos/documentos.module.ts
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts
    - apps/backend/test/documentos/documentos.e2e-spec.ts
  modified:
    - apps/backend/src/modules/expedientes/expedientes.module.ts
    - apps/backend/src/modules/expedientes/expedientes.service.ts
    - apps/backend/src/modules/documentos/generation/generation.service.ts
    - apps/backend/src/app.module.ts
decisions:
  - "GenerationService DI: use concrete PlantillasService/ExpedientesRepository class types instead of anonymous duck-typed interfaces — NestJS reflect-metadata cannot resolve anonymous types at runtime"
  - "EXPE-07 closed via DocumentosRepository injection (not DocumentosService) in ExpedientesService — breaks circular DI at provider level (research Pitfall 3)"
  - "Extension validation in uploadExistente uses file.originalname (Pitfall 5) — rejects .exe; MIME_BY_EXT const defines allowed set"
  - "TODO Phase 7 FL-9 comment in DocumentosService.remove — event evaluation on delete is out of scope for Phase 6"
  - "expedienteId required as query param for list endpoint; ValidationError thrown in controller if missing"
metrics:
  duration: ~35min
  completed: "2026-06-02"
  tasks: 3
  files_created: 8
  files_modified: 4
  tests: 27
---

# Phase 06 Plan 02: Backend Modulo Documentos Summary

DocumentosModule end-to-end: DTOs + service orquestación (DOC-02/04/05/06) + controller + circular DI wiring (forwardRef) + AppModule registration + EXPE-07 closed (documentos reales) + 27 tests green (12 unit + 15 e2e).

## What Was Built

1. **DTOs** (3 files): `GenerateDocumentoDto`, `QueryDocumentoDto`, `UploadDocumentoMetaDto` — each `extends createZodDto(...)` from `@lexscribe/shared-validation`.

2. **DocumentosService** (`documentos.service.ts`): Orquestación completa:
   - `generar()`: DOC-02 link asignacionesRol (tolerates ConflictError) → delegate to `GenerationService.generar()`
   - `uploadExistente()`: DOC-06 ext validation (Pitfall 5) → `storage.putObject` → `repo.create()` tipo=subido
   - `list()`: paginated by expedienteId
   - `getById()`: single doc lookup
   - `getDownloadUrl()`: DOC-05 presigned URL 300s TTL
   - `remove()`: soft-delete

3. **DocumentosController** (`documentos.controller.ts`): 6 endpoints with `JwtAuthGuard` + `AuditInterceptor`:
   - `POST /documentos/generar/:expedienteId` (`@Audited('documento','create')`)
   - `POST /documentos/upload/:expedienteId` (`FileInterceptor('file')` + `@Audited('documento','create')`)
   - `GET /documentos` (requires `?expedienteId=`)
   - `GET /documentos/:id`
   - `GET /documentos/:id/download`
   - `DELETE /documentos/:id` (`@Audited('documento','delete')`)

4. **DocumentosModule** (`documentos.module.ts`): `forwardRef(() => ExpedientesModule)` + `forwardRef(() => ContactosModule)`. Exports `DocumentosService` + `DocumentosRepository`.

5. **EXPE-07 closed** in `expedientes.service.ts`: `getById` now calls `documentosRepo.listByExpediente()` (page 1, limit 100) instead of returning `documentos: []`.

6. **AppModule** updated: `DocumentosModule` registered in imports array.

7. **GenerationService DI fix**: Changed anonymous duck-typed constructor params to concrete `PlantillasService` and `ExpedientesRepository` class types so NestJS reflect-metadata can resolve them at runtime.

## Tests

**Unit tests** (`documentos.service.spec.ts`) — 12 tests, all green:
- Test 1 (DOC-02): `linkContacto` called per asignacionRol in order
- Test 2 (DOC-02): `ConflictError` from `linkContacto` silently swallowed
- Test 3 (DOC-07): `datosCongelados` returned unchanged from `GenerationService`
- Test 4 (DOC-06): `.exe` extension → `ValidationError`; `putObject` not called
- Test 5 (DOC-05): `getPresignedUrl(storagePath, 300)` called; returns `{ url }`
- Plus 7 supporting tests (list, remove, MIME types, getById NotFoundError)

**E2E tests** (`documentos.e2e-spec.ts`) — 15 tests, all green:
- DOC-06: `.txt`, `.docx`, `.pdf` uploads → 201 with correct tipo/formato/storagePath
- DOC-06: `.exe` → 400 ValidationError
- DOC-06: missing nombre → 400
- DOC-05: `GET /:id/download` → 200 `{ url }`, presigned mock URL
- DOC-05: `getPresignedUrl` called with TTL=300
- list: items sorted by `fechaCreacion` desc, empty list, missing `expedienteId` → 400
- DELETE: soft-delete + excludes from list, 404 for missing
- Audit: upload writes `auditoria` record `recurso=documento accion=create`
- Auth: 401 for unauthenticated

**Regression** (expedientes e2e): 24/24 still green.

## Decisions Made

- `GenerationService` DI fix: NestJS cannot inject anonymous duck-typed constructor params. Changed to concrete `PlantillasService` and `ExpedientesRepository` with `@Inject(forwardRef(...))` for the circular dependency.
- `EXPE-07` uses `DocumentosRepository` directly (not `DocumentosService`) in `ExpedientesService` to avoid deeper circular dependency chain.
- `buildContext` in `GenerationService` now typed as `eslint-disable any` to handle Mongoose `HydratedDocument` not satisfying `Record<string, unknown>` TypeScript index constraint.
- Extension validation uses `file.originalname.lastIndexOf('.')` — handles files with no extension gracefully (returns empty string, fails `MIME_BY_EXT` lookup → `ValidationError`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed GenerationService DI — anonymous types not resolvable by NestJS**
- **Found during:** Task 2 (expedientes e2e regression after wiring DocumentosModule)
- **Issue:** `GenerationService` constructor used anonymous duck-typed interfaces `{ getById(...) }` and `{ findById(...) }`. NestJS `reflect-metadata` cannot identify these as injectable providers at runtime → `Nest can't resolve dependencies of the GenerationService (?, ...)`.
- **Fix:** Changed constructor params to use concrete `PlantillasService` and `ExpedientesRepository` class types with proper `@Inject(forwardRef(...))` decorator for the circular dependency.
- **Files modified:** `apps/backend/src/modules/documentos/generation/generation.service.ts`
- **Commit:** `8ca718c`

**2. [Rule 1 - Bug] buildContext any type for Mongoose HydratedDocument**
- **Found during:** Task 2 (TypeScript type check after switching to concrete types)
- **Issue:** `buildContext` expected `{ nombre: string; fechaCreacion: string; parametros: Record<string, unknown> }` but `ExpedientesRepository.findById` returns `HydratedDocument<Expediente>` which doesn't satisfy `Record<string, unknown>` TypeScript index constraint.
- **Fix:** Changed `buildContext` param type to `any` with eslint-disable comment — this is an established NestJS/Mongoose pattern (Mongoose documents have complex intersected types).
- **Files modified:** `apps/backend/src/modules/documentos/generation/generation.service.ts`
- **Commit:** `8ca718c`

## Known Stubs

None. All endpoints are fully implemented and wired. `documentos: []` placeholder in `expediente.getById` is now replaced with real data from `DocumentosRepository.listByExpediente`.

## Self-Check: PASSED

Files exist:
- `apps/backend/src/modules/documentos/documentos.service.ts` — FOUND
- `apps/backend/src/modules/documentos/documentos.controller.ts` — FOUND
- `apps/backend/src/modules/documentos/documentos.module.ts` — FOUND
- `apps/backend/src/modules/documentos/dto/generate-documento.dto.ts` — FOUND
- `apps/backend/src/modules/documentos/dto/query-documento.dto.ts` — FOUND
- `apps/backend/src/modules/documentos/dto/upload-documento.dto.ts` — FOUND
- `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` — FOUND
- `apps/backend/test/documentos/documentos.e2e-spec.ts` — FOUND

Commits:
- `e38d2b0` feat(06-02): add DTOs, DocumentosService and DocumentosController
- `8ca718c` feat(06-02): wire DocumentosModule, close EXPE-07, fix GenerationService DI
- `55e730f` test(06-02): add DocumentosService spec (DOC-02/05/06/07) — TDD RED
- `e7f901c` feat(06-02): add documentos e2e tests (DOC-05/DOC-06) — TDD GREEN
