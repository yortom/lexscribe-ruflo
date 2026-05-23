# Roadmap: Lexscribe — v1.0 MVP

## Overview

8 fases secuenciales que llevan la plataforma desde cero hasta un sistema operativo en NAS del despacho. Las primeras dos fases construyen los cimientos (monorepo, infra, auth). Las fases 3-7 implementan los módulos de dominio en orden de dependencia. La fase 8 cierra con cifrado de PII, observabilidad y tests E2E completos de los 13 flujos de usuario.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3…): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Bootstrap de infraestructura** - Monorepo, docker-compose, CI/CD verde — Completed 2026-04-27
- [x] **Phase 2: Auth y bases transversales** - Login, seed, audit, soft-delete, esquemas, backup — Completed 2026-05-02
- [ ] **Phase 3: Contactos** - CRUD contactos con esquema dinámico
- [ ] **Phase 4: Cláusulas y Expedientes** - Biblioteca de cláusulas + expedientes con contactos asociados
- [ ] **Phase 5: Plantillas y Editor** - Crear/editar plantillas con detección automática y CodeMirror 6
- [ ] **Phase 6: Generación y Documentos** - Generar .docx end-to-end + subida de documentos preexistentes
- [ ] **Phase 7: Calendario y Facturación** - Eventos auto/manuales y facturación por expediente
- [ ] **Phase 8: Hardening** - Cifrado AES, Sentry, E2E de los 13 flujos

## Phase Details

### Phase 1: Bootstrap de infraestructura
**Goal**: Tener el monorepo arrancando localmente y desplegando automáticamente al NAS, sin lógica de dominio aún.
**Depends on**: Nothing (first phase)
**Requirements**: [INF-01, INF-02, INF-03, INF-04, INF-05]
**Success Criteria** (what must be TRUE):
  1. `pnpm install` desde la raíz instala frontend y backend; `pnpm dev` arranca ambos
  2. `docker compose up` levanta frontend, backend, mongodb, minio, nginx y se accede a la app vía HTTPS
  3. `GET /api/v1/health` y `GET /api/v1/health/ready` responden 200
  4. Un PR contra `main` ejecuta lint + type-check + tests + build sin fallar
  5. Un merge a `main` despliega automáticamente al NAS de staging con la nueva versión
**Plans**: TBD

Plans:
- [x] 01-01: Monorepo init — pnpm workspaces + shared packages + tooling base
- [x] 01-02: Frontend skeleton — Next.js 14 App Router + Tailwind + Vitest
- [x] 01-03: Backend skeleton — NestJS + Pino + Terminus health endpoints + Jest
- [x] 01-04: Docker Compose + Nginx + Dockerfiles para frontend y backend
- [x] 01-05: GitHub Actions — pr.yml + deploy-staging.yml + deploy-prod.yml

### Phase 2: Auth y bases transversales
**Goal**: Login funcional, registro de auditoría operativo, soft-delete activo, esquema dinámico disponible y backup automatizado.
**Depends on**: Phase 1
**Requirements**: [INF-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08]
**Success Criteria** (what must be TRUE):
  1. El usuario hace login, recibe JWT (15 min) y refresh cookie (7 d); el refresh rota al usarlo
  2. Endpoints protegidos sin token → 401; con token inyectan `usuarioId` nunca desde body
  3. `pnpm seed` crea usuario + esquemas vacíos de forma idempotente
  4. Crear/editar/borrar cualquier recurso genera registro en `auditoria` con accion, recursoId, cambios, timestamp
  5. Backup diario de MinIO + Mongo a Google Drive verificable inspeccionando Drive
  6. Endpoints `/api/v1/esquemas/:tipoObjeto` CRUD operativos para `expediente` y `contacto`
**Plans**: 4 plans

Plans:
- [x] 02-01-auth-jwt-refresh-PLAN.md — Módulo auth NestJS (Wave 0 setup, usuarios+refresh tokens, JWT+rotación, @CurrentUser, login UI Next.js) — Completed 2026-05-02
- [x] 02-02-bases-transversales-PLAN.md — Soft-delete plugin Mongoose, ZodValidationPipe global, DomainExceptionFilter con errores tipados — Completed 2026-05-02
- [x] 02-03-auditoria-PLAN.md — Auditoría híbrida: AuditInterceptor + EventEmitter listeners + auth.login/logout events — Completed 2026-05-02
- [x] 02-04-seed-esquemas-backup-PLAN.md — Módulo esquemas (CRUD) + pnpm seed idempotente + rclone backup-daily.sh — Completed 2026-05-02

