---
phase: 06-generaci-n-y-documentos
plan: "04"
subsystem: documentos-coverage-backend
tags: [jest, coverage, tdd, doc07, repository-spec, controller-spec, threshold]
dependency_graph:
  requires: [06-01-backend-pipeline-generacion, 06-02-backend-modulo-documentos]
  provides: [documentos.repository.spec, documentos.controller.spec, documentos coverageThreshold]
  affects: [jest.config.ts, generation.service.spec DOC-07 reinforced]
tech_stack:
  added: []
  patterns: [TDD London School, MISSING_ID pattern, directory-level Jest threshold, DOC-07 referential independence]
key_files:
  created:
    - apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts
    - apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts
  modified:
    - apps/backend/src/modules/documentos/tests/generation.service.spec.ts
    - apps/backend/jest.config.ts
decisions:
  - "coverageThreshold for ./src/modules/documentos/ applies only to direct-child files (controller/repo/service); dto/ and generation/ subdirectories are separate Jest entries — aggregate passes well above 80%"
  - "DOC-07 reinforced: Test 4 now captures the actual sourceExpediente mock object, mutates its parametros after generar() returns, and asserts datosCongelados holds the original values — proving referential independence via buildContext spread"
  - "MISSING_ID = '000000000000000000000000' pattern applied to repository spec for not-found branches — avoids BSONError from toObjectId()"
metrics:
  duration: ~15min
  completed: "2026-06-03"
  tasks: 2
  files_created: 2
  files_modified: 2
  tests: 27
---

# Phase 06 Plan 04: Tests Cobertura Documentos Summary

Repository + controller unit specs for documentos module (18 new tests), DOC-07 immutability reinforcement (test captures actual sourceExpediente reference), and Jest coverageThreshold for ./src/modules/documentos/ >=80% — 138 unit tests green, EXIT_CODE=0.

## What Was Built

1. **documentos.repository.spec.ts** (9 tests): Full coverage of all 4 repository methods using mocked Mongoose Model with chainable query mocks (`sort().skip().limit().exec()`). Uses `MISSING_ID = '000000000000000000000000'` pattern to avoid BSONError in not-found branches. Verifies:
   - `create`: usuarioId and expedienteId converted to `Types.ObjectId`
   - `findById`: filters by `{_id, usuarioId, activo:true}`, returns null for MISSING_ID
   - `listByExpediente`: sorts `fechaCreacion:-1`, applies correct skip/limit for pagination, builds filter with `{usuarioId, expedienteId, activo:true}`
   - `softDelete`: sets `activo:false + fechaInactivacion`, uses `returnDocument:'after'`

2. **documentos.controller.spec.ts** (9 tests): Controller delegation verification for all 6 endpoints. Mocks `DocumentosService`, overrides `JwtAuthGuard`, verifies:
   - `generar()`: delegates to `service.generar(uid, expedienteId, dto)`
   - `upload()`: delegates to `service.uploadExistente(uid, expedienteId, {file, nombre})` + throws ValidationError for empty/whitespace nombre
   - `list()`: delegates to `service.list(uid, expedienteId, q)` + throws ValidationError for missing expedienteId
   - `getById()`: delegates to `service.getById(uid, id)`
   - `download()`: delegates to `service.getDownloadUrl(uid, id)`
   - `remove()`: delegates to `service.remove(uid, id)`

3. **generation.service.spec.ts — Test 4 (DOC-07) reinforced**: The previous test created a separate `makeExpediente()` object (not the same reference as the one passed to `expedientesRepo.findById`). The reinforced test:
   - Creates `sourceExpediente` with known parametros values (`numero: '2026-001'`, `honorarios: 1000`)
   - Wires it to `expedientesRepo.findById`
   - Calls `service.generar()`
   - Mutates `sourceExpediente.parametros` AFTER generation (`numero = 'MUTATED'`, `honorarios = 9999`)
   - Asserts `result.datosCongelados` still holds the original values
   - Proves `buildContext` spreads parametros into a new plain object (no shared reference)

4. **jest.config.ts**: Added directory-level threshold entry:
   ```typescript
   './src/modules/documentos/': { lines: 80, functions: 80, branches: 60, statements: 80 },
   ```
   Existing thresholds for contactos and plantillas directories unchanged.

## Coverage Results (final run)

`src/modules/documentos/` (direct files: controller, repository, service):
- Statements: 97.8% (threshold: 80%) ✓
- Branches: 71.42% (threshold: 60%) ✓
- Functions: 95.45% (threshold: 80%) ✓
- Lines: 98.78% (threshold: 80%) ✓

Full suite: **14 suites, 138 tests, EXIT_CODE=0**

## Decisions Made

- `coverageThreshold` directory path `./src/modules/documentos/` counts only files directly in that directory (controller, repository, service) in Jest's aggregate — not recursively into `dto/` or `generation/`. This means `upload-documento.dto.ts` at 0% lines (DTO wrapper, 4 lines) does not drag the aggregate down.
- `MISSING_ID = '000000000000000000000000'` applied consistently — valid 24-char hex that won't exist, avoids BSONError from `toObjectId()`.
- Controller spec overrides `JwtAuthGuard` (same pattern as plantillas.controller.spec.ts) — no real JWT validation in unit tests.

## Deviations from Plan

None — plan executed exactly as written. Task 1 (TDD) went straight to GREEN as the repository and controller implementations were already complete from 06-01/06-02. Test 4 DOC-07 was reinforced per Task 2 specification.

## Known Stubs

None. All tests cover real implementation paths. No placeholder data.

## Self-Check: PASSED

Files exist:
- `apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts` — FOUND
- `apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts` — FOUND
- `apps/backend/src/modules/documentos/tests/generation.service.spec.ts` — FOUND (modified)
- `apps/backend/jest.config.ts` — FOUND (modified)

Commits:
- `d2ead46` test(06-04): add documentos.repository.spec + documentos.controller.spec (TDD GREEN)
- `2e4a06a` feat(06-04): reinforce DOC-07 test + add documentos coverageThreshold to jest.config.ts
