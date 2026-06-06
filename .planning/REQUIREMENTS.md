# Lexscribe — Requirements (Milestone v1.0 MVP)

> Cada `REQ-ID` cubre una capacidad observable por el usuario. La columna **Features** mapea a las `F-XXX` de [`docs/FUNCIONAL.md`](../docs/FUNCIONAL.md). La trazabilidad fase→REQ está al final del documento (rellenada por el roadmapper).

**Convención REQ-ID:** `[CATEGORÍA]-[NN]`. Categorías: `INF`, `AUTH`, `CONT`, `CLAU`, `EXPE`, `PLAN`, `DOC`, `CAL`, `FAC`, `SEC`.

---

## v1.0 Requirements

### Infraestructura (`INF`)

- [ ] **INF-01** — El sistema arranca completo (frontend + backend + Mongo + MinIO + Nginx) con un solo `docker compose up` en el NAS. *(Arquitectura §10)*
- [ ] **INF-02** — La API expone `/health` y `/health/ready` para healthchecks. *(Arquitectura §12)*
- [ ] **INF-03** — Pull requests ejecutan automáticamente lint, type-check, tests unitarios y build. *(Arquitectura §11)*
- [ ] **INF-04** — Merge a `main` despliega a entorno staging vía GitHub Actions + webhook al NAS. *(Arquitectura §11)*
- [ ] **INF-05** — Tag `v*` despliega a producción en el NAS. *(Arquitectura §11)*
- [x] **INF-06** — Backup diario de MinIO y de Mongo a Google Drive vía `rclone`. *(Arquitectura §8.2)*

### Auth y bases transversales (`AUTH`)

- [x] **AUTH-01** — El usuario puede iniciar sesión con email/password y recibir un JWT (15 min) + refresh cookie (7 d). *(Arquitectura §9)*
- [x] **AUTH-02** — El refresh rotativo emite un nuevo refresh al usarlo e invalida el anterior. *(Arquitectura §9.1)*
- [x] **AUTH-03** — Logout invalida el refresh token en servidor. *(Arquitectura §9.1)*
- [x] **AUTH-04** — Toda petición autenticada inyecta automáticamente el `usuarioId` desde el JWT — ningún endpoint acepta `usuarioId` en el body. *(Arquitectura §9.2)*
- [x] **AUTH-05** — Un script de seed crea el usuario por defecto y los esquemas vacíos (`expediente`, `contacto`) de forma idempotente. *(Arquitectura §16)*
- [x] **AUTH-06** — Toda colección de negocio aplica soft-delete vía middleware Mongoose: las queries por defecto excluyen `activo: false`. *(Datos §2.3)*
- [x] **AUTH-07** — Toda operación `create`/`update`/`delete`/`link`/`unlink`/`generate`/`login`/`logout` queda registrada en la colección `auditoria` de forma asíncrona e inmutable. *(Arquitectura §18)*
- [x] **AUTH-08** — Existe el módulo `esquemas` con endpoints CRUD por `tipoObjeto`. *(Cubre F-090, F-091, F-093, F-094, F-096)*

### Contactos (`CONT`)

- [x] **CONT-01** — El usuario puede crear contactos como persona física o jurídica con los atributos base (nombre/razón social, NIF/CIF, DNI, dirección, email, teléfono). *(F-050, F-051)*
- [x] **CONT-02** — Cada contacto tiene una tipología (`cliente`, `parte_contraria`, `interesado`, `otros`). *(F-052)*
- [x] **CONT-03** — El usuario puede añadir parámetros personalizados a un contacto, que se registran en el esquema dinámico del tipo `contacto`. *(F-051b, F-091)*
- [x] **CONT-04** — El usuario puede listar, filtrar y buscar contactos por nombre o documentación fiscal. *(F-055)*
- [x] **CONT-05** — Desde un contacto, el usuario puede ver en qué expedientes está vinculado. *(F-054)*

### Cláusulas (`CLAU`)

- [ ] **CLAU-01** — El usuario puede dar de alta cláusulas tipo desde una sección dedicada (no desde plantilla). *(F-040, F-041)*
- [ ] **CLAU-02** — Cada cláusula admite múltiples labels libres (sin lista cerrada). *(F-045)*
- [ ] **CLAU-03** — El usuario puede buscar y filtrar cláusulas por label en la biblioteca. *(F-046)*
- [x] **CLAU-04** — El usuario puede insertar una cláusula existente dentro de una plantilla, respetando el orden del clausulado y renumerando automáticamente las cláusulas afectadas. *(F-042, F-043, F-044)*

