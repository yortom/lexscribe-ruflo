---
phase: 2
slug: auth-y-bases-transversales
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Detailed mapping in `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 (unit) + Jest 29 + supertest (e2e) |
| **Config file** | `apps/backend/jest.config.ts` (unit) · `apps/backend/jest.e2e.config.ts` (e2e — Wave 0 creates) |
| **Quick run command** | `pnpm --filter backend test` |
| **Full suite command** | `pnpm --filter backend test && pnpm --filter backend test:e2e` |
| **Estimated runtime** | ~30 s unit · ~60 s e2e |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 s

---

## Per-Task Verification Map

> Authoritative map lives in `02-RESEARCH.md` §Validation Architecture (per-requirement). Plans MUST inherit those test commands in each task's `<automated>` block. Status tracked here as plans/tasks crystallize.

| Task ID   | Plan  | Wave | Requirement | Test Type     | Automated Command | File Exists | Status |
|-----------|-------|------|-------------|---------------|-------------------|-------------|--------|
| 02-01/T1  | 02-01 | 1    | (Wave 0)    | infra         | `pnpm install --frozen-lockfile=false && pnpm --filter backend build && pnpm --filter backend test:e2e` | ❌ W0 | ⬜ pending |
| 02-01/T2  | 02-01 | 1    | AUTH-01..04 | e2e (auth)    | `pnpm --filter backend test:e2e -- auth login refresh logout guards` | ❌ W0 | ⬜ pending |
| 02-01/T3  | 02-01 | 1    | AUTH-01     | frontend build| `pnpm --filter frontend build && pnpm --filter frontend test` | ❌ W0 | ⬜ pending |
| 02-02/T1  | 02-02 | 2    | AUTH-06     | unit          | `pnpm --filter backend test -- soft-delete.plugin` | ❌ W0 | ⬜ pending |
| 02-02/T2  | 02-02 | 2    | (transversal) | unit+e2e   | `pnpm --filter backend test -- domain-exception && pnpm --filter backend test:e2e -- auth zod-validation` | ❌ W0 | ⬜ pending |
| 02-03/T1  | 02-03 | 2    | AUTH-07     | build+unit    | `pnpm --filter backend build && pnpm --filter backend test` | ❌ W0 | ⬜ pending |
| 02-03/T2  | 02-03 | 2    | AUTH-07     | unit+e2e      | `pnpm --filter backend test -- auditoria.interceptor && pnpm --filter backend test:e2e -- auditoria` | ❌ W0 | ⬜ pending |
| 02-04/T1  | 02-04 | 3    | AUTH-08     | e2e (esquemas)| `pnpm --filter backend test:e2e -- esquemas` | ❌ W0 | ⬜ pending |
| 02-04/T2  | 02-04 | 3    | AUTH-05     | e2e (seed)    | `pnpm --filter backend test:e2e -- seed` | ❌ W0 | ⬜ pending |
| 02-04/T3  | 02-04 | 3    | INF-06      | manual+script | `bash -n infra/scripts/backup-daily.sh && bash infra/scripts/backup-daily.sh --dry-run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Note on "File Exists ❌ W0":** Test files are intentionally absent at planning time and materialize during execution (Wave 0 scaffolds the e2e infrastructure; subsequent tasks fill in the suites per the TDD cycle in each plan). This is expected.

---

## Wave 0 Requirements

- [ ] `apps/backend/jest.e2e.config.ts` — e2e config (currently referenced by `package.json` but missing)
- [ ] `apps/backend/test/setup-e2e.ts` — `mongodb-memory-server` bootstrap + global teardown
- [ ] Install `mongodb-memory-server@^11`, `supertest@^7`, `@types/supertest`, `argon2@^0.44`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `nestjs-zod`, `@nestjs/event-emitter`, `cookie-parser`, `deep-object-diff` (versions per RESEARCH §Standard Stack)
- [ ] `apps/backend/test/auth/*.e2e-spec.ts` — stubs for AUTH-01/02/03/04
- [ ] `apps/backend/test/scripts/seed.e2e-spec.ts` — stubs for AUTH-05
- [ ] `apps/backend/test/esquemas/esquemas.e2e-spec.ts` — stubs for AUTH-08
- [ ] `apps/backend/src/**/*.spec.ts` — unit stubs for soft-delete plugin, ZodValidationPipe, ExceptionFilter, audit interceptor

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup llega a Google Drive | INF-06 | Requiere OAuth Drive del operador (no mockeable en CI sin credenciales reales) | 1) `rclone config` con cuenta despacho · 2) `bash scripts/backup.sh` · 3) Inspeccionar `gdrive:lexscribe-backups/YYYY-MM-DD/` en Drive web · 4) `rclone check` para verificar checksums |
| Refresh cookie marca `HttpOnly` y `SameSite=strict` end-to-end real | AUTH-02 | DevTools del navegador (Set-Cookie en respuesta real, no en supertest) | 1) `pnpm dev` · 2) Login en `/login` · 3) DevTools → Application → Cookies → comprobar flags `HttpOnly`, `Secure` (en https), `SameSite=Strict` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-01
