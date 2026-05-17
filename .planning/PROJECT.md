# Lexscribe — Project Charter

> Documento ejecutivo. Es el punto de entrada al `.planning/`. La fuente de verdad funcional/datos/arquitectura vive en `docs/`. Aquí solo se registra **qué milestone está activo, qué requisitos están vigentes y qué decisiones se han cerrado**.

---

## What This Is

**Lexscribe** es una plataforma web para automatizar la creación y gestión de documentos legales tipo (contratos, escritos, cláusulas) en un despacho de abogados. El usuario carga plantillas con variables `{{objeto.campo}}`, las combina con datos de expedientes y contactos, y la plataforma genera el documento final en `.docx`. Cada caso se gestiona como un **expediente** que agrupa documentos, contactos vinculados, fechas en calendario y seguimiento de facturación.

**Para quién:** abogado/a único en su despacho. **MVP mono-usuario.**

## Core Value

Eliminar el trabajo repetitivo de redactar documentos legales rellenando manualmente los mismos campos. Una plantilla bien hecha + un expediente bien fichado = documento final en segundos, con trazabilidad total y datos congelados al generar.

## Documentos fuente de verdad

Todos los detalles (features, modelo de datos, stack) viven en `docs/`. **No duplicar contenido aquí**, solo apuntar.

