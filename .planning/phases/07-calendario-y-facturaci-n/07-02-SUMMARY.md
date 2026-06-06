---
phase: 07-calendario-y-facturaci-n
plan: 02
subsystem: api
tags: [nestjs, mongodb, mongoose, zod, facturacion, billing, aggregate, soft-delete, tdd]

# Dependency graph
requires:
  - phase: 07-01
    provides: EventosModule, eventos shared types/validation, AppModule EventosModule entry
provides:
  - FacturacionModule (REST API: POST/GET/PATCH/DELETE /facturas + GET /facturas/totales/:id)
  - shared-types factura.ts (EstadoFactura, Factura, FacturaListResponse, FacturaTotales)
  - shared-validation facturacion.ts (CreateFacturaSchema, UpdateFacturaSchema, UpdateEstadoSchema, QueryFacturaSchema)
  - FacturacionRepository with getTotales aggregate (activo:true in $match, Pitfall 6 rounding)
  - FacturacionService with create (fecha default today), updateEstado, getTotales
  - jest.config.ts coverage threshold for ./src/modules/facturacion/ (SEC-06)
affects:
  - 07-04-facturacion-frontend (consumes shared-types/validation contracts built here)
  - any future module needing billing data from facturas collection

# Tech tracking
tech-stack:
  added: []
  patterns:
    - MongoDB $group/$sum aggregate with explicit activo:true in $match (softDeletePlugin does not intercept .aggregate())
    - Math.round(x * 100) / 100 per-value rounding to prevent IEEE 754 drift in billing totals
    - PATCH :id/estado dedicated endpoint pattern (state machine, not general PATCH)
    - totales/:expedienteId route declared before :id to avoid NestJS route shadowing

key-files:
  created:
    - packages/shared-types/src/factura.ts
    - packages/shared-validation/src/facturacion.ts
    - apps/backend/src/modules/facturacion/schemas/factura.schema.ts
    - apps/backend/src/modules/facturacion/facturacion.repository.ts
    - apps/backend/src/modules/facturacion/facturacion.service.ts
    - apps/backend/src/modules/facturacion/facturacion.controller.ts
    - apps/backend/src/modules/facturacion/facturacion.module.ts
    - apps/backend/src/modules/facturacion/dto/create-factura.dto.ts
    - apps/backend/src/modules/facturacion/dto/update-factura.dto.ts
    - apps/backend/src/modules/facturacion/dto/update-estado.dto.ts
    - apps/backend/src/modules/facturacion/dto/query-factura.dto.ts
    - apps/backend/src/modules/facturacion/tests/facturacion.repository.spec.ts
    - apps/backend/src/modules/facturacion/tests/facturacion.service.spec.ts
  modified:
    - packages/shared-types/src/index.ts (added export * from './factura')
    - packages/shared-validation/src/index.ts (added export * from './facturacion')
    - apps/backend/src/app.module.ts (added FacturacionModule import + registration)
    - apps/backend/jest.config.ts (added facturacion coverage threshold at 80%)

key-decisions:
  - "getTotales aggregate explicitly adds activo:true to $match — softDeletePlugin does NOT hook .aggregate()"
  - "Per-value Math.round(x*100)/100 rounding applied to each subtotal AND total to prevent IEEE 754 drift"
  - "PATCH /facturas/:id/estado is a dedicated endpoint — UpdateEstadoSchema only allows estado field"
  - "GET totales/:expedienteId route declared before :id in controller to avoid NestJS route shadowing"
  - "fecha defaults to new Date() in service when dto.fecha is omitted — FAC-02 requirement"
  - "FacturacionModule serialized after EventosModule (wave 2) to avoid concurrent writes to app.module.ts and shared index files"

patterns-established:
  - "Billing aggregate pattern: $match activo:true + $group $sum + per-value rounding"
  - "Dedicated estado endpoint: PATCH :id/estado with UpdateEstadoSchema (single field, no sprawl)"

requirements-completed: [FAC-01, FAC-02, FAC-03, FAC-04, FAC-05]

# Metrics
duration: ~9min
completed: 2026-06-06
---

