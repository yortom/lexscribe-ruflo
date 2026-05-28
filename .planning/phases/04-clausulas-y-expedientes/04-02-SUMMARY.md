---
phase: 04-clausulas-y-expedientes
plan: 02
subsystem: backend-expedientes
tags: [nestjs, mongoose, expedientes, link-contacto, forwardRef, audit, CONT-05]
requires:
  - ContactosModule (ContactosRepository)
  - EsquemasModule (EsquemasService.addParametro)
  - AuditoriaModule (AuditListener *.linked / *.unlinked)
  - AuthModule (JwtAuthGuard)
provides:
  - ExpedientesModule (CRUD + link/unlink contactos)
  - ExpedientesRepository (findByContactoId, push/pullContacto)
  - GET /contactos/:id expedientesVinculados real (CONT-05 cerrado)
affects:
  - ContactosService.getById (ahora puebla expedientesVinculados)
  - ContactosModule (forwardRef ExpedientesModule)
  - app.module (registra ExpedientesModule)
tech-stack:
  added: []
  patterns:
    - "forwardRef bidireccional ContactosModule <-> ExpedientesModule"
    - "Validación unicidad (contactoId,rol) en aplicación -> ConflictError 409 (no unique index sub-array)"
    - "Eventos dominio expedientes.linked / expedientes.unlinked -> AuditListener wildcard"
    - "minimize:false para serializar parametros:{} vacío"
key-files:
  created:
    - packages/shared-validation/src/expedientes.ts
    - packages/shared-types/src/expediente.ts
    - apps/backend/src/modules/expedientes/schemas/expediente.schema.ts
    - apps/backend/src/modules/expedientes/expedientes.repository.ts
    - apps/backend/src/modules/expedientes/expedientes.service.ts
    - apps/backend/src/modules/expedientes/expedientes.controller.ts
    - apps/backend/src/modules/expedientes/expedientes.module.ts
    - apps/backend/src/modules/expedientes/dto/create-expediente.dto.ts
    - apps/backend/src/modules/expedientes/dto/update-expediente.dto.ts
    - apps/backend/src/modules/expedientes/dto/query-expediente.dto.ts
    - apps/backend/src/modules/expedientes/dto/link-contacto.dto.ts
    - apps/backend/test/expedientes/expedientes.e2e-spec.ts
  modified:
    - packages/shared-validation/src/index.ts
    - packages/shared-types/src/index.ts
    - apps/backend/src/modules/contactos/contactos.module.ts
    - apps/backend/src/modules/contactos/contactos.service.ts
    - apps/backend/src/app.module.ts
    - apps/backend/test/contactos/contactos.e2e-spec.ts
decisions:
  - "forwardRef en ambos módulos: ExpedientesModule importa ContactosModule (ContactosRepository para validar contacto en link); ContactosModule importa forwardRef(ExpedientesModule) (ExpedientesRepository para CONT-05). @Inject(forwardRef()) en ContactosService."
  - "Eventos renombrados a expedientes.linked / expedientes.unlinked (terminan exactamente en .linked/.unlinked) para que el wildcard *.linked del AuditListener los capture. link/unlink NO usan @Audited."
  - "rol con espacios soportado: controller usa decodeURIComponent; frontend debe usar encodeURIComponent."
  - "minimize:false en ExpedienteSchema para que parametros:{} vacío se persista y serialice (contrato detail EXPE)."
metrics:
  duration: ~10min
  completed: 2026-05-28
  tasks: 3
  files: 17
---

# Phase 4 Plan 02: Backend Expedientes + Cierre CONT-05 Summary

Módulo NestJS `expedientes` con array embebido `contactos[{contactoId,rol}]`, endpoints CRUD + link/unlink con unicidad (contactoId,rol)→409 y eventos auditados; cierra el stub CONT-05 poblando `expedientesVinculados` real en `ContactosService.getById` vía `forwardRef`.

## What Was Built