### Expedientes (`EXPE`)

- [ ] **EXPE-01** — El usuario puede crear expedientes con nombre y fecha de creación automática. *(F-001, F-002)*
- [ ] **EXPE-02** — El usuario puede asociar y desasociar contactos al expediente con un rol contextual (texto libre, p.ej. `cliente`, `vendedor`). *(F-004, F-018, F-026)*
- [ ] **EXPE-03** — La pareja contacto + rol es única dentro de un expediente; el sistema impide duplicados con error legible. *(Datos §4.1)*
- [ ] **EXPE-04** — El usuario puede añadir parámetros personalizados a un expediente, que se registran en el esquema dinámico del tipo `expediente`. *(F-003, F-091)*
- [ ] **EXPE-05** — El usuario puede listar, filtrar y buscar expedientes. *(F-007)*
- [ ] **EXPE-06** — El expediente muestra una vista unificada de fechas heredadas de sus documentos. *(F-006)*
- [ ] **EXPE-07** — El expediente alberga todos sus documentos generados y subidos. *(F-005)*

### Plantillas (`PLAN`)

- [x] **PLAN-01** — El usuario puede crear plantillas subiendo un archivo `.txt`, un `.docx` o pegando texto plano. *(F-020, F-021, F-022)*
- [x] **PLAN-02** — El sistema detecta automáticamente todas las variables `{{objeto.campo}}` en el texto importado y las expone agrupadas por tipo de objeto. *(F-023, F-024)*
- [x] **PLAN-03** — El sistema valida los tipos de objeto en variables (`expediente`, `contacto`, `clausula`, `fecha`); tipos desconocidos producen un error controlado señalando línea y variable, impidiendo finalizar la plantilla. *(F-030b)*
- [x] **PLAN-04** — El usuario puede declarar variables nuevas desde el editor de plantilla con un tipo conocido pero campo inexistente (p.ej. `{{expediente.honorariosBase}}`); el campo se añade al esquema dinámico. *(F-092)*
- [ ] **PLAN-05** — El editor (CodeMirror 6) resalta visualmente las variables `{{...}}` y muestra un panel lateral con la lista de variables detectadas en tiempo real. *(Arquitectura §4.3)*
- [x] **PLAN-06** — Cada edición de una plantilla guardada genera una nueva versión: la anterior queda inactiva, la nueva activa, y los documentos históricos siguen apuntando a su versión exacta. *(Datos §4.3)*

### Documentos: generación y subida (`DOC`)

- [x] **DOC-01** — Desde un expediente, el usuario puede generar un documento eligiendo plantilla y rellenando el formulario de variables, con pre-relleno automático desde expediente/contactos asociados. *(F-010, F-012, FL-6)*
- [x] **DOC-02** — Cuando una plantilla requiere un rol no presente en el expediente, el formulario obliga al usuario a asignarlo o a crear/asociar un contacto. *(F-026, FL-6 paso 4)*
- [x] **DOC-03** — Cuando una plantilla referencia un parámetro nuevo no existente aún en el contacto/expediente, el formulario lo solicita y al guardar lo añade al esquema dinámico. *(F-091, FL-13 entrada C)*
- [x] **DOC-04** — El sistema renderiza el documento con `docxtemplater`, lo guarda como `.docx` en MinIO y crea un registro `documentos` con `datosCongelados` (snapshot JSON inmutable). *(F-013, F-015, F-029)*
- [x] **DOC-05** — El usuario puede descargar el `.docx` generado vía URL autenticada con presigned URL de MinIO. *(Arquitectura §8.3)*
- [x] **DOC-06** — El usuario puede subir documentos preexistentes (`.docx`/`.pdf`/`.txt`) a un expediente sin pasar por plantilla, conservados tal cual y sin auto-relleno. *(F-017)*
- [x] **DOC-07** — Los cambios posteriores en contactos/expediente no afectan a documentos ya generados. *(F-015)*

### Calendario (`CAL`)

