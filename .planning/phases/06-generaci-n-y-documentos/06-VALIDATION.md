---
phase: 6
slug: generaci-n-y-documentos
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-02
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 (backend unit + e2e) / Vitest 2 (frontend) |
| **Config file** | `apps/backend/jest.config.ts` (unit, *.spec.ts) · `apps/backend/jest.e2e.config.ts` (e2e, MongoMemoryServer) · frontend Vitest |
| **Quick run command** | `pnpm --filter backend test` |
| **Full suite command** | `pnpm -r run test` |
| **Estimated runtime** | ~60-90 seconds (backend unit + e2e) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test` (backend tasks) / `pnpm --filter frontend test` (frontend tasks)
- **After every plan wave:** Run `pnpm -r run test`
- **Before `/gsd:verify-work`:** Full suite must be green; backend documentos coverage >=80%
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DOC-04 (deps + getObject) | typecheck | `pnpm --filter backend exec tsc --noEmit` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DOC-01/03/04 (types+DTOs) | build | `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | DOC-01/03/04/07 (pipeline) | unit | `pnpm --filter backend test -- generation.service.spec` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | DOC-02/04/05/06 (service+ctrl) | typecheck | `pnpm --filter backend exec tsc --noEmit` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | EXPE-07 + DI wiring | e2e | `pnpm --filter backend test:e2e -- expedientes` | ✅ | ⬜ pending |
| 06-02-03 | 02 | 2 | DOC-05/DOC-06 + DOC-02/07 | unit+e2e | `pnpm --filter backend test -- documentos.service.spec && pnpm --filter backend test:e2e -- documentos` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | DOC-01/03 (preRelleno) | unit | `pnpm --filter frontend test -- preRelleno` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 3 | DOC-01/02/03 (form) | unit | `pnpm --filter frontend test -- GeneracionForm` | ❌ W0 | ⬜ pending |
| 06-03-03 | 03 | 3 | DOC-05/06 (list/upload) | build+lint | `pnpm --filter frontend build && pnpm --filter frontend lint` | ✅ | ⬜ pending |
| 06-03-04 | 03 | 3 | DOC-01..06 (UX flow) | manual | UAT humano (backend+MinIO live) | n/a | ⬜ pending |
| 06-04-01 | 04 | 3 | DOC-04/05/06 (repo+ctrl) | unit | `pnpm --filter backend test -- documentos.repository.spec documentos.controller.spec` | ❌ W0 | ⬜ pending |
| 06-04-02 | 04 | 3 | DOC-07 + SEC-06 coverage | unit+coverage | `pnpm --filter backend test -- --coverage --collectCoverageFrom='src/modules/documentos/**/*.ts'` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is satisfied inline within each TDD task (tests created alongside implementation in same plan/wave):

- [ ] `pnpm --filter backend add docxtemplater pizzip` + `@types/pizzip` (06-01 Task 1) — framework dependency install, required before GenerationService
- [ ] `apps/backend/src/modules/documentos/tests/generation.service.spec.ts` (06-01 Task 3) — DOC-01/03/04/07
- [ ] `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` (06-02 Task 3) — DOC-02/05/06/07
- [ ] `apps/backend/test/documentos/documentos.e2e-spec.ts` (06-02 Task 3) — DOC-05/06 e2e (MongoMemoryServer + mocked StorageService)
- [ ] `apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts` (06-04 Task 1)
- [ ] `apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts` (06-04 Task 1)
- [ ] `apps/frontend/lib/generacion/preRelleno.ts` test + `GeneracionForm.test.tsx` (06-03 Tasks 1-2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Render .docx con variables sustituidas correctamente (visual) | DOC-04 | Inspección visual del .docx generado; docxtemplater XML no validable por aserción simple | UAT 06-03-04 paso 8: descargar y abrir el .docx, comprobar sustitución |
| Flujo formulario completo (pre-relleno, modal rol, contador, badge nuevo) | DOC-01/02/03 | Interacción UI multi-paso con backend+MinIO live | UAT 06-03-04 pasos 1-7 |

*Automated tests cover the logic (preRelleno, validación completitud, endpoints); the visual .docx output and full UX flow require human UAT.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are explicit manual UAT (06-03-04)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (only 06-03-04 is manual, preceded/standalone)
- [x] Wave 0 covers all MISSING references (tests created inline per TDD task)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-02
