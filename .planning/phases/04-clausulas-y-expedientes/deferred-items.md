# Deferred Items — Phase 04

Out-of-scope discoveries logged during execution. NOT fixed in the originating plans.

## Pre-existing e2e failure: `auth/login.e2e-spec.ts` — refresh cookie Path mismatch

- **Discovered during:** plan 04-01 and 04-02 full e2e regression runs (2026-05-28). Reported independently by both executors.
- **Test:** `AUTH-01 login › returns 200 with accessToken and cookie on valid credentials` (line 74).
- **Symptom:** test expects `Set-Cookie` `refresh_token` to have `Path=/api/v1/auth` (regex `/Path=\/api\/v1\/auth/i`), but the auth controller currently sets `Path=/`.
- **Scope:** Belongs to the `auth` module (`apps/backend/src/modules/auth/`), which predates Phase 04. Neither plan 04-01 (clausulas) nor 04-02 (expedientes + CONT-05) touches the refresh-token cookie. Fails in isolation, independent of Phase 04 work. Likely a leftover from deploy-hardening change (`25aaa5e fix(deploy): harden runtime configuration`).
- **Action:** NOT fixed here (out of scope per executor SCOPE BOUNDARY). All clausulas (24) and expedientes (28+) e2e tests pass; only this 1 pre-existing auth test fails.
- **Suggested owner:** a future auth/maintenance plan should reconcile either the cookie `Path` (controller/service) or the test expectation.