- [x] **CAL-01** — El usuario puede añadir manualmente fechas a un documento (fecha límite, aviso o recordatorio); cada una crea un evento único en el calendario asociado al expediente. *(F-030, F-032, F-033, F-034, F-061, F-062)*
- [x] **CAL-02** — El usuario puede crear eventos manuales en el calendario con título, fecha inicio, fecha fin, descripción y tipología, sin necesidad de documento. *(F-063, F-064)*
- [x] **CAL-03** — La vista de calendario muestra todos los eventos (auto + manuales) con filtros por expediente y rango. *(F-060, F-066)*
- [x] **CAL-04** — El usuario puede personalizar el color de un evento. *(F-065)*
- [x] **CAL-05** — Al borrar un documento con eventos asociados, el sistema pregunta si conservar o eliminar los eventos del expediente. *(F-016, FL-9)*

### Facturación (`FAC`)

- [x] **FAC-01** — Cada expediente tiene una pestaña de facturación accesible desde su detalle. *(F-070, F-008)*
- [x] **FAC-02** — El usuario puede registrar entradas con concepto, importe, fecha (default hoy), número/referencia opcional, notas opcional. *(F-072)*
- [x] **FAC-03** — Cada entrada tiene estado `pendiente` / `facturado` / `cobrado`, actualizable manualmente; default `pendiente`. *(F-073)*
- [x] **FAC-04** — El usuario puede editar y eliminar entradas en cualquier momento. *(F-074)*
- [x] **FAC-05** — La pestaña muestra el coste total acumulado del expediente (suma de entradas activas), recalculado automáticamente. *(F-071)*

### Seguridad y hardening (`SEC`)

- [ ] **SEC-01** — Los campos `documentacionFiscal` y `documentoIdentidad` se cifran en reposo con AES-256-GCM antes de persistirse, transparentemente vía subscriber Mongoose. *(Arquitectura §17.3)*
- [ ] **SEC-02** — Existe un hash determinista paralelo (`documentacionFiscalHash`) que permite búsqueda exacta sin descifrar. *(Arquitectura §17.3)*
- [ ] **SEC-03** — Toda comunicación entre navegador y backend es HTTPS, con certificado válido (Let's Encrypt o equivalente). *(Arquitectura §17.2)*
- [ ] **SEC-04** — Las claves AES y JWT viven en variables de entorno; nunca en código ni en repositorio. *(Arquitectura §17.4)*
- [ ] **SEC-05** — Los 13 flujos de usuario (`FL-1` a `FL-13`) tienen tests E2E pasando con Playwright. *(Arquitectura §13.2)*
- [x] **SEC-06** — Los servicios y utilidades críticas (parser de variables, render de plantilla) tienen al menos 80% de cobertura de tests. *(Arquitectura §13.2)*
- [ ] **SEC-07** — Sentry captura errores de frontend y backend con stack trace y contexto de usuario. *(Arquitectura §12)*

---

## Future Requirements (deferred — post-MVP)

Reservados pero fuera de v1.0:

- Edición / regeneración de documentos generados (F-080).
- Cálculo automático de fechas por reglas (F-031).
- Visión consolidada de facturación entre expedientes (F-075).
- Renombrar / eliminar variables del esquema dinámico (F-095).
- Variables tipo array con iteración en plantilla (F-025) — requiere sintaxis `{{#each}}`.
- Vista global de actividad / auditoría desde menú (Arquitectura §18.4).

---

## Out of Scope

Exclusiones explícitas — sacarlas de aquí requiere decisión de milestone:

- Multi-usuario, roles, permisos.
- Salida en PDF u otros formatos distintos a `.docx`.
- Multi-idioma de la plataforma.
- Módulo contable completo (lo del MVP es seguimiento interno).
- Portal de cliente / acceso externo a expedientes.
- Firma electrónica de documentos.
- Integraciones externas (e-mail, sistemas judiciales, calendarios externos).
- Sintaxis avanzada de plantillas: condicionales `{{#if}}`, formateadores, expresiones.
- Borrado físico de contactos vinculados a expedientes con documentos generados.

---

## Traceability (rellena al aprobar el roadmap)

| Phase | Requirements cubiertos |
|-------|------------------------|
| 1 | INF-01, INF-02, INF-03, INF-04, INF-05 |
| 2 | INF-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08 |
| 3 | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05 |
| 4 | CLAU-01, CLAU-02, CLAU-03, EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07 |
| 5 | PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, CLAU-04 |
| 6 | DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07 |
| 7 | CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, FAC-01, FAC-02, FAC-03, FAC-04, FAC-05 |
| 8 | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07 |

**Cobertura:** 8 fases · 60 requisitos mapeados · 100% cubiertos.
