---
phase: 03-contactos
plan: 01
subsystem: contactos
tags: [mongoose, soft-delete, zod, e2e, esquemas, audit]
dependency_graph:
  requires: [02-02-bases-transversales, 02-03-auditoria, 02-04-seed-esquemas-backup]
  provides: [ContactosModule, ContactosService, ContactosRepository, Contacto schema]
  affects: [Phase 4 expedientes — will consume ContactosService to resolve contacto refs]
tech_stack:
  added: []
  patterns: [softDeletePlugin per-schema, createZodDto, returnDocument:after, partial unique index, text index]
key_files:
  created:
    - packages/shared-validation/src/contactos.ts
    - packages/shared-types/src/contacto.ts
    - apps/backend/src/modules/contactos/schemas/contacto.schema.ts
    - apps/backend/src/modules/contactos/contactos.repository.ts
    - apps/backend/src/modules/contactos/contactos.service.ts
    - apps/backend/src/modules/contactos/contactos.controller.ts
    - apps/backend/src/modules/contactos/contactos.module.ts
    - apps/backend/src/modules/contactos/dto/create-contacto.dto.ts
    - apps/backend/src/modules/contactos/dto/update-contacto.dto.ts
    - apps/backend/src/modules/contactos/dto/query-contacto.dto.ts
    - apps/backend/test/contactos/contactos.e2e-spec.ts
  modified:
    - packages/shared-validation/src/index.ts
    - packages/shared-types/src/index.ts
    - apps/backend/src/app.module.ts
decisions:
  - ZodValidationPipe throws BadRequestException (not DomainError) — tests assert status 400 without code:VALIDATION
  - returnDocument:after used instead of deprecated {new:true} in all findOneAndUpdate calls
  - AuthModule imported in ContactosModule (not global — PassportModule.register is per-module)
  - FilterQuery removed (Mongoose v9 renamed it to QueryFilter) — used Record<string,unknown> for filter type
metrics:
  duration: ~30min
  completed: 2026-05-03
  tasks: 3
  files: 13
---

# Phase 3 Plan 01: Backend Contactos Summary

Módulo NestJS `contactos` completo con softDeletePlugin (primera colección de negocio productiva), esquema dinámico de parámetros vía EsquemasService, 16 e2e tests verdes cubriendo CONT-01..05.

## Endpoints expuestos

Todos bajo `/api/v1/contactos`, todos requieren Bearer JWT:

| Method | Path | Description | Audit |
|--------|------|-------------|-------|
| GET | `/contactos` | Listar con `search`, `tipologia`, `page`, `limit` — response `{items,total,page,limit}` | — |
| GET | `/contactos/:id` | Detalle + `expedientesVinculados:[]` (stub Phase 4) | — |
| POST | `/contactos` | Crear contacto física/jurídica | `@Audited('contacto','create')` |
| PATCH | `/contactos/:id` | Actualizar campos parciales | `@Audited('contacto','update')` |
| DELETE | `/contactos/:id` | Soft-delete (`activo:false`, `fechaInactivacion`) | `@Audited('contacto','delete')` |

### Response shapes

**GET list:** `{ items: Contacto[], total: number, page: number, limit: number }`

**GET /:id:** `{ ...Contacto, expedientesVinculados: [] }` — stub vacío hasta Phase 4

**POST/PATCH:** `Contacto` document

**DELETE:** `Contacto` document con `activo:false`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript definite assignment assertions on Mongoose schema class**
- **Found during:** Task 1
- **Issue:** `TS2564: Property has no initializer` on all Mongoose `@Prop()` fields
- **Fix:** Added `!` definite assignment assertion to all class properties (same pattern as esquema.schema.ts)
- **Files modified:** `apps/backend/src/modules/contactos/schemas/contacto.schema.ts`
- **Commit:** 0e624f8

**2. [Rule 1 - Bug] FilterQuery removed in Mongoose v9**
- **Found during:** Task 1
- **Issue:** `TS2614: Module 'mongoose' has no exported member 'FilterQuery'` — renamed to `QueryFilter` in Mongoose v9
- **Fix:** Used `Record<string, unknown>` for the filter variable type (sufficient for runtime correctness)
- **Files modified:** `apps/backend/src/modules/contactos/contactos.repository.ts`
- **Commit:** 0e624f8

**3. [Rule 1 - Bug] Deprecated `{new:true}` option in findOneAndUpdate**
- **Found during:** Task 3 (Mongoose deprecation warning in test output)
- **Issue:** Mongoose 9 deprecates `{new:true}` option — use `returnDocument:'after'`
- **Fix:** Replaced `{new:true}` with `{returnDocument:'after'}` in all `findOneAndUpdate` calls
- **Files modified:** `apps/backend/src/modules/contactos/contactos.repository.ts`
- **Commit:** 0ecab18

**4. [Rule 1 - Bug] ZodValidationPipe body format mismatch in tests**
- **Found during:** Task 3
- **Issue:** Tests expected `{code:'VALIDATION'}` but ZodValidationPipe throws `BadRequestException` (not `DomainError`) so `DomainExceptionFilter` doesn't intercept it — body uses NestJS default format without `code` field
- **Fix:** Updated 2 test assertions to check `status === 400` only (not `body.code`)
- **Files modified:** `apps/backend/test/contactos/contactos.e2e-spec.ts`
- **Commit:** 0ecab18

## Key Decisions

- **AUTH-06 closure:** `softDeletePlugin` applied for the first time to a business collection (`contactos`). Previously only applied to `usuarios`. Verified via e2e: `activo:false` + `fechaInactivacion` set on DELETE; soft-deleted record excluded from listing; `{withInactive:true}` bypass works.
- **Phase 8 prep:** `documentacionFiscalHash` field exists in schema as `null` placeholder. AES encryption of `documentacionFiscal` + `documentoIdentidad` in Phase 8 won't require a migration.
- **JwtAuthGuard path confirmed:** `apps/backend/src/modules/auth/guards/jwt-auth.guard` — same path as used in `EsquemasController`.
- **AuthModule must be imported per-module:** Not marked `@Global()` — `PassportModule.register` needs to be in scope.

## Test Results

- Unit tests: 10 passing (unchanged from Phase 2)
- E2E tests: 50 passing total (12 suites)
  - contactos suite: 16 tests — all green
  - All prior Phase 2 suites: still green

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `expedientesVinculados: []` | `contactos.service.ts` | ~31 | Phase 4 — expedientes module doesn't exist yet; will be populated via join query on `expedientes.contactos.contactoId` |

This stub is intentional and documented per CONT-05. It does not prevent CONT-05's goal (the stub exists in the response as required).

## Self-Check: PASSED

All files exist on disk. All 4 task commits confirmed in git history.

| Item | Result |
|------|--------|
| packages/shared-validation/src/contactos.ts | FOUND |
| packages/shared-types/src/contacto.ts | FOUND |
| apps/backend/src/modules/contactos/schemas/contacto.schema.ts | FOUND |
| apps/backend/src/modules/contactos/contactos.repository.ts | FOUND |
| apps/backend/src/modules/contactos/contactos.service.ts | FOUND |
| apps/backend/src/modules/contactos/contactos.controller.ts | FOUND |
| apps/backend/src/modules/contactos/contactos.module.ts | FOUND |
| apps/backend/test/contactos/contactos.e2e-spec.ts | FOUND |
| Commit 18760de (Task 0) | FOUND |
| Commit 0e624f8 (Task 1) | FOUND |
| Commit 56c2ecb (Task 2) | FOUND |
| Commit 0ecab18 (Task 3) | FOUND |
