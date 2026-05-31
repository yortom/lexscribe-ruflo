---
phase: 05-plantillas-y-editor
plan: "03"
subsystem: frontend-editor
tags: [nextjs, codemirror6, react-query, highlight, variable-detection, clausula-insert, declare-variable, modal, versioning, tdd]
dependency_graph:
  requires:
    - 05-01 (parseVariables, groupByTipoObjeto, insertClausulaAndRenumber, detectClausulaHeaders, VariableDetectada)
    - 05-02 (backend endpoints: GET/POST/PATCH/DELETE /plantillas, POST /plantillas/upload, POST /plantillas/:id/declarar-variable)
    - 04-01 (clausulas library: GET /clausulas?label=, listClausulas)
  provides:
    - /plantillas list page (search + delete)
    - /plantillas/nuevo (paste/type + .txt/.docx upload, PLAN-01)
    - /plantillas/:id editor (CM6 highlight, insert-clausula, declare-variable, PLAN-06 versioning)
    - PlantillaEditor CM6 component with insertAtCursor ref handle
    - VariablesPanel live grouped variable display
    - InsertarClausulaModal Phase-4 library filter + renumber (CLAU-04)
    - DeclararVariableModal expediente/contacto only, Pitfall 4 guard (PLAN-04)
  affects:
    - 05-04-tests-coverage (test targets for frontend components)
    - UAT Task 4 (human checkpoint — awaiting)
tech_stack:
  added:
    - "@codemirror/state@^6.4.1"
    - "@codemirror/view@^6.34.1"
    - "@codemirror/commands@^6.7.1"
    - "@codemirror/language@^6.10.3"
  patterns:
    - CM6 ViewPlugin with RangeSetBuilder for decoration (framework-agnostic, useEffect mount/destroy)
    - forwardRef + useImperativeHandle for insertAtCursor API
    - TanStack Query v5 (no onSuccess in useQuery — use useEffect for init state)
    - VariableDetectada from @lexscribe/shared-validation (has valido/linea/columna)
    - FormData variant fetch (no Content-Type override) for multipart upload
key_files:
  created:
    - apps/frontend/lib/api/plantillas.ts
    - apps/frontend/components/plantillas/variableHighlight.ts
    - apps/frontend/components/plantillas/PlantillaEditor.tsx
    - apps/frontend/components/plantillas/VariablesPanel.tsx
    - apps/frontend/components/plantillas/InsertarClausulaModal.tsx
    - apps/frontend/components/plantillas/DeclararVariableModal.tsx
    - apps/frontend/components/plantillas/PlantillaTable.tsx
    - apps/frontend/app/(app)/plantillas/page.tsx
    - apps/frontend/app/(app)/plantillas/nuevo/page.tsx
    - apps/frontend/app/(app)/plantillas/[id]/page.tsx
    - apps/frontend/__tests__/plantillas/PlantillaEditor.test.tsx
    - apps/frontend/__tests__/plantillas/VariablesPanel.test.tsx
    - apps/frontend/__tests__/plantillas/InsertarClausulaModal.test.tsx
    - apps/frontend/__tests__/plantillas/DeclararVariableModal.test.tsx
  modified:
    - apps/frontend/package.json (CM6 deps added)
    - apps/frontend/app/(app)/layout.tsx (Plantillas nav link)
    - pnpm-lock.yaml
decisions:
  - "VariableDetectada imported from @lexscribe/shared-validation not @lexscribe/shared-types: the shared-types version lacks valido/linea/columna fields needed by UI"
  - "TanStack Query v5 removes onSuccess from useQuery: use useEffect + initialized flag for hydrating local state from fetched data"
  - "CM6 mocked in jsdom tests (MockEditorView/MockEditorState): CM6 requires real DOM APIs; tests verify component contract not CM6 internals"
  - "DeclararVariableModal accepts VariableDetectada[] from parent: parent filters valido expediente/contacto, modal enforces isDeclarable guard as defense-in-depth"
  - "apiFetchFormData variant: separate fetch path without Content-Type header so browser sets multipart/form-data boundary for uploadPlantilla"
  - "afterNumero computed as last clause header for MVP: sufficient for the common insert-at-end use case; cursor-aware computation is post-MVP"
metrics:
  duration: "~8 min"
  completed_date: "2026-05-31"
  tasks_completed: 3
  tasks_pending: 1
  files_created: 14
  files_modified: 3
  tests_added: 17
---

# Phase 05 Plan 03: Frontend Editor Summary

**One-liner:** CodeMirror 6 plantilla editor with live valid/invalid variable highlight, real-time variables panel, Phase-4 clausula library insert-with-renumber modal, declare-variable modal (expediente/contacto only, Pitfall 4), and three pages (list/nuevo/[id]) wired to the backend — awaiting human UAT (Task 4).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | CM6 packages + API client + PlantillaEditor + VariablesPanel | 8d29166 | package.json, pnpm-lock.yaml, lib/api/plantillas.ts, variableHighlight.ts, PlantillaEditor.tsx, VariablesPanel.tsx, 2 tests |
| 2 | InsertarClausulaModal (CLAU-04) + DeclararVariableModal (PLAN-04) | 4fb07fb | InsertarClausulaModal.tsx, DeclararVariableModal.tsx, 2 test files |
| 3 | Pages list/nuevo/[id] + PlantillaTable + nav link + type fixes | 2159589 | PlantillaTable.tsx, 3 pages, layout.tsx, type fix (shared-validation VariableDetectada) |
| 4 | UAT checkpoint | — | AWAITING human verification |

