---
phase: 2
slug: auth-y-bases-transversales
status: draft
nyquist_compliant: false
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD     | 02-01 | 1   | AUTH-01     | e2e       | `pnpm --filter backend test:e2e -- auth.e2e-spec` | ❌ W0 | ⬜ pending |
| TBD     | 02-01 | 1   | AUTH-02     | e2e       | `pnpm --filter backend test:e2e -- auth.e2e-spec` | ❌ W0 | ⬜ pending |
| TBD     | 02-01 | 1   | AUTH-03     | e2e       | `pnpm --filter backend test:e2e -- auth.e2e-spec` | ❌ W0 | ⬜ pending |
| TBD     | 02-01 | 1   | AUTH-04     | unit+e2e  | `pnpm --filter backend test -- current-user` | ❌ W0 | ⬜ pending |
| TBD     | 02-02 | 2   | (transversal) | unit    | `pnpm --filter backend test -- soft-delete` | ❌ W0 | ⬜ pending |
| TBD     | 02-03 | 2   | AUTH-08     | unit+e2e  | `pnpm --filter backend test -- audit` | ❌ W0 | ⬜ pending |
| TBD     | 02-04 | 3   | AUTH-05     | e2e       | `pnpm --filter backend test:e2e -- seed.e2e-spec` | ❌ W0 | ⬜ pending |
| TBD     | 02-04 | 3   | AUTH-06,07  | e2e       | `pnpm --filter backend test:e2e -- esquemas.e2e-spec` | ❌ W0 | ⬜ pending |
| TBD     | 02-04 | 3   | INF-06      | manual+script | `bash scripts/backup.sh --dry-run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/jest.e2e.config.ts` — e2e config (currently referenced by `package.json` but missing)
- [ ] `apps/backend/test/setup-e2e.ts` — `mongodb-memory-server` bootstrap + global teardown
- [ ] Install `mongodb-memory-server@^11`, `supertest@^7`, `@types/supertest`, `argon2@^0.44`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `nestjs-zod`, `@nestjs/event-emitter`, `cookie-parser`, `deep-object-diff` (versions per RESEARCH §Standard Stack)
- [ ] `apps/backend/test/auth.e2e-spec.ts` — stubs for AUTH-01/02/03/04
- [ ] `apps/backend/test/seed.e2e-spec.ts` — stubs for AUTH-05
- [ ] `apps/backend/test/esquemas.e2e-spec.ts` — stubs for AUTH-06/07
- [ ] `apps/backend/src/**/*.spec.ts` — unit stubs for soft-delete plugin, ZodValidationPipe, ExceptionFilter, audit interceptor

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup llega a Google Drive | INF-06 | Requiere OAuth Drive del operador (no mockeable en CI sin credenciales reales) | 1) `rclone config` con cuenta despacho · 2) `bash scripts/backup.sh` · 3) Inspeccionar `gdrive:lexscribe-backups/YYYY-MM-DD/` en Drive web · 4) `rclone check` para verificar checksums |
| Refresh cookie marca `HttpOnly` y `SameSite=strict` end-to-end real | AUTH-02 | DevTools del navegador (Set-Cookie en respuesta real, no en supertest) | 1) `pnpm dev` · 2) Login en `/login` · 3) DevTools → Application → Cookies → comprobar flags `HttpOnly`, `Secure` (en https), `SameSite=Strict` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
