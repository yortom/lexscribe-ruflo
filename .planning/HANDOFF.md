# Lexscribe — Handoff

**Fecha:** 2026-05-18
**Milestone:** v1.0 MVP
**Branch activo:** `claude/vigilant-wiles-01d4d4`

---

## Estado actual

| Métrica | Valor |
|---------|-------|
| Fases completadas | 3 / 8 |
| Planes completados | 12 / 12 (fase 03 completa) |
| Fase activa | **04 — Cláusulas y Expedientes** (planificada, lista para ejecutar) |
| Plan activo | — |

---

## Fases

| # | Nombre | Estado | Fecha |
|---|--------|--------|-------|
| 1 | Bootstrap de infraestructura | ✅ Completa | 2026-04-27 |
| 2 | Auth y bases transversales | ✅ Completa | 2026-05-02 |
| 3 | Contactos | ✅ Completa | 2026-05-18 |
| 4 | Cláusulas y Expedientes | ⏰ Pendiente | — |
| 5 | Plantillas y Editor | ⏰ Pendiente | — |
| 6 | Generación y Documentos | ⏰ Pendiente | — |
| 7 | Calendario y Facturación | ⏰ Pendiente | — |
| 8 | Hardening | ⏰ Pendiente | — |

---

## Fase 03 — Contactos (en curso)

### Planes

| Plan | Descripción | Estado |
|------|-------------|--------|
| 03-01 | Backend NestJS contactos (schema, repo, service, controller, e2e) | ✅ Completo |
| 03-02 | Frontend contactos (páginas, componentes, cliente HTTP) | ✅ Completo |
| 03-03 | Unit tests módulo contactos (≥80% cobertura) | ✅ Completo — 87.31% líneas, 96.15% funciones |

### Qué se hizo en 03-01 (backend)
- `ContactoSchema` Mongoose con soft-delete, índices text + partial unique + compuesto
- `ContactosRepository` con soft-delete, paginación, búsqueda full-text
- `ContactosService` con integración a `EsquemasService` para parámetros dinámicos (CONT-03)
- `ContactosController` con `JwtAuthGuard` + `AuditInterceptor`
- DTOs Zod compartidos en `@lexscribe/shared-validation` y tipos en `@lexscribe/shared-types`
- Suite e2e completa: CONT-01..05, soft-delete, auditoría

### Qué se hizo en 03-02 (frontend) — pendiente checkpoint
- `apps/frontend/app/providers.tsx` — QueryClientProvider client component
- `apps/frontend/app/(app)/layout.tsx` — layout protegido con redirect a `/login` si no hay sesión
- `apps/frontend/lib/api/contactos.ts` — cliente HTTP tipado (`credentials: 'include'`, ApiError class)
- `apps/frontend/components/contactos/ContactoForm.tsx` — RHF + zodResolver con CreateContactoSchema
- `apps/frontend/components/contactos/ContactoTable.tsx` — tabla paginada con búsqueda + filtro tipología
- `apps/frontend/components/contactos/ParametrosEditor.tsx` — campo dinámico clave-valor (CONT-03 UI)
- `apps/frontend/app/(app)/contactos/page.tsx` — listado con useQuery
- `apps/frontend/app/(app)/contactos/nuevo/page.tsx` — formulario crear con useMutation
- `apps/frontend/app/(app)/contactos/[id]/page.tsx` — detalle/edit + sección "Expedientes vinculados" stub (Phase 4)
- Vitest tests: 14/14 verdes (`ContactoForm.test.tsx`, `ContactoTable.test.tsx`)
- Fix de dependencias: `@hookform/resolvers` bajado a v3.x (compatible con zod v3 del proyecto)

