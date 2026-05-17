---
phase: 02-auth-y-bases-transversales
plan: "02"
subsystem: common-infrastructure
tags: [soft-delete, mongoose-plugin, domain-errors, exception-filter, zod-validation, nestjs, tdd]
dependency_graph:
  requires: [02-01-auth-jwt]
  provides: [AUTH-06, softDeletePlugin, DomainExceptionFilter, ZodValidationPipe-global, domain-error-classes]
  affects: [all-future-plans-using-mongoose-schemas, all-future-plans-using-http-errors]
tech_stack:
  added: []
  patterns:
    - softDeletePlugin Mongoose plugin (per-schema, not global)
    - DomainError abstract class + 4 typed subclasses (NotFound/Conflict/Validation/Unauthorized)
    - DomainExceptionFilter @Catch(DomainError) -> {code, message} HTTP response
    - ZodValidationPipe global via nestjs-zod (already installed in 02-01)
    - AUTH-06 reconciliation note: plugin delivered and tested in Phase 2; first productive application in Phase 3 (contactos schema)
key_files:
  created:
    - apps/backend/src/common/plugins/soft-delete.plugin.ts
    - apps/backend/src/common/errors/domain.error.ts
    - apps/backend/src/common/errors/not-found.error.ts
    - apps/backend/src/common/errors/conflict.error.ts
    - apps/backend/src/common/errors/validation.error.ts
    - apps/backend/src/common/errors/unauthorized.error.ts
    - apps/backend/src/common/errors/index.ts
    - apps/backend/src/common/filters/domain-exception.filter.ts
    - apps/backend/test/common/soft-delete.plugin.spec.ts
    - apps/backend/test/common/domain-exception.filter.spec.ts
    - apps/backend/test/common/zod-validation.e2e-spec.ts
  modified:
    - apps/backend/src/main.ts (added ZodValidationPipe + DomainExceptionFilter globals)
    - apps/backend/src/modules/auth/auth.service.ts (replaced UnauthorizedException with UnauthorizedError)
    - apps/backend/test/auth/login.e2e-spec.ts (added DomainExceptionFilter to test setup)
    - apps/backend/test/auth/refresh.e2e-spec.ts (added DomainExceptionFilter to test setup)
    - apps/backend/test/auth/logout.e2e-spec.ts (added DomainExceptionFilter to test setup)
    - apps/backend/test/common/guards.e2e-spec.ts (added DomainExceptionFilter to test setup)
decisions:
  - "softDeletePlugin applied per-schema (not mongoose.plugin globally) to avoid contaminating auditoria/esquemas schemas"
  - "DomainExceptionFilter excludes stack trace and statusCode from response body — only {code, message}"
  - "ValidationError details field only serialized in non-production NODE_ENV for debugging"
  - "All e2e test setups updated to include DomainExceptionFilter — required because UnauthorizedError is not NestJS HttpException"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 2
  files_changed: 15
---

# Phase 2 Plan 02: Bases Transversales Summary

Soft-delete Mongoose plugin + DomainError class hierarchy + DomainExceptionFilter global + ZodValidationPipe global + AuthService refactored to domain errors.

## AUTH-06 status

> "AUTH-06: Plugin `softDeletePlugin` implementado, exportado desde `apps/backend/src/common/plugins/soft-delete.plugin.ts`, unit-tested (6 aserciones cubriendo filter por defecto, escape hatch `withInactive`, marca `fechaInactivacion`). NO aplicado aún a ningún schema de negocio en este plan — la primera aplicación productiva ocurre en Phase 3 (módulo `contactos`), donde el filtrado se verifica end-to-end."

## What Was Built

### Task 1: Soft-delete plugin Mongoose + unit tests (TDD)

Implemented `softDeletePlugin(schema: Schema)` following the RESEARCH Pattern 3 literally:

- Adds `activo: Boolean = true` (indexed) and `fechaInactivacion: Date | null` fields to any schema it's applied to.
- Pre-hooks on 6 operations (`find`, `findOne`, `findOneAndUpdate`, `countDocuments`, `updateOne`, `updateMany`) inject `{activo: true}` filter unless `withInactive` option is set or `activo` is explicitly in the query.
- `schema.statics.softDelete(filter)` marks matching docs as `activo:false` + sets `fechaInactivacion`.
- Applied per-schema only (never `mongoose.plugin()`) as required by DATOS.md §4.8 (auditoria/esquemas excluded).

