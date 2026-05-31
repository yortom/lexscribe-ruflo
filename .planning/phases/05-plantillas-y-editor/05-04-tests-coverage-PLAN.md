---
phase: 05-plantillas-y-editor
plan: 04
type: execute
wave: 4
depends_on: ["05-01", "05-02", "05-03"]
files_modified:
  - packages/shared-validation/src/variable-parser.test.ts
  - packages/shared-validation/src/clausula-renumber.test.ts
  - packages/shared-validation/vitest.config.ts
  - apps/backend/src/modules/plantillas/plantillas.service.spec.ts
  - apps/backend/src/modules/plantillas/plantillas.repository.spec.ts
  - apps/backend/jest.config.ts
autonomous: true
requirements: [SEC-06, PLAN-02, PLAN-03, PLAN-06, CLAU-04]
must_haves:
  truths:
    - "variable-parser.ts and clausula-renumber.ts reach >=80% line coverage via vitest"
    - "plantillas service + repository (versioning) reach >=80% line coverage via jest"
    - "coverageThreshold gates are enforced and the full suites pass green"
  artifacts:
    - path: "packages/shared-validation/vitest.config.ts"
      provides: "coverage thresholds (lines>=80) on parser + renumber"
      contains: "thresholds"
    - path: "apps/backend/src/modules/plantillas/plantillas.service.spec.ts"
      provides: "unit coverage of detect/validate/version/declare logic"
      min_lines: 40
    - path: "apps/backend/jest.config.ts"
      provides: "coverageThreshold for ./src/modules/plantillas/"
      contains: "plantillas"
  key_links:
    - from: "vitest.config.ts coverage thresholds"
      to: "CI test gate"
      via: "vitest run --coverage failing under threshold"
      pattern: "thresholds"
    - from: "jest.config.ts coverageThreshold"
      to: "backend test gate"
      via: "jest --coverage failing under threshold"
      pattern: "plantillas"
---

<objective>
Close the SEC-06 coverage requirement for Phase 5: bring the variable parser, clause renumber, and plantillas versioning service/repository to >=80% line coverage, with thresholds enforced so regressions fail CI. This is a dedicated wrap-up plan because coverage-chasing across three test runners (vitest for shared, jest for backend) is its own focused pass.

Purpose: SEC-06 mandates >=80% on the critical parser/template logic. Wave 1-3 created the happy-path tests; this plan fills branch/edge gaps and turns the thresholds on.
Output: expanded test files + enforced coverageThreshold gates, full suites green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/shared-validation/src/variable-parser.ts
@packages/shared-validation/src/clausula-renumber.ts
@packages/shared-validation/vitest.config.ts
@apps/backend/src/modules/plantillas/plantillas.service.ts
@apps/backend/src/modules/plantillas/plantillas.repository.ts
@apps/backend/jest.config.ts
@apps/backend/src/modules/contactos/contactos.repository.spec.ts

<interfaces>
SEC-06 target files (critical parser/template logic):
  packages/shared-validation/src/variable-parser.ts  (vitest, provider v8)
  packages/shared-validation/src/clausula-renumber.ts (vitest, provider v8)
  apps/backend/src/modules/plantillas/plantillas.service.ts (jest)
  apps/backend/src/modules/plantillas/plantillas.repository.ts (jest)

Phase 3 unit-test patterns to reuse (STATE Key Decisions):
- Schema pre-hook coverage via kareem internals: extract hooks from `schema.s.hooks._pres`, skip `_setTimestampsOnUpdate` by name, call synchronously with a fake query — NO DB needed for repository unit tests.
- jest.config.ts targets `.spec.ts` only; e2e (MongoMemoryServer) has its own config.
- coverageThreshold block per-module (see contactos block: branches 70, functions 80, lines 80, statements 80).

