---
phase: 1
plan: "01-02"
subsystem: frontend
tags: [next.js, tailwind, vitest, typescript, standalone]
dependency_graph:
  requires: []
  provides: [frontend-skeleton, vitest-setup]
  affects: [01-05-ci-lint-test]
tech_stack:
  added: [next@14, tailwindcss@3, vitest@2, "@vitejs/plugin-react", "@testing-library/react", "@testing-library/jest-dom", jsdom]
  patterns: [App Router, standalone build, CSS utility-first, TDD smoke test]
key_files:
  created:
    - apps/frontend/.eslintrc.cjs
    - apps/frontend/postcss.config.mjs
    - apps/frontend/tailwind.config.ts
    - apps/frontend/app/globals.css
    - apps/frontend/.env.example
    - apps/frontend/vitest.config.ts
    - apps/frontend/vitest.setup.ts
    - apps/frontend/app/__tests__/page.test.tsx
  modified:
    - apps/frontend/package.json
    - apps/frontend/tsconfig.json
    - apps/frontend/next.config.mjs
    - apps/frontend/app/layout.tsx
    - apps/frontend/app/page.tsx
decisions:
  - "output: standalone set in next.config.mjs for Docker compatibility (INF-01)"
  - "Vitest + jsdom chosen over Jest per ARQUITECTURA.md section 2"
  - "tailwindcss moved to devDependencies per plan spec"
  - "Dropped extra runtime deps (tanstack-query, codemirror, zod) not required for skeleton MVP"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-27"
  tasks: 2
  files: 13
requirements_addressed: [INF-01, INF-03]
---

# Phase 1 Plan 02: Frontend skeleton — Next.js 14 App Router + Tailwind + Vitest Summary

## One-liner

Next.js 14 App Router skeleton with Tailwind CSS, standalone Docker output, and Vitest + Testing Library smoke test for the Lexscribe frontend.

## What Was Built

### T1 — Next.js 14 standalone + Tailwind structure

Created or rewrote all core frontend config files to match the plan spec exactly:

- `package.json` — `@lexscribe/frontend` with `next@^14.2.5`, `react@^18.3.1`, workspace protocol links to `@lexscribe/shared-types` and `@lexscribe/shared-validation`, plus dev deps for Tailwind, Vitest, Testing Library, and jsdom. Scripts include `dev`, `build`, `start`, `lint`, `type-check`, `test`, and `test:watch`.
- `tsconfig.json` — extends `../../tsconfig.base.json`, App Router `bundler` module resolution, Next.js plugin, `@/*` path alias.
- `next.config.mjs` — `output: 'standalone'` and `reactStrictMode: true` (transpilePackages removed to match plan spec).
- `.eslintrc.cjs` — `next/core-web-vitals` preset.
- `postcss.config.mjs` — Tailwind + autoprefixer plugins.
- `tailwind.config.ts` — scans `./app/**/*.{ts,tsx}` and `./components/**/*.{ts,tsx}`.
- `app/globals.css` — `@tailwind base/components/utilities` directives.
- `app/layout.tsx` — imports `globals.css`, sets `lang="es"`, exports metadata with title/description.
- `app/page.tsx` — `HomePage` with Tailwind utility classes and `<h1>Lexscribe</h1>`.
- `.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.

### T2 — Vitest + Testing Library + smoke test

- `vitest.config.ts` — jsdom environment, globals, `vitest.setup.ts` setup file, includes `app/**/*.test.{ts,tsx}` and `components/**/*.test.{ts,tsx}`, `@` alias resolved to package root.
- `vitest.setup.ts` — imports `@testing-library/jest-dom/vitest` for extended matchers.
- `app/__tests__/page.test.tsx` — smoke test that renders `HomePage` and asserts the `<h1>` contains "Lexscribe".

## Acceptance Criteria Results

### T1

| Criterion | Result |
|-----------|--------|
| `package.json` has `@lexscribe/frontend` | PASS |
| `next: "^14` in package.json | PASS |
| `workspace:*` protocol present | PASS |
| `output: 'standalone'` in next.config.mjs | PASS |
| `layout.tsx` has `lang="es"` | PASS |
| `page.tsx` has "Lexscribe" | PASS |
| `tailwind.config.ts` content paths correct | PASS |
| `app/globals.css` has `@tailwind base` | PASS |

### T2

| Criterion | Result |
|-----------|--------|
| `vitest.config.ts` has `environment: 'jsdom'` | PASS |
| `vitest.config.ts` has `setupFiles: ['./vitest.setup.ts']` | PASS |
| `vitest.setup.ts` imports `@testing-library/jest-dom/vitest` | PASS |
| `page.test.tsx` has `describe('HomePage'` | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rewrote existing package.json to match plan spec**
- **Found during:** T1
- **Issue:** The pre-existing `package.json` had `typecheck` instead of `type-check`, no `test:watch` script, runtime deps not in the plan spec (tanstack-query, react-hook-form, codemirror, zod), `tailwindcss` in dependencies instead of devDependencies, and missing `@vitejs/plugin-react` and `jsdom`.
- **Fix:** Replaced with exact plan spec content. Extra dependencies removed as plan specifies "no domain logic" skeleton only.
- **Files modified:** `apps/frontend/package.json`

**2. [Rule 1 - Bug] Removed transpilePackages from next.config.mjs**
- **Found during:** T1
- **Issue:** Pre-existing `next.config.mjs` had `transpilePackages` which is not in the plan spec.
- **Fix:** Replaced with exact plan spec — `output: 'standalone'` and `reactStrictMode: true` only.
- **Files modified:** `apps/frontend/next.config.mjs`

**3. [Rule 1 - Bug] Updated layout.tsx to import globals.css and match plan spec**
- **Found during:** T1
- **Issue:** Pre-existing `layout.tsx` imported from `next` instead of `react`, had different description text, and was missing the `globals.css` import.
- **Fix:** Replaced with exact plan spec — imports `./globals.css` and `ReactNode` from `react`.
- **Files modified:** `apps/frontend/app/layout.tsx`

**4. [Rule 1 - Bug] Updated page.tsx to include Tailwind utility classes**
- **Found during:** T1
- **Issue:** Pre-existing `page.tsx` had no Tailwind classes — plain `<main><h1>` without styling.
- **Fix:** Added `className="flex min-h-screen items-center justify-center p-8"` and `className="text-3xl font-bold"` per plan spec.
- **Files modified:** `apps/frontend/app/page.tsx`

## Known Stubs

None — this is a structural skeleton plan. The `HomePage` placeholder is intentional; it will be replaced by authenticated routes in later plans.

## Self-Check

- `apps/frontend/package.json` — FOUND
- `apps/frontend/tsconfig.json` — FOUND
- `apps/frontend/next.config.mjs` — FOUND
- `apps/frontend/.eslintrc.cjs` — FOUND
- `apps/frontend/postcss.config.mjs` — FOUND
- `apps/frontend/tailwind.config.ts` — FOUND
- `apps/frontend/app/globals.css` — FOUND
- `apps/frontend/app/layout.tsx` — FOUND
- `apps/frontend/app/page.tsx` — FOUND
- `apps/frontend/.env.example` — FOUND
- `apps/frontend/vitest.config.ts` — FOUND
- `apps/frontend/vitest.setup.ts` — FOUND
- `apps/frontend/app/__tests__/page.test.tsx` — FOUND

All 13 files verified present. All 12 acceptance criteria verified passing.

## Self-Check: PASSED