6 unit tests using `mongodb-memory-server` directly (not the e2e setup), all green:
1. Schema adds `activo` and `fechaInactivacion` fields
2. `find()` excludes soft-deleted docs; `softDelete()` marks correctly
3. `setOptions({withInactive:true})` escape hatch returns inactive docs
4. `softDelete` sets `fechaInactivacion` to a non-null Date
5. Explicit `{activo:false}` filter + `withInactive:true` finds the inactive doc
6. `countDocuments()` excludes inactives by default

### Task 2: DomainError hierarchy + DomainExceptionFilter + ZodValidationPipe + AuthService refactor (TDD)

**Error classes:**
- `DomainError` (abstract) — base with `code: string` and `httpStatus: number`
- `NotFoundError` — 404, `{code:'NOT_FOUND', message:'<resource> <id> not found'}`
- `ConflictError` — 409, `{code:'CONFLICT', message}`
- `ValidationError` — 400, `{code:'VALIDATION', message}`, optional `details` (only in non-prod)
- `UnauthorizedError` — 401, `{code:'UNAUTHORIZED', message}`
- `common/errors/index.ts` exports all with JSDoc HTTP codes

**DomainExceptionFilter** (`@Catch(DomainError)`):
- Maps any `DomainError` subclass to `ex.httpStatus` with body `{code, message}`
- No `stack` trace, no `statusCode`, no PII
- `ValidationError.details` only included when `NODE_ENV !== 'production'`
- 4 unit tests: NotFoundError→404, ConflictError→409, ValidationError→400, UnauthorizedError→401

**Global registration in main.ts:**
```ts
app.useGlobalPipes(new ZodValidationPipe());
app.useGlobalFilters(new DomainExceptionFilter());
```

**AuthService refactored:** all `UnauthorizedException` (NestJS) replaced with `UnauthorizedError` (domain). Since the body shape changes from `{statusCode, message, error}` to `{code, message}`, all 4 e2e test setups (login, refresh, logout, guards) updated to include `DomainExceptionFilter` in the `createNestApplication()` bootstrap.

**ZodValidationPipe e2e:** POST `/api/v1/auth/login` with extra field returns 400; invalid email returns 400.

## Test Results

```
PASS test/common/soft-delete.plugin.spec.ts (6 passing)
PASS test/common/domain-exception.filter.spec.ts (4 passing)
PASS test/common/zod-validation.e2e-spec.ts (2 passing)
PASS test/auth/login.e2e-spec.ts (4 passing)
PASS test/auth/refresh.e2e-spec.ts (2 passing)
PASS test/auth/logout.e2e-spec.ts (1 passing)
PASS test/common/guards.e2e-spec.ts (3 passing)
Tests: 22 passed, 22 total (full e2e suite)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added DomainExceptionFilter to all existing e2e test setups**
- **Found during:** Task 2, e2e verification
- **Issue:** The existing auth e2e tests (`login`, `refresh`, `logout`, `guards`) bootstrap the app manually without reading `main.ts`. After refactoring AuthService to use `UnauthorizedError` (not NestJS `HttpException`), those tests would get 500 instead of 401 because the default NestJS exception filter doesn't catch domain errors.
- **Fix:** Added `app.useGlobalFilters(new DomainExceptionFilter())` to each of the 4 existing e2e setups. The `body.message` assertions in login tests still pass because the message content is unchanged; only the body shape gains a `code` field.
- **Files modified:** `test/auth/login.e2e-spec.ts`, `test/auth/refresh.e2e-spec.ts`, `test/auth/logout.e2e-spec.ts`, `test/common/guards.e2e-spec.ts`
- **Commit:** 2c26e78

## Known Stubs

None — all deliverables are fully wired and tested. The soft-delete plugin is intentionally not applied to business schemas in this plan (AUTH-06 scope note above); this is by design, not a stub.

## Self-Check: PASSED

Key files verified as FOUND:
- `apps/backend/src/common/plugins/soft-delete.plugin.ts` — FOUND
- `apps/backend/src/common/errors/domain.error.ts` — FOUND
- `apps/backend/src/common/errors/index.ts` — FOUND
- `apps/backend/src/common/filters/domain-exception.filter.ts` — FOUND
- `apps/backend/src/main.ts` (with ZodValidationPipe + DomainExceptionFilter) — FOUND
- `apps/backend/src/modules/auth/auth.service.ts` (UnauthorizedError) — FOUND

Commits verified:
- `c535720` — feat(02-02): softDeletePlugin + 6 unit tests — FOUND
- `2c26e78` — feat(02-02): DomainError + filter + ZodValidationPipe + auth refactor — FOUND