### 03-03 — Qué se hizo (unit tests)
- `jest.config.ts` — `coverageThreshold` configurado para `src/modules/contactos/` (lines/functions/statements: 80%, branches: 70%)
- `contactos.repository.spec.ts` — 14 tests: create, findById (happy + 404), findAll (paginación + filtros), softDelete, update, schema pre-hook coverage via kareem internals
- `contactos.service.spec.ts` — 10 tests: create happy, ConflictError NIF duplicado, parámetros dinámicos → addParametro llamado por clave, findAll, findOne (happy + NotFoundError), update, remove
- `contactos.controller.spec.ts` — 6 tests: POST/GET-list/GET-id/PATCH/DELETE + guard activo vía Reflect.getMetadata
- **Cobertura:** 87.31% líneas · 86.92% statements · 96.15% funciones · 71.66% branches

---

## Decisiones técnicas clave acumuladas

| Decisión | Motivo |
|----------|--------|
| Refresh token formato `<userId>:<hex>` | Permite reuse detection sin DB scan |
| `declaration: false` en backend tsconfig | Evita TS2742 con nestjs-zod |
| `softDeletePlugin` solo por schema (nunca global) | `auditoria`/`esquemas` excluidos según DATOS.md §4.8 |
| `returnDocument: 'after'` en lugar de `{new:true}` | Mongoose v9 depreca `{new:true}` |
| `@hookform/resolvers` v3.x (no v5.x) | v5 importa zod/v4/core incompatible con zod v3 del proyecto |
| `credentials: 'include'` en todas las llamadas API | JWT via cookie httpOnly, no header Bearer |
| Zod errors en inglés en UI (MVP) | i18n pendiente — documentado como deuda técnica en 03-02 SUMMARY |

---

## Pendientes de configuración (usuario)

- Configurar secrets en GitHub para CI/CD: `NAS_STAGING_WEBHOOK_URL`, `NAS_STAGING_WEBHOOK_TOKEN`, `NAS_PROD_WEBHOOK_URL`, `NAS_PROD_WEBHOOK_TOKEN`
- Ejecutar `./infra/scripts/generate-self-signed-cert.sh` antes del primer `docker compose up`
- `cp .env.example .env` y rellenar secretos
- `pnpm seed` (con Mongo arriba) para crear usuario + esquemas iniciales
- `rclone config` en NAS para configurar remote `gdrive`

---

## Próximos pasos

1. **Ahora:** `/gsd:execute-phase 4` — ejecutar Wave 1 (04-01 backend cláusulas + 04-02 backend expedientes en paralelo)
2. **Fase 04 — planes listos:**
   - `04-01` (Wave 1, autonomous) — Backend cláusulas: schema + softDelete + `$text` index + repo + service + controller + Zod DTOs + e2e
   - `04-02` (Wave 1, autonomous) — Backend expedientes: embedded `contactos[{contactoId,rol}]` + link/unlink + eventos `expedientes.linked/unlinked` + **cierre CONT-05 via forwardRef**
   - `04-03` (Wave 2, **UAT checkpoint**) — Frontend: páginas cláusulas + expedientes con tabs (Contactos, Parámetros, Documentos/Fechas/Facturación placeholder)
   - `04-04` (Wave 3, autonomous) — Unit tests ≥80% cobertura para ambos módulos

### Decisiones técnicas de Phase 4 (de 04-RESEARCH.md)

- **Modelo M:N contacto↔expediente**: embedded array `contactosVinculados[{contactoId, rol}]` en expediente (no collection separada)
- **Unicidad `(contactoId, rol)`**: validada en aplicación (MongoDB no soporta unique en sub-array), lanza `ConflictError` → 409
- **Dependencia circular** ContactosModule ↔ ExpedientesModule resuelta con `forwardRef`
- **Eventos auditoría**: `expedientes.linked` / `expedientes.unlinked` (capturados por wildcard `*.linked`/`*.unlinked`)
- **Búsqueda full-text cláusulas**: índice `$text` Mongoose sobre `nombre`+`texto`
- **Labels cláusulas**: normalizados a lowercase via Zod `.transform`
- **Placeholders detalle expediente**: `documentos:[]` / `fechas:[]` / `facturacion:[]` con texto exacto `"Disponible en Phase 6/7"` para Phases 6 y 7
