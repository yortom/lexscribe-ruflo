---
phase: 02-auth-y-bases-transversales
plan: "03"
subsystem: auditoria
tags: [nestjs-event-emitter, mongoose, audit-interceptor, deep-object-diff, tdd, e2e-tests]
dependency_graph:
  requires: [phase-01-bootstrap, 02-01-auth-jwt-refresh]
  provides: [AUTH-07, auditoria-module, audit-interceptor, audited-decorator, audit-listener]
  affects: [all-future-modules-needing-audit-logging]
tech_stack:
  added:
    - "@nestjs/event-emitter@^3.1.0"
    - "deep-object-diff@^1.1.9"
  patterns:
    - "Hybrid audit: AuditInterceptor for CRUD via @Audited decorator, AuditListener for domain events"
    - "AuditoriaService.writeAsync uses setImmediate for non-blocking audit persistence"
    - "EventEmitterModule.forRoot(wildcard:true) enables *.linked/*.unlinked/*.generated patterns"
    - "Auth events: AuthService emits auth.login/auth.logout via EventEmitter2 after success"
    - "Audit payload contract: {usuarioId, recurso, recursoId, contexto, ip, userAgent}"
key_files:
  created:
    - apps/backend/src/modules/auditoria/types.ts
    - apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts
    - apps/backend/src/modules/auditoria/auditoria.repository.ts
    - apps/backend/src/modules/auditoria/auditoria.service.ts
    - apps/backend/src/modules/auditoria/auditoria.module.ts
    - apps/backend/src/modules/auditoria/decorators/audited.decorator.ts
    - apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts
    - apps/backend/src/modules/auditoria/listeners/audit.listener.ts
    - apps/backend/test/auditoria/interceptor.e2e-spec.ts
    - apps/backend/test/auditoria/events.e2e-spec.ts
    - apps/backend/test/auditoria/auth-events.e2e-spec.ts
  modified:
    - apps/backend/package.json (event-emitter + deep-object-diff)
    - apps/backend/src/app.module.ts (EventEmitterModule + AuditoriaModule)
    - apps/backend/src/modules/auth/auth.service.ts (EventEmitter2 injection + emit login/logout)
    - apps/backend/src/modules/auth/auth.controller.ts (pass ip/userAgent to logout)
    - apps/backend/src/common/plugins/soft-delete.plugin.ts (TS2769 type fix)
    - pnpm-lock.yaml
decisions:
  - "interceptor.spec.ts renamed to interceptor.e2e-spec.ts because it requires MongoMemoryServer — unit jest config uses .*\\.spec\\.ts$ which would fail without DB setup"
  - "AuditListener @OnEvent handlers use { async: true } to avoid blocking the event emitter"
  - "Audit payload contract standardized in AuditListener JSDoc: all event emitters must use {usuarioId, recurso, recursoId, contexto, ip?, userAgent?}"
  - "auth.login emitted after pushRefreshToken success (not before) to avoid audit on failed logins"
  - "refresh operation NOT audited — only login/logout are explicit user actions (refresh is operational)"
metrics:
  duration: "~45 min"
  completed_date: "2026-05-02"
  tasks_completed: 2
  files_changed: 15
---

# Phase 2 Plan 03: Auditoria Summary

Hybrid audit system — NestJS EventEmitter wildcard + AuditInterceptor (CRUD) + AuditListener (domain events) + AuthService emitting login/logout, all persisted asynchronously to an immutable `auditoria` collection.

## What Was Built

### Task 1: Schema + Service + Module + EventEmitter integration

Installed `@nestjs/event-emitter@^3.1.0` and `deep-object-diff@^1.1.9`. Created:
- `AuditoriaRecord` type and `AuditAccion` union
- `Auditoria` Mongoose schema (collection: `auditoria`, no soft-delete, timestamps:false) with 3 indexes: `{recurso,recursoId,timestamp:-1}`, `{usuarioId,timestamp:-1}`, `{timestamp:-1}`
- `AuditoriaRepository` with single `create()` method
- `AuditoriaService.writeAsync()` using `setImmediate` for non-blocking writes
- `AuditoriaModule` wiring all providers, exporting `AuditoriaService`
- `AppModule` updated with `EventEmitterModule.forRoot({wildcard:true, delimiter:'.'})` and `AuditoriaModule`

