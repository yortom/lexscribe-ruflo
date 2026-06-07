---
phase: 07-calendario-y-facturaci-n
plan: 03
subsystem: full-stack
tags: [nestjs, nextjs, react-calendar, mongodb, mongoose, eventos, calendario, fl-8, fl-9, tdd, vitest]

# Dependency graph
requires:
  - phase: 07-01
    provides: EventosModule, EventosRepository (softDeleteByDocumentoId, countByDocumentoId), shared evento contracts
  - phase: 06-02
    provides: DocumentosModule, DocumentosService.remove(), DocumentosModule (modified here)
provides:
  - documentos.service.remove(uid, id, eventosAction) with conditional event soft-delete (FL-9/CAL-05)
  - DocumentosModule imports EventosModule one-way (no forwardRef)
  - eventos API client lib/api/eventos.ts createEvento/listEventos/updateEvento/deleteEvento/countEventosByDocumento
  - CalendarioView react-calendar wrapper with event dots locale es-ES
  - EventosList day panel with titulo/fecha/subtipo/color per row
  - EventoModal manual event creation with color preset palette origen manual CAL-02
  - /calendario page soloCalendario=true expediente+range filters (+) button
  - FechasTab all events per expediente visibility toggle via updateEvento
  - AnadirFechaModal FL-8/CAL-01 origen documento event from document row
  - BorrarDocumentoModal FL-9/CAL-05 conservar/eliminar decision modal
  - DocumentosList updated with pre-delete event count check + both modals
  - Calendario nav link in app layout
affects:
  - 07-04-facturacion-frontend (same layout/nav baseline)
  - 08-hardening E2E (FL-8/FL-9 flows now testable end-to-end)

# Tech tracking
tech-stack:
  added:
    - react-calendar@6.0.1 (frontend, tileContent dot pattern, locale prop)
  patterns:
    - use-client + import react-calendar/dist/Calendar.css to avoid SSR CSS issues (Pitfall 2)
    - pre-delete countEventosByDocumento check before showing BorrarDocumentoModal (Pitfall 3)
    - EventosModule imported one-way into DocumentosModule - no forwardRef (Pitfall 4)
    - remove() fail-safe ordering softDelete document first then softDeleteByDocumentoId (Pattern 2 DATOS section 6 compensation)
    - deleteDocumento(id eventosAction) query param pattern for FL-9 (Pattern 6)
    - FechasTab flat list sorted by fechaInicio asc no nesting (Research Open Q3)
    - 8-color preset palette buttons in EventoModal (Research Open Q2)

key-files:
  created:
    - apps/frontend/lib/api/eventos.ts
    - apps/frontend/components/calendario/CalendarioView.tsx
    - apps/frontend/components/calendario/CalendarioView.test.tsx
    - apps/frontend/components/calendario/EventosList.tsx
    - apps/frontend/components/calendario/EventoModal.tsx
    - apps/frontend/components/calendario/EventoModal.test.tsx
    - apps/frontend/app/(app)/calendario/page.tsx
    - apps/frontend/components/expedientes/FechasTab.tsx
    - apps/frontend/components/documentos/AnadirFechaModal.tsx
    - apps/frontend/components/documentos/AnadirFechaModal.test.tsx
    - apps/frontend/components/documentos/BorrarDocumentoModal.tsx
    - apps/frontend/components/documentos/BorrarDocumentoModal.test.tsx
  modified:
    - apps/backend/src/modules/documentos/documentos.service.ts (remove() + eventosAction + EventosRepository injection)
    - apps/backend/src/modules/documentos/documentos.controller.ts (@Query eventosAction param)
    - apps/backend/src/modules/documentos/documentos.module.ts (EventosModule import one-way)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (3 new CAL-05 cases)
    - apps/frontend/package.json (react-calendar@6.0.1 added)
    - apps/frontend/lib/api/documentos.ts (deleteDocumento accepts eventosAction param)
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx (FechasTab replaces placeholder)
    - apps/frontend/components/documentos/DocumentosList.tsx (AnadirFechaModal + BorrarDocumentoModal wiring)
    - apps/frontend/app/(app)/layout.tsx (Calendario nav link added)

key-decisions:
  - EventosModule imported one-way into DocumentosModule - no forwardRef
  - remove() fail-safe ordering softDelete document first (primary) then softDeleteByDocumentoId (secondary); if secondary throws document is inactive and events remain active - accepted safe state per DATOS section 6
  - countEventosByDocumento called on Eliminar click before showing modal - avoids unnecessary modal when total=0
  - FechasTab flat list sorted by fechaInicio asc (no nesting) - resolves RESEARCH Open Q3
  - Color preset palette 8 hex values from RESEARCH Open Q2 stored as evento.color field
  - BorrarDocumentoModal shows count two action buttons (Conservar/Eliminar) plus Cancelar
  - AnadirFechaModal title fallback titulo equals descripcion or subtipo when descripcion is empty

patterns-established:
  - Pre-delete count check countEventosByDocumento then if total > 0 show modal then drive eventosAction param
  - Conditional secondary soft-delete primary op always first secondary guarded by action enum
  - react-calendar tileContent dot eventDates Set from ISO date prefix view=month guard

requirements-completed: [CAL-01, CAL-02, CAL-03, CAL-04, CAL-05]

# Metrics
duration: ~3h (including human-verify checkpoint)
completed: 2026-06-06
---

# Phase 07 Plan 03: FL-9 y Calendario Frontend Summary

**react-calendar /calendario page + Fechas tab + FL-8 Anadir fecha modal + FL-9 delete-with-events modal + backend remove(eventosAction) -- 16 backend + 10 frontend tests green, visual verification approved.**

