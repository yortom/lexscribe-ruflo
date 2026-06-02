---
phase: 04-clausulas-y-expedientes
plan: 01
subsystem: api
tags: [nestjs, mongoose, zod, full-text-search, soft-delete, audit, clausulas]

# Dependency graph
requires:
  - phase: 02-auth-y-bases-transversales
    provides: JwtAuthGuard, AuditInterceptor/@Audited, softDeletePlugin, DomainExceptionFilter, ZodValidationPipe, MongoIdPipe, @CurrentUser
  - phase: 03-contactos
    provides: módulo de referencia (schema+repo+service+controller+DTOs pattern)
provides:
  - Módulo NestJS `clausulas` con CRUD REST autenticado, auditado y soft-delete
  - Búsqueda full-text ($text index nombre/texto) + filtro por label (case-insensitive)
  - Zod schemas + tipos compartidos para Cláusula en packages compartidos
affects: [04-02-backend-expedientes, 04-03-frontend, 05-plantillas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mongoose $text index (weights nombre:5, texto:1) para búsqueda full-text"
    - "Labels normalizados a lowercase trimmed en Zod (.transform) — filtro case-insensitive"
    - "sort tipado Record<string,{$meta:string}|-1|1> para combinar textScore y fechaCreacion"

key-files:
  created:
    - packages/shared-validation/src/clausulas.ts
    - packages/shared-types/src/clausula.ts
    - apps/backend/src/modules/clausulas/schemas/clausula.schema.ts
    - apps/backend/src/modules/clausulas/clausulas.repository.ts
    - apps/backend/src/modules/clausulas/clausulas.service.ts
    - apps/backend/src/modules/clausulas/clausulas.controller.ts
    - apps/backend/src/modules/clausulas/clausulas.module.ts
    - apps/backend/src/modules/clausulas/dto/create-clausula.dto.ts
    - apps/backend/src/modules/clausulas/dto/update-clausula.dto.ts
    - apps/backend/src/modules/clausulas/dto/query-clausula.dto.ts
    - apps/backend/test/clausulas/clausulas.e2e-spec.ts
  modified:
    - packages/shared-validation/src/index.ts
    - packages/shared-types/src/index.ts
    - apps/backend/src/app.module.ts

key-decisions:
  - "Labels normalizados a lowercase trimmed en el Zod LabelSchema (RESEARCH Q2) — búsqueda/filtro case-insensitive sin lógica extra en service"
  - "Búsqueda usa $text top-level (Pitfall 1); proyección+sort por textScore cuando search está presente, fechaCreacion:-1 en su defecto"
  - "Service sin EsquemasService — cláusulas no tienen parámetros dinámicos (a diferencia de contactos)"
  - "createIndexes() explícito en beforeAll del e2e — garantiza que el $text index existe antes de las queries de búsqueda en MongoMemoryServer"
  - "dist/ de packages NO se versiona (gitignored) — se recompila; e2e resuelve @lexscribe/* a packages/*/src vía moduleNameMapper"

patterns-established:
  - "Módulo clausulas clona el patrón Phase 3 contactos verbatim, omitiendo PII/crypto y parámetros dinámicos"
  - "sort union de textScore + campo simple requiere tipo explícito en TS (no inferencia con as const)"

requirements-completed: [CLAU-01, CLAU-02, CLAU-03]

# Metrics
duration: 8min
completed: 2026-05-28
---

# Phase 4 Plan 01: Backend Cláusulas Summary

**Módulo NestJS `clausulas` operativo: CRUD REST autenticado con búsqueda full-text ($text index), filtro por label case-insensitive, soft-delete y auditoría asíncrona — 24 tests e2e verdes.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-28T19:30:12Z
- **Completed:** 2026-05-28T19:38:18Z
- **Tasks:** 3 completed
- **Files created/modified:** 14

## Accomplishments

- Zod schemas (`CreateClausulaSchema`/`UpdateClausulaSchema`/`QueryClausulaSchema`, strict) + tipos `Clausula`/`ClausulaListResponse` en packages compartidos, builds verdes.
- `ClausulasModule` completo: schema con `softDeletePlugin` + índice compuesto `{usuarioId,activo,labels}` + índice `$text` `{nombre,texto}` (weights 5/1); repository con búsqueda full-text + filtro label + paginación; service con `NotFoundError`; controller con `JwtAuthGuard` + `AuditInterceptor` + `@Audited('clausula',...)`; registrado en `AppModule`.
- Suite e2e de 24 tests (≥15 requerido) cubriendo CLAU-01 (CRUD), CLAU-02 (labels múltiples normalizados), CLAU-03 (search + filtro label), soft-delete (activo:false + exclusión de listado), auth (401), validación strict (400 con extras/usuarioId), 404, y audit trail.

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas + tipos compartidos** - `7913b5d` (feat)
2. **Task 2: ClausulasModule completo** - `d44cab2` (feat)
3. **Task 3: e2e tests CLAU-01..03** - `d1cb315` (test)

**Planning baseline import:** commit previo a Task 1 (cherry-pick de docs phase-04).

_Nota: el plan no usó TDD-RED separado porque los Zod schemas y el módulo son artefactos declarativos verificados por build + e2e; los tests e2e (Task 3) cubren el ciclo de verificación de comportamiento._

## Files Created/Modified

- `packages/shared-validation/src/clausulas.ts` - Zod DTOs cláusula; `LabelSchema` normaliza lowercase trimmed.
- `packages/shared-types/src/clausula.ts` - interfaces `Clausula`, `ClausulaListResponse`.
- `apps/backend/src/modules/clausulas/schemas/clausula.schema.ts` - schema + softDeletePlugin + índice compuesto + índice `$text`.
- `apps/backend/src/modules/clausulas/clausulas.repository.ts` - `findAll` ($text/label/paginación), `findById`, `create`, `update`, `softDelete` (`returnDocument:'after'`).
- `apps/backend/src/modules/clausulas/clausulas.service.ts` - `list/getById/create/update/remove` con `NotFoundError`.
- `apps/backend/src/modules/clausulas/clausulas.controller.ts` - endpoints REST con guards/audit/`@CurrentUser`.
- `apps/backend/src/modules/clausulas/clausulas.module.ts` - wiring `MongooseModule.forFeature` + `AuditoriaModule` + `AuthModule`.
- `apps/backend/src/modules/clausulas/dto/*.dto.ts` - `createZodDto` para create/update/query.
- `apps/backend/src/app.module.ts` - registro de `ClausulasModule`.
- `apps/backend/test/clausulas/clausulas.e2e-spec.ts` - 24 tests e2e.
- `packages/shared-validation/src/index.ts`, `packages/shared-types/src/index.ts` - re-exports.

## Verification

- `pnpm --filter @lexscribe/shared-validation build` y `…/shared-types build` → verdes.
- `pnpm --filter @lexscribe/backend lint` → 0 errores.
- `pnpm --filter @lexscribe/backend build` → 0 errores TS.
- `jest --config jest.e2e.config.ts --testPathPattern=clausulas` → 24/24 tests verdes.
- Full e2e suite → 75/76 tests verdes (12/13 suites). El único fallo (`auth/login.e2e-spec.ts`) es **pre-existente y fuera de scope** (cookie Path del refresh token en el módulo auth, sin relación con cláusulas).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Falta de node_modules en el worktree**
- **Found during:** Task 1 (build de packages).
- **Issue:** El worktree no tenía dependencias instaladas; `tsc` no resolvía. El primer `pnpm install` crasheó en un postinstall (opencollective/argon2 native build, `readStream must be readable` en corepack).
- **Fix:** `pnpm install --ignore-scripts` — completó el linkado de bins sin ejecutar los lifecycle scripts problemáticos. Builds y tests posteriores verdes.
- **Files modified:** ninguno (entorno).

**2. [Rule 1 - Bug] Error de tipos TS en `sort` del repository**
- **Found during:** Task 2 (backend build).
- **Issue:** El union de `{score:{$meta}}` y `{fechaCreacion:-1} as const` producía un tipo con clave opcional incompatible con la firma de `.sort()` de Mongoose (TS2345).
- **Fix:** Tipar `sort` explícitamente como `Record<string, { $meta: string } | -1 | 1>`.
- **Files modified:** `clausulas.repository.ts`.
- **Commit:** `d44cab2`.

### Planning baseline note

Los ficheros de planificación de Phase 04 (PLAN/RESEARCH/ROADMAP) no estaban presentes en este worktree (basado en el merge de Phase 3). Se importaron mediante cherry-pick de los 5 commits docs de phase-04 (solo tocan `.planning/`) antes de ejecutar, para disponer del plan y de la línea base de ROADMAP/STATE.

## Deferred Issues

- `auth/login.e2e-spec.ts` cookie Path mismatch — pre-existente, registrado en `.planning/phases/04-clausulas-y-expedientes/deferred-items.md`. Fuera del scope de 04-01.

## Known Stubs

Ninguno introducido por este plan. (El stub `expedientesVinculados: []` en `ContactosService.getById` pertenece a Phase 3 y se cierra en el plan 04-02, no aquí.)

## Self-Check: PASSED

Todos los ficheros declarados existen en disco; los 3 commits de tarea (`7913b5d`, `d44cab2`, `d1cb315`) verificados en el historial git.
