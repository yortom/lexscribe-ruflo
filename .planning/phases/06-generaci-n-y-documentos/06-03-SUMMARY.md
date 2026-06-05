---
phase: 06-generaci-n-y-documentos
plan: 03
subsystem: ui
tags: [react, nextjs, docxtemplater, tanstack-query, typescript, vitest]

# Dependency graph
requires:
  - phase: 06-02-backend-modulo-documentos
    provides: "DocumentosController (generar/upload/download/list/delete), EXPE-07 endpoint, GenerationService pipeline"
  - phase: 06-01-backend-pipeline-generacion
    provides: "GenerationService, Documento schema, docxtemplater pipeline, datosCongelados snapshot"
  - phase: 05-03-frontend-editor
    provides: "apiFetch/ApiError pattern, ExpedienteTabs.tsx, AsociarContactoModal pattern, groupByTipoObjeto shared"
provides:
  - "documentos HTTP client (generarDocumento, uploadDocumento, downloadDocumento, listDocumentos, deleteDocumento)"
  - "preRellenarFormulario pure function: pre-fills values from expediente.parametros + contacto fields by rol"
  - "GeneracionForm: grouped by tipoObjeto, completeness counter (faltan N), rol-assignment flow"
  - "GeneracionFormSection: per-section inputs with badge 'nuevo' + tipo selector for unknown fields"
  - "RolFaltanteModal: search existing or create basic contacto, then assign to rol"
  - "Page /expedientes/[id]/documentos/nuevo (D-05): load expediente+plantillas, resolve contactoFieldsByRol, render form"
  - "DocumentosList: real documents with download (presigned URL), upload, delete, link to generator"
  - "ExpedienteTabs pestaña Documentos wired to DocumentosList (EXPE-07 frontend)"
affects: [07-calendario-facturacion, 08-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiFetch wrapper reused from plantillas.ts — FormData omits Content-Type header for multipart"
    - "preRellenarFormulario is a pure function — testable without React or DOM"
    - "groupByTipoObjeto from @lexscribe/shared-validation drives GeneracionForm sections"
    - "RolFaltanteModal follows AsociarContactoModal pattern (search + create tabs)"
    - "DocumentosList uses useQuery(['documentos', expedienteId]) + invalidate on mutations"

key-files:
  created:
    - apps/frontend/lib/api/documentos.ts
    - apps/frontend/lib/generacion/preRelleno.ts
    - apps/frontend/components/documentos/GeneracionForm.tsx
    - apps/frontend/components/documentos/GeneracionFormSection.tsx
    - apps/frontend/components/documentos/RolFaltanteModal.tsx
    - apps/frontend/components/documentos/DocumentosList.tsx
    - apps/frontend/app/(app)/expedientes/[id]/documentos/nuevo/page.tsx
    - apps/frontend/__tests__/documentos/preRelleno.test.ts
    - apps/frontend/__tests__/documentos/GeneracionForm.test.tsx
  modified:
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx

key-decisions:
  - "preRellenarFormulario accepts contactoFieldsByRol map resolved by caller (page) — keeps the pure function free of async fetches"
  - "Page /documentos/nuevo resolves all contacto field data before rendering GeneracionForm — single loading state"
  - "DocumentosList uses expedienteId prop + useQuery — decoupled from parent, re-fetches on invalidation"
  - "Badge 'nuevo' + tipo selector rendered inline per variable in GeneracionFormSection — no separate state needed"

patterns-established:
  - "HTTP client: one file per domain (documentos.ts) using shared apiFetch/ApiError, FormData omits Content-Type"
  - "Pure pre-fill logic: preRellenarFormulario returns { valores, rolesRequeridos, rolesPresentes } with no side effects"
  - "Completeness counter: count empty values + unassigned roles → disable Generar button with label 'Generar (faltan N)'"

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-05, DOC-06]

# Metrics
duration: ~90min
completed: 2026-06-03
---

# Phase 6 Plan 03: Frontend Formulario Generacion Summary

**Typed HTTP client + pre-fill logic + GeneracionForm grouped by tipoObjeto with completeness gate, RolFaltanteModal, DocumentosList with download/upload, and EXPE-07 pestaña Documentos — UAT approved after af13eab backend fix for docxtemplater {{ }} delimiters**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-03T12:00:00Z
- **Completed:** 2026-06-03T13:45:00Z
- **Tasks:** 4 (3 auto + 1 UAT checkpoint — approved)
- **Files modified:** 10

