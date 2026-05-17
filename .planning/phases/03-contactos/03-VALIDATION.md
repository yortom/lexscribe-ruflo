---
phase: 3
slug: contactos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (backend NestJS) + Vitest (frontend Next.js) |
| **Config file** | `apps/backend/jest.config.ts` / `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm --filter backend test -- --testPathPattern=contactos` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (backend unit), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test -- --testPathPattern=contactos`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | CONT-01 | unit | `pnpm --filter backend test -- --testPathPattern=contacto.schema` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CONT-01 | unit | `pnpm --filter backend test -- --testPathPattern=contactos.repository` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CONT-02 | unit | `pnpm --filter backend test -- --testPathPattern=contactos.service` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CONT-03 | unit | `pnpm --filter backend test -- --testPathPattern=contactos.service` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 2 | CONT-01,CONT-02 | integration | `pnpm --filter backend test:e2e -- --testPathPattern=contactos` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 0 | CONT-02 | unit | `pnpm --filter frontend test -- --testPathPattern=contactos` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | CONT-04 | unit | `pnpm --filter frontend test -- --testPathPattern=ContactoForm` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | CONT-04 | unit | `pnpm --filter frontend test -- --testPathPattern=ContactosList` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | CONT-05 | unit+int | `pnpm --filter backend test -- --testPathPattern=contactos --coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/contactos/__tests__/contactos.service.spec.ts` — stubs for CONT-01, CONT-02, CONT-03
- [ ] `apps/backend/src/contactos/__tests__/contactos.repository.spec.ts` — stubs for CONT-01
- [ ] `apps/backend/test/contactos.e2e-spec.ts` — e2e stubs for CONT-01, CONT-02, CONT-04
- [ ] `apps/frontend/src/app/(app)/contactos/__tests__/` — stubs for CONT-04
- [ ] Verify `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers/zod` in `apps/frontend/package.json`

*Wave 0 creates test file skeletons so subsequent waves have feedback from the first commit.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI crear contacto persona física/jurídica | CONT-01 | Browser rendering & form UX | Navigate to /contactos/nuevo; select tipo; fill campos base; save; verify record appears in listado |
| Parámetro personalizado registra en esquema dinámico | CONT-03 | Requires live MongoDB + frontend interaction | Add custom param via UI; verify `GET /api/v1/esquemas/contacto` returns new campo |
| Filtro tipología + búsqueda por nombre/NIF paginado | CONT-04 | UI interaction + pagination UX | Seed >20 contactos; use search; filter by tipología; verify pagination controls work |
| Sección "Expedientes vinculados" visible (stub) | CONT-01 | Visual UI check | Open contacto detail; verify section heading exists and shows empty state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