## Performance

- **Duration:** ~3h (including human checkpoint pause)
- **Completed:** 2026-06-06
- **Tasks:** 4 of 4 (Tasks 1-3 auto; Task 4 human-verify -- APPROVED)
- **Files modified:** 21

## Accomplishments

- Modified documentos.service.remove() (FL-9/CAL-05) to accept eventosAction conservar/eliminar and conditionally call eventosRepo.softDeleteByDocumentoId() using fail-safe ordering per DATOS section 6 compensation pattern; controller reads the param from query string; DocumentosModule imports EventosModule one-way (no forwardRef)
- Built complete eventos API client lib/api/eventos.ts with createEvento listEventos updateEvento deleteEvento countEventosByDocumento -- mirrors the documentos.ts apiFetch pattern
- Installed react-calendar@6.0.1 and built CalendarioView (use client, tileContent dots on event days, locale es-ES, CSS import to avoid SSR mismatch)
- Created global /calendario page filtering by soloCalendario=true with expediente+date-range filters and a (+) EventoModal for manual events (CAL-02) with 8-color preset palette
- Built FechasTab showing all expediente events with a visibility toggle calling updateEvento mostrarEnCalendario (CAL-03)
- Implemented FL-8 AnadirFechaModal (origen documento) triggered from each document row and FL-9 BorrarDocumentoModal (conservar/eliminar) triggered after a pre-delete event count check in DocumentosList
- Added Calendario nav link to app layout
- Human visual verification -- APPROVED by user

## Task Commits

1. Task 1: FL-9 backend - modify documentos.service.remove + controller + module + tests - d1e8ddf (feat)
2. Task 2: react-calendar + eventos API client + calendario components + /calendario page + Fechas tab + nav - ca15c82 (feat)
3. Task 3: FL-8 AnadirFechaModal + FL-9 BorrarDocumentoModal + DocumentosList update - ae514da (feat)
4. Task 4: Human-verify checkpoint -- APPROVED by user (2026-06-06)

## Files Created/Modified

Backend:
- apps/backend/src/modules/documentos/documentos.service.ts -- remove() + eventosAction + EventosRepository injection
- apps/backend/src/modules/documentos/documentos.controller.ts -- @Query eventosAction param
- apps/backend/src/modules/documentos/documentos.module.ts -- EventosModule one-way import
- apps/backend/src/modules/documentos/tests/documentos.service.spec.ts -- 3 new CAL-05 tests (eliminar/conservar/not-found)

Frontend - new files:
- apps/frontend/lib/api/eventos.ts -- eventos API client (5 functions)
- apps/frontend/components/calendario/CalendarioView.tsx -- react-calendar wrapper with tileContent dots
- apps/frontend/components/calendario/CalendarioView.test.tsx -- 2 vitest tests
- apps/frontend/components/calendario/EventosList.tsx -- day events list panel
- apps/frontend/components/calendario/EventoModal.tsx -- manual event creation modal (CAL-02)
- apps/frontend/components/calendario/EventoModal.test.tsx -- 2 vitest tests
- apps/frontend/app/(app)/calendario/page.tsx -- global calendar page with soloCalendario filter
- apps/frontend/components/expedientes/FechasTab.tsx -- all events per expediente + visibility toggle
- apps/frontend/components/documentos/AnadirFechaModal.tsx -- FL-8 document-origin event modal
- apps/frontend/components/documentos/AnadirFechaModal.test.tsx -- 2 vitest tests
- apps/frontend/components/documentos/BorrarDocumentoModal.tsx -- FL-9 conservar/eliminar modal
- apps/frontend/components/documentos/BorrarDocumentoModal.test.tsx -- 4 vitest tests

Frontend - modified files:
- apps/frontend/package.json -- react-calendar@6.0.1 added
- apps/frontend/lib/api/documentos.ts -- deleteDocumento accepts eventosAction param
- apps/frontend/components/expedientes/ExpedienteTabs.tsx -- FechasTab replaces placeholder text
- apps/frontend/components/documentos/DocumentosList.tsx -- AnadirFechaModal + BorrarDocumentoModal wiring + pre-delete count check
- apps/frontend/app/(app)/layout.tsx -- Calendario nav link added

## Deviations from Plan

None -- plan executed exactly as written. Tasks 1-3 completed by prior executor agent; Task 4 (human-verify) checkpoint approved by user; this agent performed closeout only.

## Known Stubs

None -- all data flows are wired: eventos API client fetches from real backend, CalendarioView receives eventos prop from useQuery, FechasTab fetches its own data, DocumentosList pre-checks event count before delete.

## Self-Check: PASSED

Commits verified:
- d1e8ddf -- feat(07-03): FL-9 backend -- FOUND
- ca15c82 -- feat(07-03): react-calendar + eventos API client -- FOUND
- ae514da -- feat(07-03): FL-8 AnadirFechaModal + FL-9 BorrarDocumentoModal -- FOUND

Key files verified (all present):
- apps/backend/src/modules/documentos/documentos.service.ts -- FOUND (eventosAction present)
- apps/frontend/lib/api/eventos.ts -- FOUND
- apps/frontend/components/calendario/CalendarioView.tsx -- FOUND
- apps/frontend/components/documentos/BorrarDocumentoModal.tsx -- FOUND
- apps/frontend/app/(app)/calendario/page.tsx -- FOUND
- apps/frontend/components/expedientes/FechasTab.tsx -- FOUND

Tests: 16/16 backend (documentos.service.spec) + 10/10 frontend (CalendarioView, EventoModal, AnadirFechaModal, BorrarDocumentoModal) -- all passing