## Accomplishments

- Full document generation UI: HTTP client, pre-fill from expediente+contactos, grouped form with completeness counter, rol assignment modal, page /expedientes/[id]/documentos/nuevo
- Pestaña Documentos in ExpedienteTabs now shows real document list with download (presigned URL), upload (with extension validation), delete, and link to generator (EXPE-07 closed frontend-side)
- End-to-end generation verified in UAT: plantilla with expediente + contacto + new field rendered correctly in .docx after af13eab backend fix (docxtemplater {{ }} delimiters + dotted-path parser, DOC-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Cliente HTTP documentos + lógica de pre-relleno** - `8079ac3` (feat)
2. **Task 2: GeneracionForm + secciones + RolFaltanteModal + página nuevo** - `e8e3533` (feat)
3. **Task 3: DocumentosList + integración en ExpedienteTabs** - `c8f32a2` (feat)
4. **Task 4: UAT** - approved (checkpoint; no code commit — manual verification)

**Checkpoint STATE/ROADMAP:** `e3eacd1` (chore: update at checkpoint Task 4)

## Files Created/Modified

- `apps/frontend/lib/api/documentos.ts` — HTTP client: generarDocumento, uploadDocumento, downloadDocumento, listDocumentos, deleteDocumento
- `apps/frontend/lib/generacion/preRelleno.ts` — Pure pre-fill function: expediente.campo, contacto.rol.campo, rolesRequeridos/Presentes
- `apps/frontend/components/documentos/GeneracionForm.tsx` — Main form: groupByTipoObjeto sections, completeness counter, RolFaltanteModal trigger, submit to generarDocumento
- `apps/frontend/components/documentos/GeneracionFormSection.tsx` — Per-section inputs with badge 'nuevo' + tipo selector for schema-unknown fields (D-08)
- `apps/frontend/components/documentos/RolFaltanteModal.tsx` — Modal: search existing contacto or create basic (nombre + NIF/CIF), then assign rol
- `apps/frontend/components/documentos/DocumentosList.tsx` — Document list: download via presigned URL, upload with .docx/.pdf/.txt accept, delete, link to /documentos/nuevo
- `apps/frontend/app/(app)/expedientes/[id]/documentos/nuevo/page.tsx` — Page D-05: loads expediente + plantillas, resolves contactoFieldsByRol, renders GeneracionForm
- `apps/frontend/components/expedientes/ExpedienteTabs.tsx` — Added/wired Documentos tab rendering DocumentosList (EXPE-07)
- `apps/frontend/__tests__/documentos/preRelleno.test.ts` — Vitest unit tests for preRellenarFormulario
- `apps/frontend/__tests__/documentos/GeneracionForm.test.tsx` — Vitest + RTL tests: sections render, counter, button enable

## Decisions Made

- `preRellenarFormulario` accepts a pre-resolved `contactoFieldsByRol` map — the page fetches contacto data, the pure function only merges it; keeps tests simple and the function free of async side-effects
- Page `/documentos/nuevo` resolves all contacto field data before mounting GeneracionForm, providing a single loading boundary
- Badge 'nuevo' + tipo selector are rendered inline per variable in `GeneracionFormSection` rather than in a separate dialog — lower friction for the common case of one or two new fields

## Deviations from Plan

None — plan executed exactly as written.

**Note on backend fix (out of scope):** During UAT the orchestrator identified and fixed a docxtemplater delimiter configuration issue in commit `af13eab` (plan 06-01, `DOC-04`). That fix is not part of this plan's scope but was required for end-to-end generation to work. UAT was approved after that fix was applied.

## Issues Encountered

- Backend generation failed during UAT due to docxtemplater using `{tag}` delimiters instead of `{{tag}}` and a missing dotted-path resolver. Fixed in commit `af13eab` (plan 06-01 scope, not this plan). After that fix, all 10 UAT steps passed.

## User Setup Required

None — no external service configuration required beyond existing backend stack (Mongo + MinIO already set up in prior phases).

## Next Phase Readiness

- Full document generation pipeline is now end-to-end: plantilla editor → generación formulario → .docx descarga
- Phase 6 is complete (06-01 through 06-04 all done)
- Phase 7 (Calendario y Facturación) can start; it builds on the expedientes + documentos foundation established here

---
*Phase: 06-generaci-n-y-documentos*
*Completed: 2026-06-03*
