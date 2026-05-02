---
phase: 02-auth-y-bases-transversales
plan: "04"
subsystem: esquemas-seed-backup
tags: [esquemas, seed, rclone, backup, mongoose, nestjs, e2e-tests, idempotent]
dependency_graph:
  requires: [02-01-auth-jwt, 02-02-bases-transversales]
  provides: [AUTH-05, AUTH-08, INF-06, esquemas-module, seed-script, backup-script]
  affects: [all-future-plans-using-esquemas, phase-03-contactos, phase-04-expedientes]
tech_stack:
  added:
    - "argon2 (already installed in 02-01, used in seed)"
    - "rclone (NAS host tool, no npm package)"
  patterns:
    - "EsquemaSchema Mongoose unique index {usuarioId,tipoObjeto} — no softDeletePlugin (DATOS §4.8)"
    - "$addToSet atomic idempotent parametro add with $ne guard"
    - "NestFactory.createApplicationContext for seed (no HTTP server)"
    - "runSeed() exported for e2e testability; process.exit only in __main__ path"
    - "rclone --dry-run validates script flow without touching Drive"
    - "DomainError subclass NotImplementedError (501) for post-MVP F-095"
key_files:
  created:
    - packages/shared-validation/src/esquemas.ts
    - apps/backend/src/modules/esquemas/schemas/esquema.schema.ts
    - apps/backend/src/modules/esquemas/dto/tipo-objeto.ts
    - apps/backend/src/modules/esquemas/dto/add-parametro.dto.ts
    - apps/backend/src/modules/esquemas/esquemas.repository.ts
    - apps/backend/src/modules/esquemas/esquemas.service.ts
    - apps/backend/src/modules/esquemas/esquemas.controller.ts
    - apps/backend/src/modules/esquemas/esquemas.module.ts
    - apps/backend/src/common/errors/not-implemented.error.ts
    - apps/backend/scripts/seed.ts
    - apps/backend/test/esquemas/esquemas.e2e-spec.ts
    - apps/backend/test/scripts/seed.e2e-spec.ts
    - infra/scripts/backup-daily.sh
    - infra/scripts/rclone.conf.example
  modified:
    - packages/shared-validation/src/index.ts (re-export esquemas)
    - apps/backend/src/common/errors/index.ts (export NotImplementedError)
    - apps/backend/src/app.module.ts (import EsquemasModule)
    - apps/backend/package.json (add seed script)
    - package.json (root: add pnpm seed)
    - infra/scripts/README.md (add backup section)
    - .env.example (add backup env vars commented)
decisions:
  - "TipoObjetoSchema.parse() inside handler + translate ZodError to ValidationError (DomainExceptionFilter maps to 400)"
  - "$addToSet with $ne guard: atomic idempotent add; null result means nombre exists (caller checks conflict vs same-tipoDato)"
  - "NotImplementedError extends DomainError with httpStatus=501 — consistent with DomainExceptionFilter pattern"
  - "runSeed() exported from scripts/seed.ts so e2e tests can call it without spawning a subprocess"
  - "Explicit Types.ObjectId conversion in repository (toObjectId helper) — Mongoose 9 does not auto-coerce strings for ObjectId fields in all query paths"
  - "POST /esquemas/:tipoObjeto/parametros returns 201 (NestJS default for @Post); plan says 200/201 — both acceptable"
  - "backup-daily.sh --dry-run prints [dry-run] prefix for every step; no external dependencies invoked"
metrics:
  duration: "~45min"
  completed_date: "2026-05-02"
  tasks_completed: 3
  files_changed: 18
---

# Phase 2 Plan 04: Seed + Esquemas + Backup Summary

Esquemas dinámico module (GET/POST/DELETE `expediente`/`contacto`), idempotent seed script (`pnpm seed`), and daily rclone backup to Google Drive — closing AUTH-05, AUTH-08, and INF-06.

## What Was Built

### Task 1: Módulo `esquemas` (AUTH-08)

**Shared validation** (`packages/shared-validation/src/esquemas.ts`):
- `TIPO_OBJETO = ['expediente', 'contacto']`, `TipoObjetoSchema`, `NombreParametroSchema`, `TipoDatoSchema`, `AddParametroSchema` (strict, with `.default()` on tipoDato and obligatorio).