### Phase 3: Contactos
**Goal**: El usuario puede gestionar la base de contactos completa con sus parámetros personalizados.
**Depends on**: Phase 2
**Requirements**: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05]
**Success Criteria** (what must be TRUE):
  1. UI crear contacto persona física/jurídica con campos base + tipología funciona
  2. Añadir parámetro personalizado al contacto lo registra en esquema dinámico de `contacto` tras guardar
  3. Listado con búsqueda por nombre/NIF y filtro por tipología, paginado
  4. Detalle de contacto incluye sección "Expedientes vinculados" (se puebla tras Phase 4)
  5. Tests unitarios + integración del módulo `contactos` ≥ 80% cobertura
**Plans**: TBD

Plans:
- [x] 03-01: Módulo NestJS contactos + Mongoose schema + DTOs + repository con soft-delete
- [ ] 03-02: Frontend: página de contactos (listado + búsqueda) y formulario crear/editar con tipología y parámetros dinámicos
- [ ] 03-03: Tests unitarios e integración del módulo contactos

### Phase 4: Cláusulas y Expedientes
**Goal**: Biblioteca de cláusulas reutilizables operativa + gestión de expedientes con asociación de contactos. Sin generación todavía.
**Depends on**: Phase 3
**Requirements**: [CLAU-01, CLAU-02, CLAU-03, EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07]
**Success Criteria** (what must be TRUE):
  1. Sección Cláusulas: crear/editar/borrar cláusulas con texto y labels; búsqueda y filtro por label
  2. Sección Expedientes: crear expediente con nombre, parámetros personalizados, fecha auto
  3. Asociar/desasociar contactos con rol libre; pareja contacto+rol única (error legible si duplicado)
  4. Detalle expediente: contactos, parámetros, lista documentos vacía, fechas vacía, facturación vacía (placeholders)
  5. Desde un contacto se ven sus expedientes vinculados
**Plans**: 4 plans

Plans:
- [ ] 04-01-backend-clausulas-PLAN.md — Módulo NestJS clausulas (schema + softDelete + $text index + repo + service + controller + DTOs + e2e CLAU-01..03)
- [ ] 04-02-backend-expedientes-PLAN.md — Módulo NestJS expedientes (schema embedded contactos[] + link/unlink + forwardRef cierre CONT-05 + e2e EXPE-01..07)
- [ ] 04-03-frontend-clausulas-expedientes-PLAN.md — Páginas Next.js cláusulas + expedientes con detalle tabbed + modal asociar contacto + UAT humano
- [ ] 04-04-tests-clausulas-expedientes-PLAN.md — Unit tests Jest ≥80% cobertura per-módulo + jest.config.ts coverageThreshold

### Phase 5: Plantillas y Editor
**Goal**: El usuario puede crear plantillas a partir de archivo o pegado, ver las variables detectadas y declarar campos nuevos. Cláusulas insertables con renumeración.
**Depends on**: Phase 4
**Requirements**: [PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, CLAU-04]
**Success Criteria** (what must be TRUE):
  1. Subida .txt, .docx o pegado texto produce plantilla con contenido (texto plano) y storagePath (.docx)
  2. Detección automática variables con regex; tipos desconocidos → error bloqueante; campos nuevos → declarar en esquema
  3. Editor CodeMirror 6 con highlight variables + panel lateral variables en vivo
  4. Insertar cláusula desde biblioteca respeta orden y renumera automáticamente
  5. Editar y guardar plantilla → nueva versión activa; anterior → inactiva pero conservada
  6. Tests parser variables + versiones ≥ 80% cobertura
**Plans**: TBD

Plans:
- [ ] 05-01: Módulo NestJS plantillas: schema versionado, upload .txt/.docx, conversión txt→docx, storage MinIO
- [ ] 05-02: Parser de variables: regex {{objeto.campo}}, detección automática, validación contra esquemas, F-030b
- [ ] 05-03: Frontend editor: CodeMirror 6 con highlight, panel lateral, modal inserción cláusula con renumeración
- [ ] 05-04: Tests parser variables, versionado de plantillas, integración MinIO

