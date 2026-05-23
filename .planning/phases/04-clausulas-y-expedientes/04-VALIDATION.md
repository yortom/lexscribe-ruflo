---
phase: 4
slug: clausulas-y-expedientes
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework backend** | Jest 29.x + Supertest (unit `*.spec.ts`, e2e `*.e2e-spec.ts` con MongoMemoryServer) |
| **Framework frontend** | Vitest 2.x + Testing Library |
| **Config file backend** | `apps/backend/jest.config.ts` (unit) + `apps/backend/test/jest-e2e.config.ts` (e2e) |
| **Config file frontend** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @lexscribe/backend test -- --testPathPattern='(clausulas|expedientes)' --coverage && pnpm --filter @lexscribe/frontend test` |
| **Full suite command** | `pnpm --filter @lexscribe/backend test && pnpm --filter @lexscribe/backend test:e2e && pnpm --filter @lexscribe/frontend test` |
| **Coverage threshold** | `coverageThreshold` per-module ≥80% lines + 80% functions (replicar perfil Phase 3 `./src/modules/contactos/`) |
| **Estimated runtime** | ~30s backend unit · ~60s backend e2e · ~20s frontend unit · ~110s full |

---

## Sampling Rate

- **After every task commit:** Run quick command (módulo afectado, <30s feedback).
- **After every plan wave:** Run full suite (`pnpm --filter @lexscribe/backend test && pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern='(clausulas|expedientes|contactos)' && pnpm --filter @lexscribe/frontend test`).
- **Before `/gsd:verify-work`:** Full suite must be green incluyendo coverage gates.
- **Max feedback latency:** 30 segundos por task commit, 120 segundos por wave merge.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CLAU-01..03 | build | `cd packages/shared-validation && pnpm build && cd ../shared-types && pnpm build` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CLAU-01..03 | lint+build | `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CLAU-01..03 | e2e | `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern=clausulas` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | EXPE-01..07 | build | `cd packages/shared-validation && pnpm build && cd ../shared-types && pnpm build` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | EXPE-01..07, CONT-05 | lint+build | `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | EXPE-01..07, CONT-05 | e2e | `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern="(expedientes|contactos)"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | CLAU-01..03 | unit (Vitest) | `pnpm --filter @lexscribe/frontend test -- clausulas && pnpm --filter @lexscribe/frontend lint` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | EXPE-01..07, CONT-05 | unit+build | `pnpm --filter @lexscribe/frontend test -- expedientes && pnpm --filter @lexscribe/frontend lint && pnpm --filter @lexscribe/frontend build` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 2 | UAT | checkpoint | manual UAT — 8 escenarios | n/a | ⬜ pending |
| 04-04-01 | 04 | 3 | CLAU-01..03 | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=clausulas` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 3 | EXPE-01..07 | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=expedientes` | ❌ W0 | ⬜ pending |
| 04-04-03 | 04 | 3 | CONT-05, coverage | unit+coverage | `pnpm --filter @lexscribe/backend test --coverage` | ✅ existe (contactos.service.spec.ts — ampliar) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts` — stubs for CLAU-01..03 (creado en 04-04 Task 1)
- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts` — stubs CLAU-01..03 (creado en 04-04 Task 1)
- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.controller.spec.ts` — stubs CLAU-01..03 (creado en 04-04 Task 1)
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.repository.spec.ts` — stubs EXPE-01..07 (creado en 04-04 Task 2)
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` — stubs EXPE-01..07 (creado en 04-04 Task 2)
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.controller.spec.ts` — stubs EXPE-01..07 (creado en 04-04 Task 2)
- [ ] `apps/backend/test/clausulas/clausulas.e2e-spec.ts` — e2e CLAU-01..03 + audit (creado en 04-01 Task 3)
- [ ] `apps/backend/test/expedientes/expedientes.e2e-spec.ts` — e2e EXPE-01..07 + audit linked/unlinked (creado en 04-02 Task 3)
- [ ] `apps/frontend/__tests__/clausulas/ClausulaForm.test.tsx`, `ClausulaTable.test.tsx` — Vitest (04-03 Task 1)
- [ ] `apps/frontend/__tests__/expedientes/ExpedienteForm.test.tsx`, `ContactosVinculadosTab.test.tsx` — Vitest (04-03 Task 2)
- [ ] `apps/backend/jest.config.ts` — extender `coverageThreshold` con `./src/modules/clausulas/` y `./src/modules/expedientes/` (04-04 Task 3)
- [ ] Recompilar `packages/shared-validation` y `packages/shared-types` antes del primer arranque del backend (ARQUITECTURA §3.1 — packages consumidos desde `dist/`)
- [ ] Verificar `EventEmitterModule.forRoot({ wildcard: true })` en `app.module.ts` (necesario para listener `*.linked` / `*.unlinked`)

*Wave 0 = primer commit de cada plan crea los esqueletos de test antes de la implementación (patrón TDD `tdd="true"` ya marcado en todas las tasks).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI crear cláusula con labels múltiples (chips + Enter) | CLAU-01, CLAU-02 | Interacción teclado + render de chips | /clausulas/nuevo → escribir nombre + texto → añadir labels con Enter → Guardar → verificar listado muestra badges |
| Búsqueda full-text + filtro label combinados | CLAU-03 | UX debounce + interacción dropdown | Crear 3 cláusulas con labels distintos → buscar término que matche solo una → aplicar filtro label → ver intersección correcta |
| Modal asociar contacto con rol + manejo error 409 | EXPE-02, EXPE-03 | Validación visual de error inline | Asociar contacto A rol "cliente" → repetir mismo par → ver mensaje legible "ya vinculado con rol cliente" en modal sin cerrarlo |
| Detalle expediente con tabs (Contactos / Parámetros / Documentos / Fechas / Facturación) | EXPE-04, EXPE-06, EXPE-07 | Visual UI check + navegación tabs | Abrir detalle expediente → click cada tab → verificar Documentos/Fechas/Facturación muestran "Disponible en Phase X" como placeholder |
| Sección "Expedientes vinculados" en detalle contacto poblada | CONT-05 | Visual verification + navegación cross-feature | Vincular contacto A a expediente → abrir /contactos/{A} → ver sección con expediente listado + badge rol → click navega a /expedientes/{id} |
| Rol con espacio (URL-encoding) en desasociar | EXPE-02 | Verifica encodeURIComponent en cliente | Asociar contacto con rol "Cliente Principal" → click Desasociar → debe completar sin 404 |
| 8 escenarios UAT completos | CLAU-01..03 + EXPE-01..07 + CONT-05 | Gate humano antes de Wave 3 | Ejecutar checkpoint `04-03 Task 3` (ver plan para guion completo) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies declared
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (todas las tasks tienen `<verify><automated>`)
- [x] Wave 0 covers all MISSING references (specs unit creados en 04-04; e2e creados en 04-01/02; vitest en 04-03)
- [x] No watch-mode flags (vitest usa `run`, jest sin `--watch`)
- [x] Feedback latency < 30s per task commit (módulo filtrado), < 120s per wave merge
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-18 (planner — populated from 04-RESEARCH §Validation Architecture)
