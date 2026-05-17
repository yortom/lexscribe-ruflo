---
phase: 02-auth-y-bases-transversales
plan: "01"
subsystem: auth
tags: [jwt, refresh-rotation, argon2, passport, mongoose, nestjs-11, e2e-tests]
dependency_graph:
  requires: [phase-01-bootstrap]
  provides: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, auth-module, jwt-strategy, usuarios-schema, login-page]
  affects: [all-future-plans-using-auth]
tech_stack:
  added:
    - "@nestjs/jwt@^11.0.2"
    - "@nestjs/passport@^11.0.5"
    - "passport@^0.7.0"
    - "passport-jwt@^4.0.1"
    - "argon2@^0.44.0"
    - "cookie-parser@^1.4.7"
    - "nestjs-zod@^4.3.1"
    - "@nestjs/mongoose@^11.0.4"
    - "mongoose@^9.5.0"
    - "mongodb-memory-server@^11.0.1 (devDep)"
    - "NestJS upgraded from ^10.4.0 to ^11.0.0"
  patterns:
    - JWT access token 15min (HS256, JWT_ACCESS_SECRET)
    - Opaque refresh token <userId>:<64hex> with argon2id hash stored in usuarios.refreshTokens[]
    - Reuse detection: userId prefix in token allows clearAllRefreshTokens even after rotation
    - Two-step rotate: $pull old then $push new (MongoDB 8 rejects combined ops on same array)
    - Cookie: HttpOnly, SameSite=strict, Path=/api/v1/auth, Max-Age=604800
key_files:
  created:
    - apps/backend/jest.e2e.config.ts
    - apps/backend/test/setup-e2e.ts
    - apps/backend/test/auth/login.e2e-spec.ts
    - apps/backend/test/auth/refresh.e2e-spec.ts
    - apps/backend/test/auth/logout.e2e-spec.ts
    - apps/backend/test/common/guards.e2e-spec.ts
    - apps/backend/src/common/types/jwt-payload.ts
    - apps/backend/src/common/decorators/current-user.decorator.ts
    - apps/backend/src/modules/usuarios/schemas/usuario.schema.ts
    - apps/backend/src/modules/usuarios/usuarios.repository.ts
    - apps/backend/src/modules/usuarios/usuarios.service.ts
    - apps/backend/src/modules/usuarios/usuarios.controller.ts
    - apps/backend/src/modules/usuarios/usuarios.module.ts
    - apps/backend/src/modules/auth/strategies/jwt.strategy.ts
    - apps/backend/src/modules/auth/guards/jwt-auth.guard.ts
    - apps/backend/src/modules/auth/dto/login.dto.ts
    - apps/backend/src/modules/auth/auth.service.ts
    - apps/backend/src/modules/auth/auth.controller.ts
    - apps/backend/src/modules/auth/auth.module.ts
    - packages/shared-validation/src/auth.ts
    - apps/frontend/lib/api/auth.ts
    - apps/frontend/lib/auth/session.ts
    - apps/frontend/app/(auth)/login/page.tsx
    - apps/frontend/middleware.ts
  modified:
    - apps/backend/package.json (NestJS 11 + auth deps)
    - apps/backend/src/app.module.ts (MongooseModule + AuthModule + UsuariosModule)
    - apps/backend/src/main.ts (cookie-parser registration)
    - apps/backend/tsconfig.json (declaration: false)
    - apps/backend/jest.config.ts (testRegex: .spec.ts only)
    - packages/shared-validation/src/index.ts (re-export auth)
    - .env.example (JWT_ACCESS_SECRET, SEED_USER_PASSWORD)
    - pnpm-lock.yaml
decisions:
  - "Refresh token format changed to <userId>:<hex> to enable reuse detection after rotation without DB scan"
  - "Two-step rotate ($pull + $push separate) required for MongoDB 8 (rejects combined ops on same array path)"
  - "declaration: false in backend tsconfig.json to avoid TS2742 with nestjs-zod createZodDto"
  - "jest.config.ts testRegex changed to .spec.ts only (e2e tests have own config with mongodb-memory-server)"
metrics:
  duration: "~2 hours"
  completed_date: "2026-05-02"
  tasks_completed: 3
  files_changed: 30
---

# Phase 2 Plan 01: Auth JWT Refresh Summary

JWT authentication end-to-end — NestJS 11 + argon2id + opaque refresh token rotation with reuse detection, JwtAuthGuard, @CurrentUser decorator, and Next.js login form.

## What Was Built

### Task 1 (Wave 0): NestJS 11 upgrade + auth deps + Jest e2e infra

Bumped all `@nestjs/*` packages from v10 to v11. Added auth dependencies (argon2, passport, nestjs-zod, mongoose, cookie-parser, mongodb-memory-server). Created `jest.e2e.config.ts` with `setupFilesAfterEnv` pointing to `test/setup-e2e.ts` which bootstraps `MongoMemoryServer`. Added stub e2e suites (`.skip`) for all 4 auth requirements. Registered `cookie-parser` in `main.ts`.

### Task 2 (7 sub-commits): Model + AuthModule + e2e suites

