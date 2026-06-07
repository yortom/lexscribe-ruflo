---
phase: 07-calendario-y-facturaci-n
plan: "04"
subsystem: ui
tags: [react-query, vitest, facturacion, tailwind, intl-numberformat]

# Dependency graph
requires:
  - phase: 07-02-backend-facturacion
    provides: "FacturacionModule REST API: POST /facturas, GET /facturas, GET /facturas/totales/:id, PATCH /facturas/:id, PATCH /facturas/:id/estado, DELETE /facturas/:id"
  - phase: 07-03-fl9-y-calendario-frontend
    provides: "ExpedienteTabs.tsx with FechasTab wiring already in place (no overwrite risk)"
provides:
  - "facturacion API client (lib/api/facturacion.ts) — 6 typed functions"
  - "FacturacionTab component — inline editable billing table, colored status dropdown, totals header"
  - "ExpedienteTabs wired: FacturacionTab replaces Disponible en Phase 7 placeholder"
  - "12 Vitest tests green: 7 component behavior + 5 API client URL/method/body assertions"
affects:
  - phase 8 hardening (E2E Playwright FL-11 facturacion flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React Query double invalidation (facturas + facturas/totales) on every mutation for live totals recalc"
    - "Inline Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}) for euro formatting"
    - "Tailwind colored badge via class map (amber/blue/green) driven by EstadoFactura value"
    - "Draft-row pattern for Nueva entrada — local state row merged into table before API call"

key-files:
  created:
    - apps/frontend/lib/api/facturacion.ts
    - apps/frontend/components/expedientes/FacturacionTab.tsx
    - apps/frontend/components/expedientes/FacturacionTab.test.tsx
  modified:
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx

key-decisions:
  - "Double query invalidation on mutation: both ['facturas', expedienteId] and ['facturas','totales', expedienteId] invalidated so totals header recalculates immediately (FAC-05)"
  - "FechasTab wiring confirmed present before editing facturacion placeholder — no overwrite of 07-03 work"
  - "12 Vitest tests cover component behavior (render, mutations, loading) + W7 API URL/method/body assertions against global.fetch stub"

patterns-established:
  - "Status badge color map: pendiente=amber-100/700, facturado=blue-100/700, cobrado=green-100/700"
  - "Draft-row for create: local array state, controlled inputs, save triggers createFactura then invalidate"

requirements-completed: [FAC-01, FAC-02, FAC-03, FAC-04, FAC-05]

# Metrics
duration: 30min
completed: 2026-06-07
---

# Phase 7 Plan 04: Facturacion Frontend Summary

**FacturacionTab — inline editable billing table with colored status dropdown (pendiente/facturado/cobrado) and live totals header (euros es-ES) via double React Query invalidation; 12 Vitest tests green.**

## Performance

- **Duration:** ~30 min (closeout — tasks 1-2 executed by prior agent; task 3 human-verify approved by user)
- **Started:** 2026-06-07T09:45:00Z
- **Completed:** 2026-06-07T10:00:00Z
- **Tasks:** 3/3 (tasks 1-2 auto; task 3 human-verify approved)
- **Files modified:** 4

## Accomplishments

- Facturacion API client with 6 typed functions covering all FacturacionModule endpoints: listFacturas, getTotalesFactura, createFactura, updateFactura, updateEstadoFactura, deleteFactura
- FacturacionTab component: inline editable rows with per-row Guardar/Eliminar, draft-row pattern for "Nueva entrada" defaulting fecha to today, colored status select per row, totals header showing Total + Pendiente/Facturado/Cobrado subtotals formatted as euros es-ES; both queries invalidated on every mutation for live recalculation (FAC-05)
- ExpedienteTabs.tsx updated: placeholder replaced with FacturacionTab while preserving FechasTab wiring from 07-03 (W5 verified)
- 12 Vitest tests green: 7 component behavior tests (render rows, formatted totals, subtotals, estado change, loading, empty state, delete) + 5 API client URL/method/body assertions (W7)

## Task Commits

Each task was committed atomically:

1. **Task 1: facturacion API client** - `172d0f4` (feat)
2. **Task 2: FacturacionTab + ExpedienteTabs wiring + 12 vitest tests (TDD green)** - `07d38de` (feat)
3. **Task 3: Visual verification of billing tab** - human-verify approved by user (no code commit)

**Plan metadata:** closeout commit added below

## Files Created/Modified

- `apps/frontend/lib/api/facturacion.ts` — 6 typed API functions mirroring apiFetch/ApiError pattern
- `apps/frontend/components/expedientes/FacturacionTab.tsx` — inline editable billing table, status dropdown with color map, totals header, draft-row for create
- `apps/frontend/components/expedientes/FacturacionTab.test.tsx` — 12 Vitest tests (component behavior + API client URL assertions)
- `apps/frontend/components/expedientes/ExpedienteTabs.tsx` — facturacion placeholder replaced; FechasTab wiring preserved

## Deviations from Plan

None — plan executed exactly as written. Task 3 was a human-verify checkpoint; user approved after visual inspection of billing tab.

## Known Stubs

None — all data is wired to live API endpoints (FacturacionModule from 07-02). No hardcoded values, no placeholder text in rendered UI.

## Self-Check: PASSED

- `apps/frontend/lib/api/facturacion.ts` — FOUND
- `apps/frontend/components/expedientes/FacturacionTab.tsx` — FOUND
- `apps/frontend/components/expedientes/FacturacionTab.test.tsx` — FOUND
- Commit `172d0f4` — FOUND (git log)
- Commit `07d38de` — FOUND (git log)
- 12/12 tests green — CONFIRMED