Also fixed pre-existing TS2769 type error in `soft-delete.plugin.ts` (blocking build, Rule 3).

### Task 2 (TDD): Interceptor + Decorator + Listener + Auth Events

**RED:** Wrote 3 failing test files covering all scenarios.

**GREEN:** Implemented:
- `@Audited(recurso, accion, opts)` decorator with `AUDIT_KEY` metadata and optional `diffBefore`/`contexto` extractors
- `AuditInterceptor` using `Reflector` + `tap()` RxJS operator — writes audit only on success (tap after stream completes), calculates `cambios` via `deep-object-diff` for update actions
- `AuditListener` with 5 `@OnEvent({async:true})` handlers: `*.linked`, `*.unlinked`, `*.generated`, `auth.login`, `auth.logout`
- `AuthService` updated to inject `EventEmitter2` and emit `auth.login`/`auth.logout` after successful operations

## Event Payload Contract

All modules emitting audit events MUST follow this shape (documented in `AuditListener` JSDoc):

```typescript
interface AuditEventPayload {
  usuarioId: string | null;   // from JWT / auth context
  recurso: string;            // entity name: 'expediente', 'contacto', 'usuario'
  recursoId: string | null;   // entity primary ID
  contexto: Record<string, unknown> | null;  // domain-specific extra data
  ip?: string | null;
  userAgent?: string | null;
}
```

Usage pattern for future modules:
```typescript
// Link event
this.eventEmitter.emit('expediente.linked', {
  usuarioId, recurso: 'expediente', recursoId: expedienteId,
  contexto: { contactoId, rol }, ip, userAgent
});

// CRUD via decorator
@Audited('expediente', 'create')
async create(@Body() dto, @CurrentUser('id') uid) { ... }
```

## Test Results

```
Unit tests (jest.config.ts):
  PASS test/common/domain-exception.filter.spec.ts
  PASS test/common/soft-delete.plugin.spec.ts
  Tests: 10 passed, 10 total

E2E tests (jest.e2e.config.ts):
  PASS test/auditoria/interceptor.e2e-spec.ts
  PASS test/auditoria/events.e2e-spec.ts
  PASS test/auditoria/auth-events.e2e-spec.ts
  PASS test/common/zod-validation.e2e-spec.ts
  PASS test/common/guards.e2e-spec.ts
  PASS test/auth/login.e2e-spec.ts
  PASS test/auth/refresh.e2e-spec.ts
  PASS test/auth/logout.e2e-spec.ts
  PASS test/health.e2e-spec.ts
  Tests: 22 passed, 22 total
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TS2769 type error in soft-delete.plugin.ts**
- **Found during:** Task 1, build verification
- **Issue:** `schema.pre(op as Parameters<typeof schema.pre>[0], function (this: Query<...>)...)` overload mismatch with Mongoose 9 types
- **Fix:** Changed to explicit union type `ReadOp`, used `schema.pre<Query<unknown, unknown>>(op, function() {...})` syntax, extracted `schema.statics['softDelete']` bracket notation
- **Files modified:** `apps/backend/src/common/plugins/soft-delete.plugin.ts`
- **Commit:** 64da6f8

**2. [Rule 1 - Bug] interceptor.spec.ts renamed to interceptor.e2e-spec.ts**
- **Found during:** Task 2 verification
- **Issue:** Unit jest config (`.*\.spec\.ts$`) matched `interceptor.spec.ts` which needs MongoMemoryServer — test suite failed without DB
- **Fix:** Renamed to `interceptor.e2e-spec.ts` so it runs under e2e config only
- **Files modified:** `apps/backend/test/auditoria/interceptor.e2e-spec.ts` (was `.spec.ts`)
- **Commit:** 1e55a22

## Known Stubs

None — auditoria module is fully wired. All events reach the DB. Tests verify the full write path.

## Self-Check: PASSED

Files verified as FOUND:
- apps/backend/src/modules/auditoria/types.ts
- apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts
- apps/backend/src/modules/auditoria/auditoria.service.ts
- apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts
- apps/backend/src/modules/auditoria/decorators/audited.decorator.ts
- apps/backend/src/modules/auditoria/listeners/audit.listener.ts

Commits verified: 64da6f8, 9a3f355, 1e55a22 — all FOUND in git log.