- **Zod schemas + tipos compartidos** (`shared-validation`, `shared-types`): CreateExpediente / UpdateExpediente / QueryExpediente / LinkContacto + Expediente / ExpedienteDetailResponse / ContactoVinculado. Ambos packages recompilados a `dist/`.
- **ExpedientesModule completo**: schema (embedded `ContactoVinculado` + 3 índices: text, `contactos.contactoId`, `usuarioId/activo/fecha` + softDeletePlugin), repository (`findByContactoId`, `pushContacto`, `pullContacto`, CRUD soft-delete), service (link/unlink con validación de existencia + unicidad, eventos, parámetros dinámicos vía `EsquemasService`), controller (CRUD + `POST/DELETE :id/contactos`), module (forwardRef ContactosModule).
- **CONT-05 cerrado**: `ContactosService.getById` inyecta `ExpedientesRepository` (`@Inject(forwardRef(...))`) y devuelve `expedientesVinculados: [{_id, nombre, rol}]` real. Comentario "stub" eliminado.
- **Placeholders EXPE-06/07**: `getById` devuelve `documentos:[]` y `fechas:[]`.
- **Tests e2e**: 28 tests en `expedientes.e2e-spec.ts` (EXPE-01..07, audit link/unlink, duplicate 409, 404, rol con espacio, soft-delete) + nuevo test CONT-05 en `contactos.e2e-spec.ts` con vínculo real.

## Requirements Addressed

EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07 — y cierre definitivo de CONT-05 (vista inversa real).

## Verification

- `pnpm --filter @lexscribe/backend lint` → 0 errores
- `pnpm --filter @lexscribe/backend build` → exit 0
- `pnpm exec jest --config jest.e2e.config.ts --testPathPattern="(expedientes|contactos)"` → **43/43 passed** (2 suites)
- Full e2e suite: **76/77 passed** (1 fallo pre-existente fuera de alcance — ver abajo)
- AppModule arranca sin error de DI circular (verificado vía esquemas + contactos + expedientes e2e que bootean AppModule).

## Commits

- `140b726` feat(04-02): Zod schemas + shared types Expediente/LinkContacto
- `181c146` feat(04-02): ExpedientesModule + cierre CONT-05 vía forwardRef
- `0ceab0e` test(04-02): e2e expedientes + audit link/unlink + CONT-05 real

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tipado estricto de `sort` en repository**
- **Found during:** Task 2 (`nest build`).
- **Issue:** `const sort: Record<string, unknown>` no era asignable al parámetro de `.sort()` de Mongoose (TS2345).
- **Fix:** tipado a `Record<string, { $meta: 'textScore' } | -1>`.
- **Files modified:** `apps/backend/src/modules/expedientes/expedientes.repository.ts`
- **Commit:** `181c146`

**2. [Rule 1 - Bug] `parametros:{}` vacío no se serializaba**
- **Found during:** Task 3 (e2e EXPE-01 y EXPE-06/07).
- **Issue:** Mongoose con `type: Object, default: {}` minimiza objetos vacíos, devolviendo `parametros: undefined`. Rompía el contrato del detalle (`parametros{}`).
- **Fix:** `minimize: false` en `@Schema` de Expediente.
- **Files modified:** `apps/backend/src/modules/expedientes/schemas/expediente.schema.ts`
- **Commit:** `0ceab0e`

### Out-of-Scope (Deferred)

**auth/login.e2e-spec.ts — cookie `Path` mismatch (1 test fallando)**
- El test espera `Path=/api/v1/auth` pero la cookie refresh_token se emite con `Path=/`. Pertenece al módulo AUTH (`apps/backend/src/modules/auth/`), no tocado por este plan; falla en aislamiento independiente de expedientes. Registrado en `04-clausulas-y-expedientes/deferred-items.md`. Probable secuela de `25aaa5e fix(deploy): harden runtime configuration`.

### Infra note

- El worktree no tenía `node_modules` ni los docs de fase 04. Se hizo `git merge --ff-only claude/vigilant-wiles-01d4d4` (descendiente lineal) para traer los PLAN/RESEARCH, y `pnpm install --frozen-lockfile --ignore-scripts` (un postinstall de opencollective crasheaba en Windows; ignorar scripts no afecta a la build).

## Auth Gates

None.

## Known Stubs

- `documentos:[]` y `fechas:[]` en `GET /expedientes/:id` son placeholders **intencionales** del plan (EXPE-06 → Phase 7 calendario; EXPE-07 → Phase 6 documentos). El contrato JSON ya expone los campos vacíos para no romper la UI cuando lleguen. No bloquean el objetivo del plan.

## Self-Check: PASSED

- Archivos verificados (5/5 FOUND): service, schema, e2e-spec, shared-validation, SUMMARY.
- Commits verificados (3/3 FOUND): 140b726, 181c146, 0ceab0e.