| Documento | Fuente de verdad para |
|-----------|------------------------|
| [`docs/FUNCIONAL.md`](../docs/FUNCIONAL.md) | Features `F-XXX`, flujos `FL-N`, sintaxis de variables, fuera de alcance. |
| [`docs/DATOS.md`](../docs/DATOS.md) | Colecciones MongoDB, índices, snapshots, soft-delete, esquema dinámico. |
| [`docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md) | Stack, despliegue, CI/CD, cifrado, auditoría, seed. |

Cada `REQ-ID` de `REQUIREMENTS.md` referencia explícitamente las `F-XXX` que cubre.

---

## Current Milestone: v1.0 MVP

**Goal:** Tener una plataforma operativa end-to-end donde el abogado pueda crear plantillas, gestionar contactos/expedientes/cláusulas, generar documentos `.docx` con datos reales, llevar calendario y facturación, todo desplegado en el NAS del despacho.

**Target features:**
- Gestión completa del ciclo `plantilla → expediente con contactos → documento generado .docx`.
- Biblioteca de cláusulas reutilizables con inserción y renumeración.
- Calendario con eventos automáticos desde documentos + eventos manuales.
- Facturación por expediente con estados (pendiente/facturado/cobrado).
- Esquema dinámico de variables (`expediente`, `contacto`).
- Subida de documentos preexistentes (`.docx`/`.pdf`/`.txt`) sin pasar por plantilla.
- Auth JWT mono-usuario, cifrado AES-GCM en PII fiscal, log de auditoría inmutable.
- Despliegue en NAS con Docker Compose y backup automático a Google Drive.

**Fuera del MVP:** edición/regeneración de documentos generados (F-080), cálculo automático de fechas por reglas (F-031), multi-usuario, salida en PDF, multi-idioma, módulo contable completo, firma electrónica, integraciones externas, condicionales en plantillas.

---

## Stack (resumido — detalle en ARQUITECTURA.md)

- **Frontend:** Next.js 14 (App Router) + React + Tailwind + shadcn/ui + TanStack Query + React Hook Form + Zod + CodeMirror 6.
- **Backend:** NestJS + Mongoose + Pino + Passport (JWT + refresh) + Zod.
- **Datos:** MongoDB 8.x + MinIO (S3-compatible).
- **Infra:** Docker Compose en NAS + Nginx (TLS) + rclone → Google Drive.
- **CI/CD:** GitHub Actions (PR / staging / prod).
- **Generación `.docx`:** `docxtemplater` (core MIT) + `docx` (npm) para conversión txt/pegado.
- **Lenguajes runtime:** TypeScript end-to-end. Node 22 LTS, pnpm 9.x, monorepo `pnpm workspaces`.

---

## Active Requirements

Vigentes para esta milestone v1.0. Detalle completo en [REQUIREMENTS.md](REQUIREMENTS.md).

Categorías: `INF` (infraestructura) · `AUTH` (auth + transversales) · `CONT` (contactos) · `CLAU` (cláusulas) · `EXPE` (expedientes) · `PLAN` (plantillas) · `DOC` (documentos/generación) · `CAL` (calendario) · `FAC` (facturación) · `SEC` (seguridad/hardening).

## Validated Requirements

### Phase 2 — Auth y Bases Transversales (2026-05-02)

- **INF-06** — Backup diario rclone → Google Drive operativo (`infra/scripts/backup-daily.sh`; real-Drive upload requiere paso manual del operador en NAS)
- **AUTH-01** — Login email/password → JWT 15 min + refresh cookie 7 d con argon2id
- **AUTH-02** — Refresh rotativo: nuevo token, viejo invalidado, reuse detection (clearAllRefreshTokens)
- **AUTH-03** — Logout invalida el refresh token en servidor
- **AUTH-04** — `@CurrentUser()` inyecta `usuarioId` desde JWT; DTOs con `.strict()` rechazan `usuarioId` en body
- **AUTH-05** — `pnpm seed` idempotente: 1 usuario + 2 esquemas vacíos; no sobrescribe password
- **AUTH-06** — `softDeletePlugin` aplicado a `usuario.schema.ts`; plugin unit-tested (6 aserciones); Phase 3 aplica a `contactos`
- **AUTH-07** — `auditoria` asíncrona (setImmediate) con `AuditInterceptor` + `@Audited` + listeners EventEmitter para create/update/delete/link/unlink/generate/login/logout
- **AUTH-08** — Módulo `esquemas` con GET/POST/DELETE por `tipoObjeto`; `$addToSet` atómico; auditoría integrada

## Out of Scope

Ver `docs/FUNCIONAL.md §7` y `REQUIREMENTS.md` sección "Out of Scope". Las exclusiones explícitas se mantienen sincronizadas con esa sección.

## Key Decisions

Decisiones cerradas (cualquier cambio aquí debe registrarse en el changelog de los `docs/*.md` correspondientes):

- **Mono-usuario en MVP** — `usuarios` collection preparada para multi-usuario, pero un solo registro activo.
- **Idioma:** UI en español, API en inglés (mensajes/errores), traducción centralizada en `lib/i18n/errors.ts`.
- **Salida `.docx` únicamente** en MVP. PDF post-MVP.
- **Sintaxis de variables:** `{{objeto.campo}}` (doble llave). Ver `FUNCIONAL.md §5.2`.
- **Detección automática** de variables vía regex sobre el texto. Sin marcado manual.
- **Documentos generados son inmutables** — `datosCongelados` (snapshot JSON) garantiza independencia ante cambios posteriores.
- **Plantillas versionadas por nuevo registro** (no in-place). Documentos referencian la versión exacta.
- **Soft-delete universal** (`activo`/`fechaInactivacion`). Excepción: `auditoria`.
- **Editor:** CodeMirror 6 con highlight `{{...}}` y validación en vivo.
- **Storage:** MinIO en NAS, S3-compatible. Backup `rclone` → Google Drive cron diario.
- **Auth:** JWT (15 min) + refresh httpOnly cookie (7 d) con rotación.
- **Cifrado en 3 capas:** volumen NAS + TLS + AES-256-GCM en `documentacionFiscal` y `documentoIdentidad`.
- **Auditoría inmutable** desde MVP — colección `auditoria` con interceptor NestJS.
- **Validación a nivel aplicación** (no JSON Schema en Mongo) — el esquema dinámico es runtime.

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-03 — Phase 2 complete (auth + bases transversales, 9/9 requirements satisfied).*
