---
phase: "07-calendario-y-facturaci-n"
plan: "01"
subsystem: "backend-eventos"
tags: ["backend", "eventos", "calendario", "nestjs", "tdd", "soft-delete"]
dependency_graph:
  requires: []
  provides:
    - "EventosModule (NestJS) with full CRUD REST API at /eventos"
    - "EventosRepository with softDeleteByDocumentoId + countByDocumentoId (FL-9)"
    - "shared-types/evento.ts: Evento/EventoListResponse/EventoCountResponse interfaces"
    - "shared-validation/eventos.ts: CreateEventoSchema/UpdateEventoSchema/QueryEventoSchema"
    - "docs/DATOS.md §4.6 updated with mostrarEnCalendario field (D-01) + §9 changelog"
  affects:
    - "apps/backend/src/app.module.ts (EventosModule registered)"
    - "apps/backend/jest.config.ts (eventos coverage threshold added)"
    - "docs/DATOS.md (mostrarEnCalendario D-01 documented)"
tech_stack:
  added: []
  patterns:
    - "TDD London School: failing spec (RED) → implementation (GREEN) for repo + service"
    - "softDeletePlugin pattern (same as documentos): EventoSchema.plugin(softDeletePlugin)"
    - "One-way module dependency: DocumentosModule ← EventosModule (no forwardRef — Pitfall 4)"
    - "countByDocumentoId/softDeleteByDocumentoId on repository for FL-9 pre-check"
    - "@Audited on create/update/delete endpoints; @CurrentUser extracts uid from JWT"
    - "QueryEventoSchema: z.coerce.boolean() for soloCalendario query param"
key_files:
  created:
    - "packages/shared-types/src/evento.ts"
    - "packages/shared-validation/src/eventos.ts"
    - "apps/backend/src/modules/eventos/schemas/evento.schema.ts"
    - "apps/backend/src/modules/eventos/eventos.repository.ts"
    - "apps/backend/src/modules/eventos/eventos.service.ts"
    - "apps/backend/src/modules/eventos/eventos.controller.ts"
    - "apps/backend/src/modules/eventos/eventos.module.ts"
    - "apps/backend/src/modules/eventos/dto/create-evento.dto.ts"
    - "apps/backend/src/modules/eventos/dto/update-evento.dto.ts"
    - "apps/backend/src/modules/eventos/dto/query-evento.dto.ts"
    - "apps/backend/src/modules/eventos/tests/eventos.repository.spec.ts"
    - "apps/backend/src/modules/eventos/tests/eventos.service.spec.ts"
  modified:
    - "docs/DATOS.md"
    - "packages/shared-types/src/index.ts"
    - "packages/shared-validation/src/index.ts"
    - "apps/backend/src/app.module.ts"
    - "apps/backend/jest.config.ts"
decisions:
  - "One-way EventosModule dep: DocumentosModule imports EventosModule; EventosModule does NOT import DocumentosModule — avoids forwardRef circular dep (Pitfall 4)"
  - "countByDocumentoId + softDeleteByDocumentoId on EventosRepository exported for FL-9 in 07-03 (DocumentosModule)"
  - "soloCalendario uses z.coerce.boolean() in QueryEventoSchema — coerces string 'true'/'false' from query params correctly"
  - "GET /eventos/count placed BEFORE GET /eventos/:id to avoid NestJS route shadowing"
  - "EventosModule exports both EventosService and EventosRepository — gives 07-03 flexibility for FL-9 injection"
  - "mostrarEnCalendario default true in Zod schema + Mongoose prop — consistent behavior for both origins (documento/manual)"
metrics:
  duration: "~45min"
  completed: "2026-06-06"
  tasks: 3
  files: 17
---

# Phase 07 Plan 01: Backend Eventos Summary

NestJS EventosModule with full audited CRUD REST API, soft-delete-aware repository, TDD-verified service + repository specs, shared TypeScript contracts, and DATOS.md D-01 registration.

## What Was Built

### Task 1: DATOS.md D-01 + Shared Contracts