**Mongoose schema** (`esquemas/schemas/esquema.schema.ts`):
- `usuarioId: ObjectId`, `tipoObjeto: String` (explicit `type: String` required by NestJS/Mongoose metadata), `parametros: []`.
- Compound unique index `{ usuarioId: 1, tipoObjeto: 1 }`. NO `softDeletePlugin` (DATOS §4.8).

**Repository** (`esquemas.repository.ts`):
- `findByUsuarioAndTipo` — explicit `toObjectId()` conversion to avoid string/ObjectId mismatch.
- `upsertEmpty` — `$setOnInsert` pattern with `returnDocument: 'after'`.
- `addParametro` — `$addToSet` with `'parametros.nombre': { $ne: dto.nombre }` guard (atomic idempotent).

**Service** (`esquemas.service.ts`):
- `getByTipo` → `NotFoundError` if missing.
- `addParametro` → atomic add; if null returned, fetches existing to check conflict vs idempotent.
- `deleteParametro` → `NotImplementedError` (501, post-MVP F-095).

**Controller** (`esquemas.controller.ts`):
- `@UseGuards(JwtAuthGuard)`, `@UseInterceptors(AuditInterceptor)`.
- `parseTipoObjeto` catches `ZodError` and translates to `ValidationError` → 400.
- `@Audited('esquema', 'create')` on POST handler.

**NotImplementedError** added to `common/errors/` with `httpStatus = 501`.

**8 e2e tests** (all green):
1. GET → 200 + empty parametros
2. POST adds parameter (201)
3. POST same body → idempotent, parametros.length === 1
4. Audit record written after POST (accion='create', recurso='esquema')
5. POST same nombre different tipoDato → 409 CONFLICT
6. GET /esquemas/factura → 400 VALIDATION
7. DELETE → 501 NOT_IMPLEMENTED
8. No Bearer → 401

### Task 2: Seed idempotente (AUTH-05)

**`apps/backend/scripts/seed.ts`** (exportable `runSeed()` function):
- `NestFactory.createApplicationContext(AppModule)` — no HTTP server.
- Reads `SEED_USER_EMAIL` + `SEED_USER_PASSWORD`; throws if missing (no `process.exit` inside `runSeed()`).
- Creates user with argon2id (`m=19456,t=2,p=1`) if not found; logs "skipping" if already exists (password NOT overwritten).
- `upsertEmpty` for each of `['expediente', 'contacto']`.
- `process.exit(1)` only in `require.main === module` branch.

**Scripts added:**
- `apps/backend/package.json`: `"seed": "ts-node -r tsconfig-paths/register scripts/seed.ts"`
- `package.json` (root): `"seed": "pnpm --filter backend seed"`

**4 e2e tests** (all green):
1. Creates 1 user + 2 esquemas with empty parametros
2. Second call: still 1 user + 2 esquemas (idempotent)
3. Re-run with different password: `passwordHash` unchanged
4. Missing `SEED_USER_EMAIL`: throws with descriptive message

### Task 3: Backup rclone (INF-06)

**`infra/scripts/backup-daily.sh`**:
- `set -euo pipefail` + `--dry-run` flag.
- Pre-flight: `rclone about gdrive:` (skipped in dry-run).
- Steps: `mkdir`, `mongodump --archive --gzip`, `rclone sync minio`, `rclone copy to Drive`.
- Retention: `find -mtime +7 -exec rm -rf` (local) + `rclone delete --min-age 30d` (remote).
- Post-upload size verification (skipped in dry-run).
- `bash infra/scripts/backup-daily.sh --dry-run` prints all `[dry-run]` steps and exits 0.

**`infra/scripts/rclone.conf.example`**: gdrive (OAuth) + minio (S3/MinIO) remotes without real secrets.

**`infra/scripts/README.md`**: extended with full backup section — pre-requisites, 7 installation steps, env var table, monthly verification, OAuth token expiry pitfall.

**`.env.example`**: backup env vars added (commented, NAS host only).

## Test Results