Sub-commit order as required:
1. `packages/shared-validation/src/auth.ts` + `index.ts` — LoginSchema with `.strict()`
2. `common/types/jwt-payload.ts` + `common/decorators/current-user.decorator.ts`
3. `usuarios/schemas/usuario.schema.ts` + `usuarios.repository.ts` + `usuarios.service.ts` + `usuarios.controller.ts` + `usuarios.module.ts`
4. `auth/strategies/jwt.strategy.ts` + `auth/guards/jwt-auth.guard.ts` + `auth/dto/login.dto.ts`
5. `auth/auth.service.ts` (login/refresh/logout + cookie helpers)
6. `auth/auth.controller.ts` + `auth/auth.module.ts` + `app.module.ts` wiring
7. Full e2e test suites (4 describes, 12 tests, all green)

### Task 3: Frontend login form + middleware

`lib/api/auth.ts` with `credentials: 'include'`. `lib/auth/session.ts` in-memory store (no localStorage). `app/(auth)/login/page.tsx` minimal Spanish form using LoginSchema. `middleware.ts` redirect non-auth → `/login` based on `refresh_token` cookie presence.

## Test Results

```
PASS test/health.e2e-spec.ts
PASS test/common/guards.e2e-spec.ts (AUTH-04)
PASS test/auth/logout.e2e-spec.ts (AUTH-03)
PASS test/auth/login.e2e-spec.ts (AUTH-01)
PASS test/auth/refresh.e2e-spec.ts (AUTH-02)
Tests: 12 passed, 12 total
```

## Implementation notes

> "Task 2 modifies 19 files but is internally cohesive (one bounded context: auth). Executor committed by sub-step (schema → strategy → service → controller → tests) for reviewability. See `<scope_note>` in plan for the 7-commit order."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Refresh token format changed from pure opaque to `<userId>:<hex>`**
- **Found during:** Task 2, e2e refresh reuse detection test
- **Issue:** Pure opaque tokens can't be traced to a user after rotation. `_findUserByRefreshToken` iterates all users' tokens, but once a token is rotated (removed from DB), it returns null — so `clearAllRefreshTokens` was never called for reuse attack.
- **Fix:** Changed token format to `<userId>:<64hex>`. The userId prefix allows finding the user even when the token is no longer in the DB, triggering `clearAllRefreshTokens`.
- **Files modified:** `apps/backend/src/modules/auth/auth.service.ts`
- **Commit:** dce9c54

**2. [Rule 1 - Bug] MongoDB 8 rejects simultaneous `$pull`+`$push` on same array field**
- **Found during:** Task 2, e2e refresh tests
- **Issue:** `rotateRefreshToken` used a single `findOneAndUpdate` with both `$pull` and `$push` on `refreshTokens`. MongoDB 8 returns "Updating the path 'refreshTokens' would create a conflict."
- **Fix:** Two-step rotate — separate `findOneAndUpdate` for `$pull` (with filter for atomicity), then `$push`.
- **Files modified:** `apps/backend/src/modules/usuarios/usuarios.repository.ts`
- **Commit:** dce9c54

**3. [Rule 1 - Bug] TS2742 with nestjs-zod `createZodDto` and `declaration: true`**
- **Found during:** Task 1/2, build phase
- **Issue:** TypeScript 5.x with `declaration: true` (from tsconfig.base.json) can't name the inferred type of `createZodDto` result because it references an internal `@nest-zod/z` path.
- **Fix:** Added `"declaration": false` to `apps/backend/tsconfig.json` — backend is an app not a library; declaration files are not needed.
- **Files modified:** `apps/backend/tsconfig.json`
- **Commit:** dce9c54

**4. [Rule 1 - Bug] `jest.config.ts` testRegex matched `.e2e-spec.ts` causing unit test runner to pick up e2e tests without MongoDB setup**
- **Found during:** Task 2 verification
- **Issue:** `.*\.(spec|e2e-spec)\.ts$` matched both unit and e2e. Running `pnpm test` (unit config, no MongoDB) failed on all e2e tests.
- **Fix:** Changed `jest.config.ts` to `.*\.spec\.ts$`; added `--passWithNoTests` since no unit tests exist yet. E2e tests only run via `pnpm test:e2e`.
- **Files modified:** `apps/backend/jest.config.ts`, `apps/backend/package.json`
- **Commit:** dce9c54

**5. [Rule 2 - Missing] Added `findAllWithRefreshTokens()` to UsuariosRepository**
- **Found during:** Task 2, implementing `_findUserByRefreshToken`
- **Issue:** AuthService needed to iterate users' tokens to find a match; accessing model directly would violate DDD boundaries.
- **Fix:** Added `findAllWithRefreshTokens()` method to repository.
- **Files modified:** `apps/backend/src/modules/usuarios/usuarios.repository.ts`
- **Commit:** dce9c54

## Known Stubs

None — all implemented features are fully wired. The login page works with real auth endpoints. The session is intentionally ephemeral (in-memory) as documented in the plan; persistence across reloads via refresh cookie is deferred to plan 02-04's seed + layout work.

## Self-Check: PASSED

All 9 key files verified as FOUND. All 9 commits (b069e0f, 077734d, c730e6a, 5bda149, 10ce671, 494f6e6, ab63792, dce9c54, 9047f33) verified as FOUND.