## Verification Results (Tasks 1-3)

- `pnpm --filter @lexscribe/frontend type-check` — clean (0 errors)
- `pnpm --filter @lexscribe/frontend vitest run __tests__/plantillas` — 17/17 pass (4 test files)
- `@codemirror/view` present in package.json
- `declararVariable` in lib/api/plantillas.ts
- `uploadPlantilla` with FormData variant in lib/api/plantillas.ts
- `parseVariables(` in variableHighlight.ts
- `cm-var-invalid` in variableHighlight.ts
- `groupByTipoObjeto(` in VariablesPanel.tsx
- `insertClausulaAndRenumber(` in InsertarClausulaModal.tsx
- `listClausulas(` in InsertarClausulaModal.tsx (Phase 4 reuse D-06)
- `declararVariable(` in DeclararVariableModal.tsx
- `no declarable` in DeclararVariableModal.tsx (Pitfall 4)
- `/plantillas` in layout.tsx nav
- `createPlantilla(` in /plantillas/nuevo/page.tsx
- `uploadPlantilla(` in /plantillas/nuevo/page.tsx
- `updatePlantilla(` in /plantillas/[id]/page.tsx
- `InsertarClausulaModal` in /plantillas/[id]/page.tsx
- `DeclararVariableModal` in /plantillas/[id]/page.tsx

## Decisions Made

1. **VariableDetectada from @lexscribe/shared-validation** — The shared-types `VariableDetectada` is a subset (lacks `valido`, `linea`, `columna`). Frontend components that need these fields (highlight decorations, invalid-block UI) import from `@lexscribe/shared-validation` directly.

2. **TanStack Query v5 `onSuccess` removed from `useQuery`** — Used `useEffect` with `initialized` flag to hydrate local contenido state from fetched data. Pattern avoids the deprecated option.

3. **CM6 mocked in jsdom tests** — CodeMirror 6 requires real DOM/canvas APIs not available in jsdom. Tests mock `@codemirror/view` and `@codemirror/state` to verify component contract (ref handle, onChange, render) without CM6 internals. VariablesPanel tests run against real `parseVariables`/`groupByTipoObjeto` (pure functions, no DOM dep).

4. **apiFetchFormData separate function** — Browser must set `Content-Type: multipart/form-data` with boundary automatically. A separate fetch path without `Content-Type: application/json` override handles the `.docx` upload case.

5. **afterNumero = last clause header in MVP** — For the editor detail page, `getAfterNumero()` returns the last detected clause ordinal as the insertion point. Cursor-aware detection requires CM6 cursor position which is post-MVP complexity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VariableDetectada type mismatch (shared-types vs shared-validation)**
- **Found during:** Task 3 — type-check after creating pages
- **Issue:** `DeclararVariableModal.test.tsx` used `VariableDetectada` from `@lexscribe/shared-types` which lacks `valido`, `linea`, `columna`. TypeScript error: property `valido` does not exist on type.
- **Fix:** Changed imports to `@lexscribe/shared-validation` in DeclararVariableModal.tsx, DeclararVariableModal.test.tsx, and VariablesPanel.tsx.
- **Files modified:** 3 files
- **Commit:** 2159589

**2. [Rule 1 - Bug] TanStack Query v5 removed `onSuccess` from `useQuery`**
- **Found during:** Task 3 — type-check for /plantillas/[id]/page.tsx
- **Issue:** `onSuccess` was removed from `useQuery` in TanStack Query v5. TypeScript rejected the option.
- **Fix:** Replaced with `useEffect` + `initialized` state flag pattern to sync fetched `data.contenido` into local `contenido` state.
- **Files modified:** apps/frontend/app/(app)/plantillas/[id]/page.tsx
- **Commit:** 2159589

## Known Stubs

None in Tasks 1-3. All components receive live data from the API or parsed from real shared-validation functions. The DeclararVariableModal receives `declarableVars` from the parent page which runs `parseVariables` on live editor content.

**Pending (Task 4):** Human UAT required to confirm all 5 scenarios:
1. FL-2: create + variable detection + highlight
2. F-030b: unknown-type block
3. PLAN-04: declare variable (+ Pitfall 4 non-declarable)
4. FL-7: insert cláusula + renumber
5. PLAN-06: versioning (PATCH creates new version)

## Self-Check: PASSED

Files verified present (git log):
- 8d29166 — feat(05-03): CM6 packages + API client + PlantillaEditor highlight + VariablesPanel
- 4fb07fb — feat(05-03): InsertarClausulaModal (CLAU-04) + DeclararVariableModal (PLAN-04)
- 2159589 — feat(05-03): pages list/nuevo/[id] + PlantillaTable + nav link + type fixes