- `docs/DATOS.md §4.6`: added `mostrarEnCalendario: Boolean` field (F-066/D-01) + 4th index `{ usuarioId, mostrarEnCalendario, fechaInicio }` for the global calendar filter.
- `docs/DATOS.md §9`: changelog entry dated 2026-06-06 documenting the D-01 addition.
- `packages/shared-types/src/evento.ts`: `Evento`, `EventoListResponse`, `EventoCountResponse` interfaces (exact spec from plan).
- `packages/shared-types/src/index.ts`: re-exports `./evento`.
- `packages/shared-validation/src/eventos.ts`: `CreateEventoSchema`, `UpdateEventoSchema`, `QueryEventoSchema`, `CountEventoQuerySchema` with Zod (matches Research Pattern 5 exactly).
- `packages/shared-validation/src/index.ts`: re-exports `./eventos`.
- Both packages build clean.

### Task 2: Schema + Repository + Tests (TDD)

- `evento.schema.ts`: `@Schema({ collection: 'eventos' })` with `mostrarEnCalendario`, 4 indexes, `softDeletePlugin` applied.
- `eventos.repository.ts`: 7 methods — `create`, `findById`, `list`, `update`, `softDelete`, `softDeleteByDocumentoId`, `countByDocumentoId`.
  - `list()` builds dynamic filter: `soloCalendario` → `mostrarEnCalendario: true`; `fechaDesde/fechaHasta` → `$gte/$lte` range; `expedienteId`/`documentoId` filtered.
  - `softDeleteByDocumentoId()` uses `updateMany` with `activo: true` filter to inactivate all document events (CAL-05/FL-9).
  - `countByDocumentoId()` uses `countDocuments` for FL-9 pre-check endpoint.
- `eventos.repository.spec.ts`: 8 tests — all GREEN.

### Task 3: Service + Controller + Module + DTOs + Wiring (TDD)

- `eventos.service.ts`: 6 methods wrapping repository; throws `NotFoundError('evento', id)` on null returns from `findById`, `update`, `softDelete`.
- `eventos.controller.ts`: `POST /`, `GET /count` (before `:id` to avoid shadowing), `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`. All with `JwtAuthGuard` + `AuditInterceptor`; write endpoints with `@Audited`.
- `dto/*.ts`: `CreateEventoDto`, `UpdateEventoDto`, `QueryEventoDto` via `createZodDto`.
- `eventos.module.ts`: imports `MongooseModule.forFeature`, `AuditoriaModule`, `AuthModule`; exports `EventosService` + `EventosRepository` (for FL-9 in 07-03).
- `app.module.ts`: `EventosModule` added after `DocumentosModule`.
- `jest.config.ts`: `./src/modules/eventos/` threshold — `lines/functions/statements: 80`, `branches: 60` (SEC-06 continuity).
- `eventos.service.spec.ts`: 10 tests — all GREEN.

## Test Results

```
Test Suites: 17 passed, 17 total
Tests:       159 passed, 159 total (all pre-existing + 18 new eventos tests)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- `apps/backend/src/modules/eventos/schemas/evento.schema.ts` — exists
- `apps/backend/src/modules/eventos/eventos.repository.ts` — exists
- `apps/backend/src/modules/eventos/eventos.service.ts` — exists
- `apps/backend/src/modules/eventos/eventos.controller.ts` — exists
- `apps/backend/src/modules/eventos/eventos.module.ts` — exists
- `packages/shared-types/src/evento.ts` — exists
- `packages/shared-validation/src/eventos.ts` — exists

Commits verified:
- `e56512f` feat(07-01): DATOS.md D-01 + shared-types/validation evento contracts
- `0f7cc3b` feat(07-01): eventos schema + repository + repository unit tests (TDD)
- `f2550fc` feat(07-01): eventos service + controller + module + DTOs + AppModule wiring (TDD)

## Success Criteria Verification

- [x] CAL-01/CAL-02: POST /eventos accepts origen documento|manual + persists documentoId/expedienteId/subtipo
- [x] CAL-03: GET /eventos filters by expedienteId, date range, and soloCalendario (mostrarEnCalendario=true)
- [x] CAL-04: PATCH /eventos/:id updates color (and any other UpdateEventoInput field)
- [x] CAL-05 (backend): softDeleteByDocumentoId + GET /eventos/count exist and are exported for FL-9 (07-03)
- [x] D-01 registered in DATOS.md §4.6 + §9 changelog dated 2026-06-06
