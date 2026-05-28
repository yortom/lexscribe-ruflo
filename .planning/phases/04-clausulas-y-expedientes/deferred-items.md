# Deferred Items — Phase 04

Out-of-scope discoveries logged during execution. NOT fixed in the originating plan.

## From plan 04-01 (backend-clausulas)

### Pre-existing e2e failure: `auth/login.e2e-spec.ts` — refresh cookie Path mismatch

- **Discovered during:** plan 04-01 full e2e regression run (2026-05-28).
- **Test:** `AUTH-01 login › returns 200 with accessToken and cookie on valid credentials` (line 74).
- **Symptom:** test expects `Set-Cookie` `refresh_token` to have `Path=/api/v1/auth` (regex `/Path=\/api\/v1\/auth/i`), but the auth controller currently sets `Path=/`.
- **Scope:** Belongs to the `auth` module (last modified in `a591619` / test in `1f3d2b2`), which predates plan 04-01. Plan 04-01 only added the `clausulas` module + shared schemas/types + an `AppModule` import line — none of which touch the refresh-token cookie.
- **Action:** NOT fixed here (out of scope per executor SCOPE BOUNDARY). All 24 clausulas e2e tests pass; the other 11 suites (75 tests) pass. Only this 1 pre-existing auth test fails.
- **Suggested owner:** a future auth/maintenance plan should reconcile either the cookie `Path` (controller) or the test expectation.
