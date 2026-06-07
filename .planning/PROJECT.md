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

### Phase 3 — Contactos (2026-05-18)

- **CONT-01** — Crear contacto persona física/jurídica con campos base + tipología (UI + backend)
- **CONT-02** — Listado con búsqueda por nombre/NIF y filtro por tipología, paginado
- **CONT-03** — Parámetro personalizado del contacto registrado en esquema dinámico de `contacto` al guardar
- **CONT-04** — Editar/soft-delete de contacto con auditoría
- **CONT-05** — Sección "Expedientes vinculados" en el detalle del contacto (stub en Phase 3, poblado real al cerrar en Phase 4)

### Phase 4 — Cláusulas y Expedientes (2026-05-31)

- **CLAU-01/02/03** — Biblioteca de cláusulas: crear/editar/borrar con texto y labels; búsqueda `$text` y filtro por label
- **EXPE-01..06** — Expedientes: crear con nombre + parámetros + fecha auto; asociar/desasociar contactos con rol (pareja contacto+rol única → 409); detalle tabbed con placeholders de documentos/fechas/facturación
- **CONT-05** (cerrado) — Vista inversa real: `ContactosService.getById` puebla `expedientesVinculados` vía `ExpedientesRepository` (forwardRef bidireccional)
- **Frontend** — Páginas Next.js cláusulas/expedientes con detalle tabbed y modal asociar contacto (tests Vitest de frontend + e2e backend)
- **Deuda técnica (04-04 diferido)** — Faltan unit tests backend de cláusulas/expedientes; cobertura actual vía e2e. Pendiente Phase 8 / SEC-06

### Phase 5 — Plantillas y Editor (2026-05-31)

- **PLAN-01..06** — Subida `.txt`/`.docx`/pegado → plantilla (texto plano + storagePath); detección automática de variables; declarar campos nuevos; editor CodeMirror 6 con highlight + panel en vivo; versionado por nuevo registro (anterior conservada)
- **CLAU-04** — Insertar cláusula desde biblioteca con renumeración automática (ordinales españoles)
- **SEC-06** (plantillas) — Cobertura ≥80% en parser de variables y versionado; thresholds enforced

### Phase 6 — Generación y Documentos (2026-06-03)

- **DOC-01** — Formulario de generación: variables agrupadas por `tipoObjeto`, pre-relleno desde expediente/contactos (`GeneracionForm` + `preRellenarFormulario`)
- **DOC-02** — Completitud bloqueante: backend lanza `ValidationError` si falta cualquier variable antes de render; frontend "Generar (faltan N)" + `RolFaltanteModal`
- **DOC-03** — Variables nuevas → `esquemas.addParametro` al generar (FL-13 entrada C); badge "nuevo" + selector de tipo (D-08)
- **DOC-04** — Render `.docx` vía `docxtemplater` (delimitadores `{{ }}` + parser dotted-path) → upload a MinIO. Bug de delimitadores encontrado en UAT y corregido (`af13eab`); regression test real en `generation.render.spec.ts`
- **DOC-05** — Descarga vía presigned URL (`getPresignedUrl`, 300 s)
- **DOC-06** — Subida de documentos preexistentes `.docx`/`.pdf`/`.txt` (validación por extensión)
- **DOC-07** — `datosCongelados` inmutable: snapshot JSON resuelto, sin referencia compartida; test explícito de inmutabilidad
- **EXPE-07** (cerrado) — `ExpedienteDetailResponse.documentos` poblado con documentos reales; pestaña Documentos con listado + descarga + subida

### Phase 7 — Calendario y Facturación (2026-06-07)

- **CAL-01** — "Añadir fecha" a documento → evento en `eventos` con `origen='documento'` + subtipo; visible en Fechas del expediente (FL-8 / `AnadirFechaModal`)
- **CAL-02** — Evento manual desde botón "+ Nuevo evento" con título, fechas, tipología y color (paleta de 8 presets en `EventoModal`)
- **CAL-03** — Listado filtrado para calendario (`soloCalendario`) + Fechas tab; filtros por expediente y rango de fechas
- **CAL-04** — Color por evento persistido y renderizado como punto en `/calendario` (react-calendar `tileContent`)
- **CAL-05** — Borrado controlado FL-9: `documentos.service.remove(uid, id, eventosAction)` conserva o elimina eventos asociados (`EventosModule` importado one-way; `BorrarDocumentoModal` conservar/eliminar con pre-conteo)
- **FAC-01..05** — `FacturacionModule` (colección `facturas`): facturación por expediente, entradas con `estado` default `pendiente` y `fecha` default hoy, actualización de estado dedicada, edición/borrado, total general + subtotales por estado vía agregado `$sum` (con guard `activo:true` + redondeo IEEE-754). Frontend `FacturacionTab`: tabla editable inline, dropdown de estado coloreado, recálculo en vivo de totales
- **Regresión cruzada corregida** — spec de `documentos.controller` actualizada para el tercer argumento `eventosAction` de FL-9 (capturada por el regression gate de Phase 7)

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

*Last updated: 2026-06-07 — Phase 7 complete (calendario con eventos auto/manuales + borrado controlado FL-9; facturación por expediente con totales y estados; CAL-01..05 + FAC-01..05 validados).*
