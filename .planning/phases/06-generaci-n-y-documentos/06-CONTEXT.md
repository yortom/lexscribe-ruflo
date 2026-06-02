# Phase 6: Generación y Documentos — Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Pipeline completo de generación: formulario de variables (con pre-relleno desde expediente/contactos) → docxtemplater → `.docx` en MinIO → registro `documentos` con `datosCongelados` inmutables. Más subida de documentos preexistentes.

**Scope:** DOC-01 a DOC-07.
**No scope:** edición/regeneración de documentos (F-080 post-MVP), cálculo automático de fechas (Phase 7), eventos de calendario desde documentos (Phase 7 FL-8/FL-9).

</domain>

<decisions>
## Implementation Decisions

### Pipeline de generación (DOC-04)

- **D-01:** Cuando la plantilla tiene `storagePath = null` (creada por pegado/txt en Phase 5), el `GenerationService` genera un `.docx` mínimo en memoria usando el paquete `docx` (npm) on-the-fly antes de pasar a docxtemplater. Sin cambios en Phase 5, sin migración de datos.
- La arquitectura exige "siempre existe un .docx base" (ARQUITECTURA.md §7.3). Este gap se resuelve en Phase 6 completamente en el servicio de generación.
- Storage key del documento generado: `documentos/generados/{documentoId}/{nombreSlug}.docx`
- Storage key del documento subido: `documentos/subidos/{documentoId}/{nombreSlug}.{ext}`

### Formulario de generación — estructura (DOC-01)

- **D-02:** El formulario se organiza en **secciones por tipoObjeto**: "Datos del expediente" | "Contactos por rol" | "Cláusulas" | "Fechas". Generadas dinámicamente a partir de `groupByTipoObjeto(plantilla.variablesDetectadas)`.
- **D-03:** **Pre-relleno máximo**: `expediente.campo` → desde `expediente.parametros`; `contacto.rol.campo` → si ya existe un contacto con ese `rol` exacto en el expediente, se pre-rellena su campo.
- **D-04:** El nombre del documento se auto-genera como `{nombrePlantilla} - {YYYY-MM-DD}`, editable por el usuario antes de confirmar.
- **D-05:** El formulario vive en ruta propia: `/expedientes/[id]/documentos/nuevo` (nueva página Next.js App Router).

### Roles no asignados en expediente (DOC-02)

- **D-06:** Si un rol requerido por la plantilla (`{{contacto.vendedor.nombre}}`) no está en los contactos del expediente → el formulario abre un **modal inline** con dos opciones:
  - **Buscar y asignar contacto existente** (buscador de contactos del sistema)
  - **Crear contacto nuevo básico** (formulario mínimo: nombre + NIF/CIF) y asignarlo al rol
  El contacto nuevo/asignado se vincula al expediente con el rol durante la generación.
- **D-07:** El botón "Generar" permanece **deshabilitado** con un contador "Faltan X campos" hasta que todas las variables estén resueltas.

### Variables nuevas en formulario (DOC-03)

- **D-08:** Cuando la plantilla referencia un campo que no existe en el esquema dinámico (ej. `{{expediente.honorariosBase}}`), el formulario muestra el campo **inline** con un badge "nuevo" y un **mini-selector de tipo** junto al input (`texto | número | fecha | booleano`).
- **D-09:** Al generar, el sistema auto-declara el campo en el esquema dinámico vía `EsquemasService.addParametro` (mismo mecanismo que FL-13 entrada C) y muestra un aviso al usuario de qué campos nuevos se han creado.
- El tipoDato por defecto es `texto` si el usuario no cambia el selector.

### Claude's Discretion

- Estructura exacta del JSON `datosCongelados` que recibe docxtemplater: implementar como `{ expediente: {...}, contacto: { [rol]: {...} }, clausula: { [nombre]: {...} }, fecha: {...} }` siguiendo la estructura de variables detectadas (ARQUITECTURA.md §7.2).
- TTL de presigned URL: 300s (5 min) como especifica ARQUITECTURA.md §8.3.
- Paginación/orden del listado de documentos en el expediente: por `fechaCreacion` descendente (índice ya previsto en DATOS.md §4.5).
- Formato de nombre de archivo en MinIO: slugify del nombre del documento (mismo `slugify` de Phase 5).
- Módulo backend: `DocumentosModule` importa `StorageModule` y `EsquemasModule` explícitamente (no global).
- `@Audited` decorator en todos los endpoints write del módulo documentos (patrón establecido en Phase 2+).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Funcional — features y flujos de Phase 6
- `docs/FUNCIONAL.md` §4.4 (Módulo Documentos: F-010..F-018) — qué hace cada feature
- `docs/FUNCIONAL.md` FL-6 — flujo completo de generación (paso a paso)
- `docs/FUNCIONAL.md` FL-13 entrada C — creación de variable nueva desde formulario de generación
- `docs/FUNCIONAL.md` FL-9 — borrado de documento con eventos (scope Phase 7, pero el soft-delete de documentos debe contemplar la interfaz)

