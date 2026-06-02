---
phase: 05-plantillas-y-editor
plan: "04"
subsystem: tests-coverage
tags: [jest, vitest, coverage, sec-06, plantillas, unit-tests, tdd]
dependency_graph:
  requires:
    - 05-01 (variable-parser.ts + clausula-renumber.ts under vitest)
    - 05-02 (plantillas.service.ts + plantillas.repository.ts under jest)
  provides:
    - SEC-06 coverage gate: parser/renumber/plantillas >=80% lines enforced
    - plantillas.service.spec.ts (67 assertions)
    - plantillas.repository.spec.ts (20 assertions)
    - plantillas.controller.spec.ts (10 assertions)
  affects: []
tech_stack:
  added: []
  patterns:
    - Jest mock with call-order assertions (insert-then-deactivate ordering verified)
    - Mongoose Model chainable stub pattern (sort/skip/limit/setOptions/exec chain)
    - NestJS TestingModule + overrideGuard for controller isolation
    - MISSING_ID constant (24-char hex) to avoid BSONError in unit tests
key_files:
  created:
    - apps/backend/src/modules/plantillas/plantillas.service.spec.ts
    - apps/backend/src/modules/plantillas/plantillas.repository.spec.ts
    - apps/backend/src/modules/plantillas/plantillas.controller.spec.ts
    - .planning/phases/05-plantillas-y-editor/deferred-items.md
  modified: []
decisions:
  - "Task 1 was a verification-only pass — vitest parser/renumber already at 97-100% lines from 05-01"
  - "Controller spec added alongside service+repo specs to satisfy per-directory threshold (controller/DTOs/schemas all counted)"
  - "MISSING_ID = '000000000000000000000000' pattern for repository unit tests (valid 24-char hex avoids BSONError)"
  - "Contactos branch issue (69.69% vs 70%) is pre-existing from 03-03 — deferred, out of scope for 05-04"
metrics:
  duration: "~20 min"
  completed_date: "2026-05-31"
  tasks_completed: 3
  files_created: 4
  files_modified: 0
  tests_added: 67
---

# Phase 05 Plan 04: Tests Coverage Summary

**One-liner:** SEC-06 coverage gate closed — vitest parser/renumber already at 97-100% from 05-01; jest plantillas module brought from 0% to 99.13% lines / 79.03% branches via 67 new unit tests (service + repository + controller) with thresholds enforced in jest.config.ts.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Verify shared parser/renumber vitest coverage >=80% | (verification) | 0 — already passing (97-100% from 05-01) |
| 2 | plantillas service + repository + controller unit tests | 13e1f5d | plantillas.service.spec.ts, plantillas.repository.spec.ts, plantillas.controller.spec.ts |
| 3 | Full-suite green gate + deferred items log | e722d10 | deferred-items.md |

## Verification Results

### shared-validation vitest (SEC-06 parser + renumber)
- `pnpm vitest run` — 52 tests, 2 suites, all passing
- variable-parser.ts: 100% lines / 100% branches / 100% functions
- clausula-renumber.ts: 96.94% lines / 87.09% branches / 100% functions
- vitest.config.ts threshold: lines>=80, branches>=70, functions>=80, statements>=80 — PASSING

### backend jest (SEC-06 plantillas module)
- `pnpm jest --coverage` — 99 tests, 10 suites, all passing
- plantillas module aggregate: 99.13% lines / 79.03% branches / 97.14% functions
  - plantillas.service.ts: 97.95% lines / 88.46% branches / 92.3% functions
  - plantillas.repository.ts: 100% lines / 81.81% branches / 100% functions
  - plantillas.controller.ts: 100% lines / 68% branches / 100% functions
- jest.config.ts threshold for ./src/modules/plantillas/: lines>=80, branches>=70, functions>=80 — PASSING

### frontend vitest
- `pnpm vitest run` — 54 tests, 15 test files, all passing

### Full pipeline
- `pnpm run build:packages` — exits 0
- `pnpm -r run test` — exits 0 (52 + 99 + 54 = 205 tests across 3 workspaces)

## Decisions Made

1. **Task 1 was a verification-only pass** — Both variable-parser.ts (100%) and clausula-renumber.ts (96.94%) were already well above the 80% threshold from the 05-01 TDD plan. The vitest.config.ts thresholds were already configured. No new test files needed.

2. **Controller spec added alongside service+repo specs** — The jest coverageThreshold for `./src/modules/plantillas/` is a directory-level gate that counts all files: controller, DTOs, schemas. Adding only service+repo specs left the controller at 0%, pulling the aggregate below 80%. The controller spec was required to meet the threshold.

3. **MISSING_ID = '000000000000000000000000' pattern** — Repository unit tests that simulate "not found" scenarios need a valid MongoDB ObjectId string (24 hex chars) to avoid BSONError. The constant `MISSING_ID` is used for all "not found" branches.

4. **Contactos branch issue deferred** — `./src/modules/contactos/` branches at 69.69% (threshold 70%) is pre-existing from 03-03. Verified by running contactos-only tests without 05-04 staged files. Does not affect `pnpm -r run test` (coverage only enforced with --coverage flag). Logged to deferred-items.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Controller spec added for directory-level threshold**
- **Found during:** Task 2 — first coverage run showed plantillas aggregate at 63.48% due to controller at 0%
- **Issue:** The plan's acceptance criteria require plantillas module >=80% lines. The jest.config.ts threshold applies to the directory, counting controller + DTOs. Controller at 0% prevented threshold from passing.
- **Fix:** Added `plantillas.controller.spec.ts` with 10 tests covering all 8 HTTP endpoints + guard metadata
- **Files modified:** plantillas.controller.spec.ts (new)
- **Commit:** 13e1f5d (included in main Task 2 commit)

**2. [Rule 1 - Bug] BSONError on 'bad-id'/'not-found-id' in repository spec**
- **Found during:** Task 2 — first jest run showed 3 failures in repository spec
- **Issue:** Repository's `toObjectId()` calls `new Types.ObjectId(id)` which throws BSONError for non-hex strings. Test cases for "not found" branches used invalid strings.
- **Fix:** Replaced 'bad-id'/'not-found-id' with `MISSING_ID = '000000000000000000000000'` (valid 24-char hex)
- **Files modified:** plantillas.repository.spec.ts
- **Commit:** 13e1f5d (inline fix before commit)

## Known Stubs

None. All tests are fully implemented and testing real behavior.

## Self-Check: PASSED

Files verified present:
- apps/backend/src/modules/plantillas/plantillas.service.spec.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.repository.spec.ts — FOUND
- apps/backend/src/modules/plantillas/plantillas.controller.spec.ts — FOUND
- .planning/phases/05-plantillas-y-editor/deferred-items.md — FOUND

Commits verified:
- 13e1f5d — feat(05-04): plantillas service + repository + controller unit tests (SEC-06)
- e722d10 — chore(05-04): full-suite green gate — SEC-06 satisfied
