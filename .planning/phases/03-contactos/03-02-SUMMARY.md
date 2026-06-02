---
phase: 03-contactos
plan: "02"
subsystem: frontend
tags: [frontend, contactos, react-query, react-hook-form, zod, crud, uat-passed]
dependency_graph:
  requires:
    - 03-01  # backend contactos API (CONT-01..05 endpoints)
  provides:
    - UI-CONT-01  # create contacto form
    - UI-CONT-02  # tipologia selector + validation
    - UI-CONT-03  # ParametrosEditor dynamic key-value
    - UI-CONT-04  # table with search + filter + pagination
    - UI-CONT-05  # expedientes vinculados stub section
  affects:
    - 04-01  # Phase 4 will populate expedientesVinculados section
tech_stack:
  added:
    - "@tanstack/react-query@5.100.9"
    - "@tanstack/query-core@5.100.9 (explicit — required for pnpm node_modules resolution)"
    - "@tanstack/react-query-devtools@5.100.9"
    - "react-hook-form@7.75.0"
    - "@hookform/resolvers@3.10.0 (pinned to v3 — v5 requires zod v4, project uses zod v3)"
  patterns:
    - "QueryClientProvider via Providers client component in (app)/layout.tsx"
    - "React Hook Form + zodResolver(CreateContactoSchema) for form validation"
    - "TanStack Query useQuery/useMutation for server state"
    - "ParametrosEditor: controlled dynamic key-value rows with inline validation"
    - "Auth guard: server component cookies().has('refresh_token') → redirect('/login')"
key_files:
  created:
    - apps/frontend/app/providers.tsx
    - apps/frontend/app/(app)/layout.tsx
    - apps/frontend/lib/api/contactos.ts
    - apps/frontend/components/contactos/ContactoForm.tsx
    - apps/frontend/components/contactos/ContactoTable.tsx
    - apps/frontend/components/contactos/ParametrosEditor.tsx
    - apps/frontend/app/(app)/contactos/page.tsx
    - apps/frontend/app/(app)/contactos/nuevo/page.tsx
    - "apps/frontend/app/(app)/contactos/[id]/page.tsx"
    - apps/frontend/__tests__/contactos/ContactoForm.test.tsx
    - apps/frontend/__tests__/contactos/ContactoTable.test.tsx
    - apps/frontend/__tests__/contactos/ParametrosEditor.test.tsx
    - apps/frontend/__tests__/contactos/NuevoContactoPage.test.tsx
    - apps/frontend/__tests__/contactos/ContactoDetailPage.test.tsx
  modified:
    - apps/frontend/package.json
    - pnpm-lock.yaml
decisions:
  - "@hookform/resolvers pinned to v3.x — v5 imports zod/v4/core incompatible with project's zod v3 schemas"
  - "@tanstack/query-core added as explicit frontend dep — pnpm isolated node_modules does not auto-hoist it from react-query internals into frontend resolution scope"
  - "Next.js 14: params is synchronous (not a Promise) — params: { id: string }, no use(params) needed"
  - "Auth strategy: in-memory accessToken (session.ts) + httpOnly refresh_token cookie — layout guards check cookie presence server-side"
  - "Zod errors left in English for MVP — zodResolver messages come from Zod internals; i18n deferred (see Known Stubs)"
metrics:
  duration: ~45min
  completed: "2026-05-18"
  tasks: 3
  files: 15
---

# Phase 03 Plan 02: Frontend Contactos Summary

**One-liner:** React Query + RHF + Zod CRUD UI for contactos with dynamic ParametrosEditor, auth-aware layout, and 5-scenario UAT approved.

## What Was Built

Three fully functional contactos pages wired to the CONT-01..05 backend API:

- `/contactos` — paginated table with 300ms-debounced search and tipologia filter
- `/contactos/nuevo` — create form with React Hook Form + Zod validation + dynamic params
- `/contactos/[id]` — detail/edit page with mutation feedback and expedientesVinculados stub

Supporting infrastructure established for all future frontend phases:

- `app/providers.tsx` — `QueryClientProvider` client wrapper
- `app/(app)/layout.tsx` — server-component auth guard (checks `refresh_token` cookie) + Providers
- `lib/api/contactos.ts` — typed HTTP client with JWT-via-header + cookie refresh retry on 401
- Three reusable components: `ContactoForm`, `ContactoTable`, `ParametrosEditor`
- 14 Vitest tests passing across 6 test files

## Dependency Versions Installed

| Package | Version | Notes |
|---------|---------|-------|
| `@tanstack/react-query` | 5.100.9 | Server state management |
| `@tanstack/query-core` | 5.100.9 | Explicit dep — see Deviations |
| `@tanstack/react-query-devtools` | 5.100.9 | Dev overlay |
| `react-hook-form` | 7.75.0 | Form state |
| `@hookform/resolvers` | 3.10.0 | Zod ↔ RHF bridge — pinned to v3, see Deviations |
| `next` | 14.2.35 | Frontend framework |

