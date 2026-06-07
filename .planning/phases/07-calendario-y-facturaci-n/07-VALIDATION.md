---
phase: 7
slug: calendario-y-facturaci-n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed test→criterion mapping lives in 07-RESEARCH.md "## Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: jest 29.x (NestJS) · Frontend: vitest 2.x + Testing Library |
| **Config file** | apps/backend/jest.config.ts · apps/frontend/vitest.config.ts |
| **Quick run command** | `npm test` (workspace-scoped per package during a task) |
| **Full suite command** | `npm test && npm run lint && npm run build` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** Run the affected package's `npm test`
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

> Filled by the planner per task. Each task's `<acceptance_criteria>` must map to a grep/test/CLI check.
> The planner derives task IDs (07-01-xx … 07-04-xx) from the four sub-plans.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-00-01 | 00 | 0 | DATA | docs | `grep mostrarEnCalendario docs/DATOS.md` | ❌ W0 | ⬜ pending |
| 07-01-xx | 01 | 1 | CAL-01,02,04 | unit/int | `npm test -w apps/backend` | ❌ W0 | ⬜ pending |
| 07-02-xx | 02 | 1 | FAC-01..05 | unit/int | `npm test -w apps/backend` | ❌ W0 | ⬜ pending |
| 07-03-xx | 03 | 2 | CAL-01,03,05 | unit | `npm test -w apps/frontend` | ❌ W0 | ⬜ pending |
| 07-04-xx | 04 | 2 | FAC-01..05 | unit | `npm test -w apps/frontend` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `docs/DATOS.md` §4.6 (add `mostrarEnCalendario` to eventos schema) + §9 changelog (D-01, CLAUDE.md rule 4) — **must precede any code task**
- [ ] `apps/backend/src/modules/eventos/tests/*.spec.ts` — stubs for CAL-01/02/04/05
- [ ] `apps/backend/src/modules/facturacion/tests/*.spec.ts` — stubs for FAC-01..05 (incl. $sum aggregate with `activo: true`)
- [ ] `packages/shared-types/src/evento.ts`, `factura.ts` — type contracts before consumers
- [ ] Frontend component test stubs (FechasTab, FacturacionTab, calendar page, FL-9 modal)

*Existing jest + vitest infrastructure covers the frameworks; no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| react-calendar visual month grid + event dots render | CAL-03 | Visual/DOM rendering of 3rd-party calendar; assert markers via Testing Library, but visual polish is manual | Open `/calendario`, confirm dots on days with events, range filter narrows list |
| Color preset visually distinguishes events | CAL-04 | Color perception | Create 2 events with different presets, confirm distinct colors in calendar + list |
| Status dropdown color badges | FAC-03 | Visual badge styling | Change a row pendiente→facturado→cobrado, confirm badge color + total breakdown update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (DATOS.md update, type contracts, test stubs)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