```
PASS test/esquemas/esquemas.e2e-spec.ts (8 passing)
PASS test/scripts/seed.e2e-spec.ts (4 passing)
All previous suites: 22 passing (unchanged)
Total: 34 passed, 34 total
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Explicit ObjectId conversion in EsquemasRepository**
- **Found during:** Task 1, first e2e run (GET returned 404 despite esquema existing in DB)
- **Issue:** Mongoose 9 does not auto-coerce string `_id` values to `ObjectId` in all `findOne` query paths when the field type is declared as `Types.ObjectId`. The JWT `sub` field is a string; the esquema was created with an ObjectId.
- **Fix:** Added `toObjectId(id: string | Types.ObjectId)` helper, applied to all three repository methods.
- **Files modified:** `apps/backend/src/modules/esquemas/esquemas.repository.ts`
- **Commit:** c8c5252

**2. [Rule 1 - Bug] `@Prop({ type: String, ... })` required for TipoObjeto field**
- **Found during:** Task 1, first test run
- **Issue:** `TipoObjeto` is a union type (`'expediente' | 'contacto'`). NestJS/Mongoose metadata reflection cannot determine the Mongoose type for union types without explicit `type` annotation.
- **Fix:** Added `type: String` to `@Prop` decorator.
- **Files modified:** `apps/backend/src/modules/esquemas/schemas/esquema.schema.ts`
- **Commit:** c8c5252

**3. [Rule 3 - Blocking] `findOneAndUpdate` `new` option deprecated; `returnDocument: 'after'` used**
- **Found during:** Task 1, test output (Mongoose deprecation warning)
- **Issue:** `upsertEmpty` used `{ new: true }` (deprecated in Mongoose 9). Repository methods updated to use `returnDocument: 'after'`.
- **Fix:** Replaced `new: true` with `returnDocument: 'after'` in `upsertEmpty` and `addParametro`.
- **Files modified:** `apps/backend/src/modules/esquemas/esquemas.repository.ts`
- **Commit:** c8c5252

**4. [Cosmetic] Test assertions accept 200 or 201 for POST parametros**
- **Found during:** Task 1, final test verification
- **Issue:** Plan states `200/201`, NestJS `@Post` defaults to 201. Tests updated to `expect([200, 201]).toContain(res.status)` rather than adding `@HttpCode(200)` (which would be non-standard for a creation endpoint).
- **Files modified:** `apps/backend/test/esquemas/esquemas.e2e-spec.ts`
- **Commit:** c8c5252

## Known Stubs

None — all three deliverables are fully wired and tested.

## Known gap (INF-06)

> **Known gap (INF-06):** "Real-Drive verification deferred to operator manual step per VALIDATION.md (rclone OAuth not testable in CI)."

The `backup-daily.sh --dry-run` validates script syntax and flow. The actual rclone OAuth handshake to Google Drive requires human action on the NAS (see `infra/scripts/README.md` steps 2-3). This is documented in STATE.md Pending Todos.

## Self-Check: PASSED

Key files verified as FOUND:
- `packages/shared-validation/src/esquemas.ts` — FOUND
- `apps/backend/src/modules/esquemas/esquemas.controller.ts` — FOUND
- `apps/backend/src/modules/esquemas/esquemas.service.ts` — FOUND
- `apps/backend/src/modules/esquemas/esquemas.repository.ts` — FOUND
- `apps/backend/src/modules/esquemas/schemas/esquema.schema.ts` — FOUND
- `apps/backend/src/common/errors/not-implemented.error.ts` — FOUND
- `apps/backend/scripts/seed.ts` — FOUND
- `apps/backend/test/esquemas/esquemas.e2e-spec.ts` — FOUND
- `apps/backend/test/scripts/seed.e2e-spec.ts` — FOUND
- `infra/scripts/backup-daily.sh` — FOUND
- `infra/scripts/rclone.conf.example` — FOUND
- `infra/scripts/README.md` — FOUND

Commits verified:
- `c8c5252` — feat(02-04): esquemas module — AUTH-08 — FOUND
- `f5a6723` — feat(02-04): seed idempotente — AUTH-05 — FOUND
- `ee40f3f` — feat(02-04): backup rclone — INF-06 — FOUND