### Phase 6: Generación y Documentos
**Goal**: El corazón del producto: combinar plantilla + expediente → .docx generado con datos congelados. Y subida de documentos preexistentes.
**Depends on**: Phase 5
**Requirements**: [DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07]
**Success Criteria** (what must be TRUE):
  1. Formulario de generación lista variables de la plantilla agrupadas por origen y pre-rellena desde expediente/contactos
  2. Sistema fuerza asignar roles requeridos; rechaza generar si falta cualquier variable
  3. Variables nuevas en formulario → añadidas al esquema dinámico al guardar (FL-13 entrada C)
  4. Generación produce .docx vía docxtemplater, lo sube a MinIO, crea documentos con datosCongelados = JSON resuelto
  5. Descarga .docx vía endpoint autenticado con presigned URL (5 min TTL)
  6. Subida documento preexistente (.docx/.pdf/.txt) guardado en MinIO con tipo: "subido"
  7. Cambiar NIF de un contacto NO modifica .docx ya generado ni su datosCongelados
**Plans**: TBD

Plans:
- [ ] 06-01: Pipeline generación backend: construir JSON contexto, resolver variables, docxtemplater, MinIO, datosCongelados
- [ ] 06-02: Módulo NestJS documentos: schema, subida preexistentes, descarga con presigned URL, soft-delete con evaluación eventos
- [ ] 06-03: Frontend: formulario generación con pre-relleno, asignación roles, declaración variables nuevas
- [ ] 06-04: Tests pipeline generación, inmutabilidad datosCongelados, subida/descarga

### Phase 7: Calendario y Facturación
**Goal**: Calendario operativo con eventos auto/manuales y borrado controlado; facturación por expediente con totales y estados.
**Depends on**: Phase 6
**Requirements**: [CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, FAC-01, FAC-02, FAC-03, FAC-04, FAC-05]
**Success Criteria** (what must be TRUE):
  1. Añadir fecha a documento → evento en `eventos` con origen y subtipo; visible en fechas del expediente
  2. Crear evento manual desde botón + con título, fechas, tipología, color funciona
  3. Vista calendario unificada con filtros por expediente y rango
  4. Borrar documento con eventos → modal conservar/eliminar; elección aplicada correctamente
  5. Pestaña facturación: crear/editar/eliminar entradas; coste total recalculado al modificar
  6. Cambios de estado pendiente→facturado→cobrado reflejados en UI
**Plans**: TBD

Plans:
- [ ] 07-01: Módulo NestJS eventos: schema, CRUD, endpoints auto (desde documento) y manual, índices por fecha/expediente
- [ ] 07-02: Módulo NestJS facturacion: schema, CRUD entradas, agregado coste total, estados
- [ ] 07-03: Frontend: vista calendario (react-calendar o similar), pestaña fechas del expediente, modal borrado doc con eventos
- [ ] 07-04: Frontend: pestaña facturación del expediente con entradas, totales, badges de estado

### Phase 8: Hardening
**Goal**: Producto listo para producción: PII cifrado, errores monitorizados, los 13 flujos verificados E2E.
**Depends on**: Phase 7
**Requirements**: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07]
**Success Criteria** (what must be TRUE):
  1. `documentacionFiscal` y `documentoIdentidad` cifrados en Mongo (valores ilegibles sin clave); API los descifra transparentemente
  2. Búsqueda exacta por NIF/CIF vía `documentacionFiscalHash` funciona
  3. Nginx fuerza HTTPS con certificado válido y renovación automatizada
  4. `.env` contiene todas las claves; `.env.example` versionado sin secretos; repositorio sin `.env`
  5. Tests E2E Playwright cubren FL-1..FL-13 y pasan en CI
  6. Cobertura ≥ 80% en parser variables, render plantilla, servicios audit y soft-delete
  7. Sentry captura error inducido en frontend y backend con stack trace y usuarioId correctos
**Plans**: TBD

Plans:
- [ ] 08-01: Cifrado AES-256-GCM en documentacionFiscal y documentoIdentidad vía subscriber Mongoose + hash determinista
- [ ] 08-02: Configurar Sentry (frontend + backend) con contexto usuarioId; validar `.env` + `.env.example`
- [ ] 08-03: Tests E2E Playwright: setup entorno docker efímero + suites FL-1..FL-13
- [ ] 08-04: Completar cobertura ≥ 80% en módulos críticos; validar nginx HTTPS + renovación automática cert

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bootstrap de infraestructura | 5/5 | Complete | 2026-04-27 |
| 2. Auth y bases transversales | 3/4 | In Progress|  |
| 3. Contactos | 1/3 | In Progress|  |
| 4. Cláusulas y Expedientes | 0/4 | Not started | - |
| 5. Plantillas y Editor | 0/4 | Not started | - |
| 6. Generación y Documentos | 0/4 | Not started | - |
| 7. Calendario y Facturación | 0/4 | Not started | - |
| 8. Hardening | 0/4 | Not started | - |