## Key Decisions

### Auth Strategy (Cookie Name)

The backend sets a `refresh_token` httpOnly cookie on login (confirmed in `apps/backend/src/modules/auth/auth.service.ts` line 180: `res.cookie('refresh_token', ...)`). The `(app)/layout.tsx` server component guards using `cookies().has('refresh_token')`.

The access token is stored in-memory via `lib/auth/session.ts` (`let accessToken`). The `lib/api/contactos.ts` client sends it as `Authorization: Bearer <token>` header and retries with a cookie-based refresh on 401.

### Next.js Version and Params Pattern

Project uses **Next.js 14.2.35**. In Next.js 14, route `params` is a plain synchronous object — `{ params: { id: string } }`. The `use(params)` pattern (for Next.js 15's async params) was NOT used. The detail page is:

```tsx
export default function ContactoDetailPage({ params }: { params: { id: string } }) {
  const { id } = params; // synchronous — Next.js 14
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Downgraded @hookform/resolvers from v5.2.2 to v3.10.0**

- **Found during:** Task 0 verification (`pnpm --filter frontend build`)
- **Issue:** `@hookform/resolvers@5.x` imports `zod/v4/core` at runtime. The project uses Zod v3 (`^3.23.0` in shared-validation). Next.js build failed with `Module not found: Can't resolve 'zod/v4/core'`.
- **Fix:** Downgraded `@hookform/resolvers` to `^3.10.0` (last major version compatible with Zod v3). Updated `package.json` and re-ran `pnpm install`.
- **Files modified:** `apps/frontend/package.json`, `pnpm-lock.yaml`
- **Commit:** `803cae3`

**2. [Rule 2 - Missing dep] Added @tanstack/query-core as explicit frontend dependency**

- **Found during:** Task 0 verification (`pnpm --filter frontend build`)
- **Issue:** pnpm's isolated `node_modules` mode does not hoist `@tanstack/query-core` (a direct dependency of `@tanstack/react-query`) into `apps/frontend/node_modules/@tanstack/`. Next.js webpack resolver could not find it, producing `Module not found: Can't resolve '@tanstack/query-core'`.
- **Fix:** Added `"@tanstack/query-core": "5.100.9"` explicitly to `apps/frontend/package.json` dependencies, which causes pnpm to symlink it directly in the frontend's `@tanstack/` folder.
- **Files modified:** `apps/frontend/package.json`, `pnpm-lock.yaml`
- **Commit:** `803cae3`

## UAT Results — All 5 Scenarios Approved

UAT was performed on 2026-05-18 by the project owner. All scenarios passed.

| Scenario | Requirement | Result |
|----------|-------------|--------|
| 1 — Crear contacto cliente con NIF | CONT-01 + CONT-02 | PASSED |
| 2 — Añadir parámetro dinámico `profesion` | CONT-03 | PASSED |
| 3 — Búsqueda por nombre + filtro tipología + paginación | CONT-04 | PASSED |
| 4 — Sección "Expedientes vinculados" stub visible | CONT-05 | PASSED |
| 5 — Soft-delete: contacto eliminado no aparece en listado | soft-delete | PASSED |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Zod error messages in English | `apps/frontend/components/contactos/ContactoForm.tsx` | `zodResolver` passes Zod's built-in English messages directly to the UI (e.g., "String must contain at least 1 character(s)"). A future iteration should map Zod error codes to Spanish strings. This is a UI/i18n deferred task, not a functional blocker. |
| `expedientesVinculados` always empty | `apps/frontend/app/(app)/contactos/[id]/page.tsx` | Backend returns `[]` until Phase 4 implements the expedientes module. The section displays an explanatory placeholder message referencing Phase 4. |

## Self-Check: PASSED

- `apps/frontend/app/providers.tsx` — FOUND
- `apps/frontend/app/(app)/layout.tsx` — FOUND
- `apps/frontend/lib/api/contactos.ts` — FOUND
- `apps/frontend/components/contactos/ContactoForm.tsx` — FOUND
- `apps/frontend/components/contactos/ContactoTable.tsx` — FOUND
- `apps/frontend/components/contactos/ParametrosEditor.tsx` — FOUND
- `apps/frontend/app/(app)/contactos/page.tsx` — FOUND
- `apps/frontend/app/(app)/contactos/nuevo/page.tsx` — FOUND
- `apps/frontend/app/(app)/contactos/[id]/page.tsx` — FOUND
- Commits `0879e4a`, `217753b`, `f34cbe1`, `803cae3` — FOUND in git log
- Build: `pnpm --filter frontend build` exits 0 — VERIFIED
- Tests: 14/14 Vitest tests pass — VERIFIED