vitest coverage config (added in 05-01) already includes variable-parser.ts + clausula-renumber.ts with thresholds {lines:80,functions:80,branches:70,statements:80}.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fill shared parser + renumber coverage to >=80% and enforce vitest thresholds</name>
  <read_first>
    - packages/shared-validation/src/variable-parser.ts (every branch: valid/invalid type, 2-part vs 3-part, multiline, dedupe)
    - packages/shared-validation/src/clausula-renumber.ts (ordinal edge cases 1/10/11/20/21/50, accent-less detection, insert at 0/middle/end, no-headers)
    - packages/shared-validation/src/variable-parser.test.ts + clausula-renumber.test.ts (existing from 05-01)
    - packages/shared-validation/vitest.config.ts
  </read_first>
  <action>
    Run `cd packages/shared-validation && pnpm vitest run --coverage` and read the per-file uncovered-line report. Add tests to variable-parser.test.ts and clausula-renumber.test.ts until variable-parser.ts AND clausula-renumber.ts each reach >=80% lines AND >=70% branches. Likely gaps to cover:
    - parser: empty string, no-match text, malformed `{{ x }}` (inner spaces -> not matched), only-`{{` no close, 3-part roled invalid type, multiline column reset, groupByTipoObjeto dedupe of repeated (rol,campo), validarVariables with mixed valid/invalid.
    - renumber: ordinalToInt returns null for garbage, intToOrdinal compound (21,22,...,29,31), accent-less "CLAUSULA" + lowercase "cláusula primera.-" detection, insertClausulaAndRenumber at afterNumero=0 (top), at last clause, into empty text (-> PRIMERA), and that a header with an unparseable ordinal is skipped (not renumbered).
    Confirm vitest.config.ts thresholds are present and active (lines:80, branches:70, functions:80, statements:80) so the run FAILS if coverage drops. If 05-01 omitted @vitest/coverage-v8, add it to devDependencies and `pnpm install`.
  </action>
  <verify>
    <automated>cd packages/shared-validation && pnpm vitest run --coverage</automated>
  </verify>
  <acceptance_criteria>
    - grep "thresholds" packages/shared-validation/vitest.config.ts -> match
    - grep "lines: 80" packages/shared-validation/vitest.config.ts -> match
    - `pnpm vitest run --coverage` exits 0 (does NOT fail on threshold) and reports variable-parser.ts + clausula-renumber.ts lines >=80%
  </acceptance_criteria>
  <done>Parser + renumber at >=80% lines / >=70% branches, vitest threshold gate enabled and passing.</done>
</task>

