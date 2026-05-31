---
phase: 05-plantillas-y-editor
plan: "01"
subsystem: shared-parsing
tags: [shared-validation, shared-types, variable-parser, clause-renumber, plantillas, zod, vitest, tdd]
dependency_graph:
  requires: []
  provides:
    - parseVariables()
    - groupByTipoObjeto()
    - validarVariables()
    - KNOWN_TIPO_OBJETO
    - intToOrdinal()
    - ordinalToInt()
    - detectClausulaHeaders()
    - insertClausulaAndRenumber()
    - CreatePlantillaSchema
    - UpdatePlantillaSchema
    - QueryPlantillaSchema
    - DeclararVariableSchema
    - Plantilla TS type
    - VariableDetectada TS type
    - PlantillaListResponse TS type
  affects:
    - 05-02-backend-plantillas (consumes parsing + schemas)
    - 05-03-frontend-editor (consumes parsing for live highlight/panel)
    - 05-04-tests-coverage (coverage targets live here)
tech_stack:
  added:
    - vitest@^2.0.0 (shared-validation devDependency)
    - "@vitest/coverage-v8@^2.0.0 (shared-validation devDependency)"
  patterns:
    - TDD London School — RED/GREEN/REFACTOR per task
    - Pure modules (zero runtime deps on parsing core)
    - CommonJS build via tsc for monorepo consumers
key_files:
  created:
    - packages/shared-validation/src/variable-parser.ts
    - packages/shared-validation/src/variable-parser.test.ts
    - packages/shared-validation/src/clausula-renumber.ts
    - packages/shared-validation/src/clausula-renumber.test.ts
    - packages/shared-validation/src/plantillas.ts
    - packages/shared-validation/vitest.config.ts
    - packages/shared-types/src/plantilla.ts
  modified:
    - packages/shared-validation/package.json (added vitest + test script)
    - packages/shared-validation/src/index.ts (barrel: +plantillas, +variable-parser, +clausula-renumber)
    - packages/shared-types/src/index.ts (barrel: +plantilla)
decisions:
  - "KNOWN_TIPO_OBJETO is a standalone 4-value const independent of esquemas.TIPO_OBJETO (which only covers expediente/contacto for addParametro)"
  - "DeclararVariableSchema restricts tipoObjeto to expediente|contacto — clausula/fecha intentionally excluded (service layer, Pitfall 4)"
  - "esArray always false in MVP — F-025 post-MVP iteration syntax not parsed"
  - "dist/ folders correctly excluded from git via .gitignore"
metrics:
  duration: "~6 min"
  completed_date: "2026-05-31"
  tasks_completed: 3
  files_created: 8
  files_modified: 3
  tests_added: 52
---

# Phase 05 Plan 01: Parser Shared Summary

**One-liner:** Pure variable parser (regex over `{{objeto.campo}}`), Spanish ordinal clause-renumbering utility, and Zod plantilla DTOs built in shared-validation with 52 vitest tests (TDD).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Variable parser + KNOWN_TIPO_OBJETO + vitest setup | d41fbb5 | variable-parser.ts, variable-parser.test.ts, package.json, vitest.config.ts |
| 2 | Clause-renumber utility + tests | fc7653a | clausula-renumber.ts, clausula-renumber.test.ts |
| 3 | Plantilla Zod schemas + shared-types + barrel + CJS build | ecc2fa9 | plantillas.ts, shared-types/plantilla.ts, index.ts (x2) |

## Verification Results

- `pnpm --filter @lexscribe/shared-validation test` — 52 tests, 2 suites, all passing
- `node require check` — exports ok: parseVariables, groupByTipoObjeto, validarVariables, intToOrdinal, insertClausulaAndRenumber, CreatePlantillaSchema
- KNOWN_TIPO_OBJETO (4 values) distinct from esquemas.TIPO_OBJETO (2 values) — confirmed by grep -c "from './esquemas'" === 0
- DeclararVariableSchema tipoObjeto restricted to expediente|contacto (Pitfall 4 enforced)
- Both packages build clean via tsc

## Decisions Made

1. **KNOWN_TIPO_OBJETO is a standalone 4-value const** — separate from `esquemas.TIPO_OBJETO` which only covers expediente/contacto for addParametro. The parser needs all 4 valid template types: expediente, contacto, clausula, fecha.

2. **DeclararVariableSchema restricts tipoObjeto to expediente|contacto** — clausula and fecha are resolved from the library at generation time and are not persistable to the dynamic schema. This Pitfall 4 guard is enforced at the Zod schema boundary.

3. **esArray always false in MVP** — F-025 iteration syntax `{{#each ...}}` is P1/post-MVP and explicitly not parsed.

4. **dist/ excluded from git** — .gitignore already ignores dist folders; build artifacts are generated at deploy time.

## Deviations from Plan

None — plan executed exactly as written. No auto-fix deviations required.

## Known Stubs

None. All exported functions are fully implemented and tested. No hardcoded empty values or placeholders that flow to consumers.

## Self-Check: PASSED

Files verified present:
- packages/shared-validation/src/variable-parser.ts — FOUND
- packages/shared-validation/src/variable-parser.test.ts — FOUND
- packages/shared-validation/src/clausula-renumber.ts — FOUND
- packages/shared-validation/src/clausula-renumber.test.ts — FOUND
- packages/shared-validation/src/plantillas.ts — FOUND
- packages/shared-validation/vitest.config.ts — FOUND
- packages/shared-types/src/plantilla.ts — FOUND

Commits verified:
- d41fbb5 — feat(05-01): variable parser + KNOWN_TIPO_OBJETO + vitest setup
- fc7653a — feat(05-01): clause-renumber utility — ordinals + header detection + insert/renumber
- ecc2fa9 — feat(05-01): plantilla Zod schemas, shared-types, barrel exports, CJS build