# Phase 07 Plan 02: Backend Facturacion Summary

**FacturacionModule with getTotales billing aggregate (activo:true $match + IEEE 754 rounding) — 24 unit tests green, backend TypeScript build clean.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-06T17:49:56Z
- **Completed:** 2026-06-06T17:58:56Z
- **Tasks:** 3 of 3
- **Files modified:** 17

## Accomplishments

- Built FacturacionModule (schema + repository + service + controller + DTOs) mirroring EventosModule pattern, covering FAC-01 through FAC-05
- Implemented getTotales MongoDB aggregate with mandatory `activo: true` in `$match` stage (Pitfall 1 — softDeletePlugin does not intercept .aggregate()) and per-value Math.round rounding to prevent IEEE 754 floating-point drift (Pitfall 6)
- Published shared contracts (`factura.ts` types, `facturacion.ts` Zod schemas) consumed by the 07-04 frontend plan

## Task Commits

1. **Task 1: Shared contracts (Wave 0)** - `29abc6f` (feat)
2. **Task 2: Factura schema + repository + repository tests (TDD)** - `8ae27ce` (feat)
3. **Task 3: Service + controller + module + DTOs + AppModule wiring + service tests (TDD)** - `a38f8f4` (feat)

## Files Created/Modified

- `packages/shared-types/src/factura.ts` — EstadoFactura, Factura, FacturaListResponse, FacturaTotales interfaces
- `packages/shared-types/src/index.ts` — added `export * from './factura'`
- `packages/shared-validation/src/facturacion.ts` — CreateFacturaSchema/UpdateFacturaSchema/UpdateEstadoSchema/QueryFacturaSchema
- `packages/shared-validation/src/index.ts` — added `export * from './facturacion'`
- `apps/backend/src/modules/facturacion/schemas/factura.schema.ts` — FacturaSchema + softDeletePlugin + 2 indices
- `apps/backend/src/modules/facturacion/facturacion.repository.ts` — full CRUD + getTotales aggregate
- `apps/backend/src/modules/facturacion/facturacion.service.ts` — service with fecha default + NotFoundError guards
- `apps/backend/src/modules/facturacion/facturacion.controller.ts` — 6 REST endpoints with auth + audit
- `apps/backend/src/modules/facturacion/facturacion.module.ts` — module wiring
- `apps/backend/src/modules/facturacion/dto/*.ts` — 4 DTOs (Create/Update/UpdateEstado/Query)
- `apps/backend/src/modules/facturacion/tests/facturacion.repository.spec.ts` — 9 repository tests
- `apps/backend/src/modules/facturacion/tests/facturacion.service.spec.ts` — 15 service tests
- `apps/backend/src/app.module.ts` — FacturacionModule registered after EventosModule
- `apps/backend/jest.config.ts` — facturacion coverage threshold added (lines/functions >= 80%)

## Deviations from Plan

None — plan executed exactly as written. The worktree required a `git merge phase-07` at execution start to inherit the 07-01 work (EventosModule, shared types/validation evento exports, app.module.ts EventosModule entry) before building on top. This was expected per the objective's note about starting fresh.

## Self-Check: PASSED

Files exist:
- `packages/shared-types/src/factura.ts` — FOUND
- `packages/shared-validation/src/facturacion.ts` — FOUND
- `apps/backend/src/modules/facturacion/facturacion.repository.ts` — FOUND
- `apps/backend/src/modules/facturacion/facturacion.service.ts` — FOUND
- `apps/backend/src/modules/facturacion/facturacion.controller.ts` — FOUND
- `apps/backend/src/modules/facturacion/facturacion.module.ts` — FOUND

Commits verified:
- `29abc6f` — feat(07-02): shared-types factura.ts + shared-validation facturacion.ts (Wave 0)
- `8ae27ce` — feat(07-02): factura schema + repository + tests (TDD)
- `a38f8f4` — feat(07-02): service + controller + module + DTOs + AppModule wiring (TDD)

Tests: 24/24 passing (9 repository + 15 service)
Backend TypeScript build: clean