### Datos — schema documentos
- `docs/DATOS.md` §4.5 — schema completo de la colección `documentos` (campos, índices, notas sobre `datosCongelados`)
- `docs/DATOS.md` §2.3 — soft-delete: regla especial para `documentos` (evaluar eventos al inactivar)
- `docs/DATOS.md` §8.2 — rutas de Storage MinIO para documentos generados/subidos

### Arquitectura — pipeline y storage
- `docs/ARQUITECTURA.md` §7.2 — pipeline FL-6 (construcción JSON contexto → docxtemplater → MinIO → registro)
- `docs/ARQUITECTURA.md` §7.3 — decisión de cómo se guarda plantilla: SIEMPRE .docx base (on-the-fly para pegado/txt)
- `docs/ARQUITECTURA.md` §8.3 — servir archivos vía presigned URL (5 min TTL, endpoint `/api/v1/documentos/:id/download`)

### Código existente reutilizable
- `apps/backend/src/common/storage/storage.service.ts` — putObject + getPresignedUrl (ya implementados)
- `apps/backend/src/common/storage/storage.module.ts` — importar explícitamente en DocumentosModule
- `packages/shared-validation/src/variable-parser.ts` — parseVariables, groupByTipoObjeto, validarVariables
- `apps/backend/src/modules/plantillas/plantillas.service.ts` — patrón de integración StorageService + slugify
- `apps/backend/src/modules/esquemas/` — EsquemasService.addParametro para DOC-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageService` (`common/storage/`): `putObject(key, buffer, contentType)` + `getPresignedUrl(key, ttlSeconds=300)` → Phase 6 usa directamente para documentos generados y subidos
- `groupByTipoObjeto` + `parseVariables` (`shared-validation`): agrupan variables detectadas por tipoObjeto para construir el formulario de generación
- `EsquemasService.addParametro` (`modules/esquemas/`): declara parámetro en esquema dinámico (D-08/D-09)
- `slugify` function en `plantillas.service.ts`: reutilizable para normalizar nombres de archivo en MinIO
- `AuditInterceptor` + `@Audited` decorator: patrón establecido en Phase 2, usar en endpoints write del módulo documentos
- `softDeletePlugin` Mongoose: aplicar al schema `documentos` (con nota: evaluación de eventos al borrar, scope Phase 7)

### Established Patterns
- Módulos NestJS: schema + repository + service + controller + DTOs (Zod) — mismo patrón que clausulas/expedientes/plantillas
- `StorageModule` importado explícitamente por módulo (no @Global) — documentado en STATE.md Phase 5
- `NODE_ENV=test` guard en `StorageService.onModuleInit` — ya resuelto, tests no necesitan MinIO
- `DomainError` hierarchy (`NotFoundError`, `ValidationError`, `ConflictError`) para errores del dominio
- `insert-then-deactivate` para versioning (no aplica aquí, pero el patrón de no-transactions es relevante)
- `forwardRef` para dependencias circulares (necesario si DocumentosModule ↔ ExpedientesModule se referencian)

### Integration Points
- `ExpedientesModule` — recuperar expediente + contactos vinculados + parametros para pre-relleno
- `PlantillasModule` — recuperar plantilla activa + variablesDetectadas + storagePath para generación
- `ClausulasModule` — recuperar cláusula por id para variables tipo `clausula.*`
- `ContactosModule` — buscador de contactos en modal de rol faltante (D-06); crear contacto básico
- `apps/frontend/app/(app)/expedientes/[id]/page.tsx` — lista de documentos (placeholder EXPE-07) a rellenar con datos reales
- `packages/shared-types/src/expediente.ts` — `ExpedienteDetailResponse.documentos` cambia de `unknown[]` a `Documento[]` en Phase 6

</code_context>

<specifics>
## Specific Ideas

- **Modal de rol faltante (D-06):** Dos tabs o secciones: "Buscar contacto existente" (input search) y "Crear contacto básico" (nombre + NIF mínimo). Crear → asocia al expediente con el rol → pre-rellena el campo en el formulario.
- **Badge "nuevo":** Estilo visual diferenciado (ej. color ámbar) para campos que se declararán en el esquema. Aviso al pie del formulario antes de generar: "Se crearán X nuevos campos en el esquema."
- **Botón "Generar" bloqueado:** Contador dinámico en el botón: "Generar (faltan 3)" o tooltip con lista de campos pendientes.
- **datosCongelados:** El JSON completo que se pasa a docxtemplater ES el `datosCongelados`. Se persiste tal cual en el documento tras la generación exitosa.

</specifics>

<deferred>
## Deferred Ideas

Ninguna idea de scope creep surgió durante la discusión. Todo lo conversado está dentro de DOC-01..DOC-07.

### Reviewed Todos (not folded)
No hay todos pendientes que encajen en Phase 6.

</deferred>

---

*Phase: 06-generaci-n-y-documentos*
*Context gathered: 2026-06-02*