<task type="auto">
  <name>Task 2: plantillas service + repository unit tests to >=80% and enforce jest threshold</name>
  <read_first>
    - apps/backend/src/modules/plantillas/plantillas.service.ts (detectarYValidar, create, update/version, declararVariable guard)
    - apps/backend/src/modules/plantillas/plantillas.repository.ts (createNewVersion two-step)
    - apps/backend/src/modules/contactos/contactos.repository.spec.ts (Phase 3 mock/hook-extraction pattern)
    - apps/backend/jest.config.ts (coverageThreshold blocks)
  </read_first>
  <action>
    1. Create `apps/backend/src/modules/plantillas/plantillas.service.spec.ts` (jest, mock the repo + EsquemasService + StorageService with jest.fn()):
      - create: valid contenido -> calls repo.createFirstVersion with variablesDetectadas of correct length.
      - create with unknown-type contenido -> throws ValidationError naming the variable + line (F-030b). Assert it does NOT call the repo.
      - update -> calls repo.createNewVersion (PLAN-06).
      - declararVariable expediente -> calls esquemas.addParametro with {nombre,tipoDato,obligatorio:false}.
      - declararVariable clausula/fecha -> throws ValidationError, does NOT call addParametro (Pitfall 4).
      - getById missing -> NotFoundError.
    2. Create `apps/backend/src/modules/plantillas/plantillas.repository.spec.ts` (mock Mongoose Model with jest.fn() for create/find/sort/limit/findOneAndUpdate):
      - createNewVersion: assert create() (new version) is invoked BEFORE the deactivate findOneAndUpdate (insert-then-deactivate ordering — STATE: no transaction). Use call-order assertions (e.g. capture an order array, or `expect(create).toHaveBeenCalledBefore(findOneAndUpdate)` via jest-extended or manual ordering check).
      - version increment computed from max existing version + 1.
    3. Add to `apps/backend/jest.config.ts` coverageThreshold a `./src/modules/plantillas/` block: { branches: 70, functions: 80, lines: 80, statements: 80 } (mirror the contactos block). (05-02 may already have added it — confirm/keep.)
    Run `cd apps/backend && pnpm jest --coverage --collectCoverageFrom='src/modules/plantillas/**/*.ts'` and add tests until the plantillas module hits the threshold. (conversion.ts may be excluded from the threshold target or covered by its own spec from 05-02.)
  </action>
  <verify>
    <automated>cd apps/backend && pnpm jest --coverage src/modules/plantillas</automated>
  </verify>
  <acceptance_criteria>
    - grep "'./src/modules/plantillas/'" apps/backend/jest.config.ts -> match
    - grep "createNewVersion" apps/backend/src/modules/plantillas/plantillas.repository.spec.ts -> match
    - grep "addParametro" apps/backend/src/modules/plantillas/plantillas.service.spec.ts -> match
    - grep -i "ValidationError" apps/backend/src/modules/plantillas/plantillas.service.spec.ts -> match (unknown-type + declarar guard)
    - `pnpm jest --coverage src/modules/plantillas` exits 0 with plantillas lines >=80%
  </acceptance_criteria>
  <done>plantillas service + repository unit-tested >=80% lines (incl. insert-then-deactivate ordering + F-030b + declarar guard), jest threshold block enforced and passing.</done>
</task>

<task type="auto">
  <name>Task 3: Full-suite green gate</name>
  <read_first>
    - root package.json scripts (test = build:packages + per-workspace test)
  </read_first>
  <action>
    Run the whole project test pipeline to confirm nothing regressed across packages + backend + frontend:
      from repo root: `pnpm run build:packages && pnpm -r run test`
    Fix any cross-package fallout (e.g. a type drift in shared-types consumed by backend/frontend). Confirm:
    - shared-validation vitest green (parser+renumber, thresholds met).
    - backend jest unit suite green (plantillas + existing modules, thresholds met) and e2e (plantillas.e2e-spec from 05-02) green.
    - frontend vitest green (plantillas component tests + existing).
    Do NOT loosen any threshold to make it pass — fix the tests/coverage instead.
  </action>
  <verify>
    <automated>pnpm run build:packages && pnpm -r run test</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm run build:packages` exits 0
    - `pnpm -r run test` exits 0 (all workspaces: shared-validation, backend, frontend)
    - no coverageThreshold value was lowered relative to 05-01/05-02 (parser/renumber/plantillas all still gated at lines:80)
  </acceptance_criteria>
  <done>Entire repo test pipeline green with Phase 5 coverage gates enforced; SEC-06 satisfied for parser/renumber/plantillas.</done>
</task>

</tasks>

<verification>
- SEC-06: variable-parser.ts, clausula-renumber.ts, plantillas.service.ts, plantillas.repository.ts all >=80% line coverage.
- Coverage gates ON in vitest.config.ts (shared) and jest.config.ts (backend ./src/modules/plantillas/).
- `pnpm -r run test` green end-to-end; no thresholds weakened.
</verification>

<success_criteria>
SEC-06 met for the Phase 5 critical logic: parser, renumber, and plantillas versioning service/repository exceed 80% coverage with enforced thresholds, and the full monorepo test suite passes.
</success_criteria>

<output>
After completion, create `.planning/phases/05-plantillas-y-editor/05-04-SUMMARY.md`
</output>
