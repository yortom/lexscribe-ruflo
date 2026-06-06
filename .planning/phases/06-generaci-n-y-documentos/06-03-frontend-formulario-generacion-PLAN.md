---
phase: 06-generaci-n-y-documentos
plan: 03
type: execute
wave: 3
depends_on: ["06-02"]
files_modified:
  - apps/frontend/lib/api/documentos.ts
  - apps/frontend/lib/generacion/preRelleno.ts
  - apps/frontend/components/documentos/GeneracionForm.tsx
  - apps/frontend/components/documentos/GeneracionFormSection.tsx
  - apps/frontend/components/documentos/RolFaltanteModal.tsx
  - apps/frontend/components/documentos/DocumentosList.tsx
  - apps/frontend/app/(app)/expedientes/[id]/documentos/nuevo/page.tsx
  - apps/frontend/components/expedientes/ExpedienteTabs.tsx
  - apps/frontend/__tests__/documentos/GeneracionForm.test.tsx
  - apps/frontend/__tests__/documentos/preRelleno.test.ts
autonomous: false
requirements: [DOC-01, DOC-02, DOC-03, DOC-05, DOC-06]
must_haves:
  truths:
    - "El formulario de generación lista variables agrupadas por tipoObjeto y pre-rellena desde expediente/contactos"
    - "Roles requeridos no presentes abren un modal para buscar/crear-asignar contacto"
    - "El botón Generar está deshabilitado con contador 'Faltan X' hasta resolver todas las variables"
    - "Campos no existentes en esquema muestran badge 'nuevo' + selector de tipo y se declaran al generar"
    - "La pestaña Documentos del expediente lista documentos reales con botón de descarga y de subida"
  artifacts:
    - path: "apps/frontend/components/documentos/GeneracionForm.tsx"
      provides: "Formulario por secciones + validación completitud + submit generar"
      min_lines: 60
    - path: "apps/frontend/lib/api/documentos.ts"
      provides: "cliente HTTP: generarDocumento, uploadDocumento, downloadDocumento, listDocumentos, deleteDocumento"
    - path: "apps/frontend/lib/generacion/preRelleno.ts"
      provides: "preRellenarFormulario(vars, expediente, contactosData) → valores iniciales"
    - path: "apps/frontend/app/(app)/expedientes/[id]/documentos/nuevo/page.tsx"
      provides: "Página D-05 de generación"
  key_links:
    - from: "documentos.ts"
      to: "POST /documentos/generar/:expedienteId"
      via: "generarDocumento"
      pattern: "generar/"
    - from: "GeneracionForm.tsx"
      to: "groupByTipoObjeto(plantilla.variablesDetectadas)"
      via: "secciones dinámicas (D-02)"
      pattern: "groupByTipoObjeto"
    - from: "ExpedienteTabs.tsx"
      to: "DocumentosList"
      via: "pestaña Documentos (EXPE-07)"
      pattern: "DocumentosList"
---

<objective>
Construir la UI de generación: cliente HTTP tipado para documentos, lógica de pre-relleno, formulario agrupado por tipoObjeto con validación de completitud (botón "Generar (faltan X)"), modal de rol faltante (D-06), badge "nuevo" + selector de tipo para campos no existentes (D-08), página `/expedientes/[id]/documentos/nuevo` (D-05), y la pestaña Documentos del expediente con listado real + descarga + subida.

Purpose: Materializa DOC-01/02/03/05/06 en la interfaz; conecta el pipeline backend (06-02) con el usuario.
Output: Formulario de generación funcional, pestaña Documentos operativa, UAT humano.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-generaci-n-y-documentos/06-CONTEXT.md
@.planning/phases/06-generaci-n-y-documentos/06-02-SUMMARY.md
@docs/FUNCIONAL.md

<interfaces>
<!-- Contratos del codebase para el executor -->

Cliente HTTP patrón (apps/frontend/lib/api/plantillas.ts y contactos.ts):
- apiFetch<T>(path, init?) con auto-refresh 401; ApiError(code,message,status).
- Para multipart (subida) ver uploadPlantilla en plantillas.ts: usa FormData y NO setea Content-Type (el browser lo pone con boundary). Adaptar: omitir 'Content-Type' del header en rawFetch cuando body es FormData.

Tipos compartidos (de 06-01): Documento, DocumentoListResponse, DownloadUrlResponse, DatosCongelados.
DTOs (de 06-01): GenerateDocumentoInput { plantillaId, nombre, valores:{expediente,contacto,clausula,fecha}, asignacionesRol:[{rol,contactoId}], camposNuevos:[{tipoObjeto,rol?,nombre,tipoDato}] }.

groupByTipoObjeto (de @lexscribe/shared-validation):
function groupByTipoObjeto(vars): { tipoObjeto: string; valido: boolean; variables: VariableDetectada[] }[];
VariableDetectada { raw, tipoObjeto, rol:string|null, campo, esArray, valido, linea, columna }.

Plantilla (shared-types): tiene variablesDetectadas[], nombre, _id, contenido.
Expediente/ExpedienteDetailResponse: { _id, nombre, contactos:[{contactoId,rol}], parametros:Record<string,unknown>, documentos: Documento[], ... }.

API existente reutilizable:
- lib/api/expedientes.ts: getExpediente(id), linkContacto(expId,{contactoId,rol}).
- lib/api/plantillas.ts: listPlantillas(), getPlantilla(id).
- lib/api/contactos.ts: listContactos(query) (buscar contacto modal D-06), createContacto(data) (crear básico).

Componentes patrón: components/expedientes/AsociarContactoModal.tsx (modal con buscador de contactos — reusar patrón para RolFaltanteModal), ExpedienteTabs.tsx (pestañas; añadir DocumentosList).

Tests frontend: Vitest + @testing-library/react. Ver __tests__/expedientes/AsociarContactoModal.test.tsx como patrón.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Cliente HTTP documentos + lógica de pre-relleno (con tests unitarios)</name>
  <read_first>
    - apps/frontend/lib/api/plantillas.ts (uploadPlantilla FormData; getPlantilla)
    - apps/frontend/lib/api/expedientes.ts (apiFetch, ApiError, getExpediente)
    - apps/frontend/lib/api/contactos.ts (listContactos/createContacto signatures)
    - packages/shared-types/src/documento.ts (de 06-01)
    - packages/shared-validation/src/documentos.ts (GenerateDocumentoInput)
    - packages/shared-validation/src/variable-parser.ts (groupByTipoObjeto, VariableDetectada)
  </read_first>
  <action>
    1. Crear `apps/frontend/lib/api/documentos.ts` (mismo patrón apiFetch/ApiError que plantillas.ts — copiar rawFetch/apiFetch o importar si está exportado; si no exportado, replicar). Funciones:
       - `generarDocumento(expedienteId: string, dto: GenerateDocumentoInput): Promise<Documento>` → POST `/documentos/generar/${expedienteId}`, body JSON.
       - `uploadDocumento(expedienteId: string, file: File, nombre: string): Promise<Documento>` → POST `/documentos/upload/${expedienteId}` con FormData (`file` + `nombre`); en rawFetch para FormData NO incluir 'Content-Type'.
       - `downloadDocumento(id: string): Promise<DownloadUrlResponse>` → GET `/documentos/${id}/download`.
       - `listDocumentos(expedienteId: string, page=1, limit=20): Promise<DocumentoListResponse>` → GET `/documentos?expedienteId=${expedienteId}&page=${page}&limit=${limit}`.
       - `deleteDocumento(id: string): Promise<void>` → DELETE `/documentos/${id}`.
    2. Crear `apps/frontend/lib/generacion/preRelleno.ts` con función pura testeable:
       ```typescript
       import { groupByTipoObjeto, type VariableDetectada } from '@lexscribe/shared-validation';
       // Devuelve valores iniciales estructurados por tipoObjeto y la lista de roles requeridos.
       export interface PreRellenoResult {
         valores: { expediente: Record<string, unknown>; contacto: Record<string, Record<string, unknown>>; clausula: Record<string, Record<string, unknown>>; fecha: Record<string, unknown> };
         rolesRequeridos: string[];   // roles de variables contacto.rol.campo
         rolesPresentes: string[];    // roles ya vinculados en el expediente
       }
       export function preRellenarFormulario(
         vars: VariableDetectada[],
         expediente: { parametros: Record<string, unknown>; nombre: string; contactos: { contactoId: string; rol: string }[] },
         contactoFieldsByRol: Record<string, Record<string, unknown>>, // datos de contactos vinculados resueltos por el caller
       ): PreRellenoResult;
       ```
       Implementar (D-03 pre-relleno máximo):
       - expediente.campo → `valores.expediente[campo] = expediente.parametros[campo]` (o nombre si campo==='nombre').
       - contacto.rol.campo → si existe vínculo con ese rol → `valores.contacto[rol][campo] = contactoFieldsByRol[rol]?.[campo]`.
       - rolesRequeridos = roles distintos de variables tipoObjeto 'contacto' con rol != null.
       - rolesPresentes = expediente.contactos.map(c=>c.rol).
    3. Crear tests: `apps/frontend/__tests__/documentos/preRelleno.test.ts` (Vitest):
       - pre-rellena expediente.campo desde parametros.
       - pre-rellena contacto.rol.campo cuando el rol está vinculado.
       - rolesRequeridos incluye roles de variables contacto y rolesPresentes refleja los vínculos.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter frontend test -- preRelleno</automated>
  </verify>
  <acceptance_criteria>
    - `grep "generar/" apps/frontend/lib/api/documentos.ts` existe
    - `grep 'FormData' apps/frontend/lib/api/documentos.ts` existe (upload)
    - `grep "':id/download'\|/download" apps/frontend/lib/api/documentos.ts` o `download` existe
    - `grep 'preRellenarFormulario' apps/frontend/lib/generacion/preRelleno.ts` existe
    - `grep 'rolesRequeridos' apps/frontend/lib/generacion/preRelleno.ts` existe
    - `pnpm --filter frontend test -- preRelleno` pasa
  </acceptance_criteria>
  <done>Cliente HTTP documentos + lógica de pre-relleno con tests verdes.</done>
</task>

<task type="auto">
  <name>Task 2: GeneracionForm + secciones + RolFaltanteModal + página nuevo (con test)</name>
  <read_first>
    - apps/frontend/components/expedientes/AsociarContactoModal.tsx (patrón modal buscador contactos — base de RolFaltanteModal)
    - apps/frontend/lib/generacion/preRelleno.ts (de Task 1)
    - apps/frontend/lib/api/documentos.ts (de Task 1)
    - apps/frontend/app/(app)/expedientes/[id]/page.tsx (params sync Next.js 14)
    - apps/frontend/__tests__/expedientes/AsociarContactoModal.test.tsx (patrón test RTL)
  </read_first>
  <action>
    1. `components/documentos/GeneracionFormSection.tsx`: renderiza una sección por grupo de `groupByTipoObjeto`. Título por tipoObjeto: expediente→"Datos del expediente", contacto→"Contactos por rol", clausula→"Cláusulas", fecha→"Fechas" (D-02). Para cada variable renderiza un input controlado. Si el campo es nuevo (no en esquema, ver paso 3) muestra badge ámbar "nuevo" + `<select>` de tipo (`texto|numero|fecha|booleano`, default `texto`) junto al input (D-08).
    2. `components/documentos/RolFaltanteModal.tsx` (D-06): props `{ rol, onAsignar(contactoId), onClose }`. Dos secciones/tabs: (a) "Buscar contacto existente" usando `listContactos({search})` y al elegir llama `onAsignar(contactoId)`; (b) "Crear contacto básico" formulario mínimo (nombre + NIF/CIF) que llama `createContacto({tipo:'fisica', nombre, documentacionFiscal})` y luego `onAsignar(nuevoId)`. Reusar el patrón visual de AsociarContactoModal.
    3. `components/documentos/GeneracionForm.tsx` (D-01/02/03/07-UX):
       - Props: `{ expedienteId, plantilla, expediente, contactoFieldsByRol }`.
       - Estado: `valores` inicializado con `preRellenarFormulario(...)`; `nombreDoc` = `${plantilla.nombre} - ${YYYY-MM-DD}` editable (D-04); `asignacionesRol: {rol,contactoId}[]`; `camposNuevos: {tipoObjeto,rol?,nombre,tipoDato}[]`.
       - Render secciones via `groupByTipoObjeto(plantilla.variablesDetectadas)`.
       - Para cada rol en `rolesRequeridos` que NO está en `rolesPresentes` ni en `asignacionesRol` → mostrar botón "Asignar contacto para rol X" que abre RolFaltanteModal; al asignar push a asignacionesRol y marcar el rol resuelto.
       - Validación de completitud (D-07): contar variables sin valor resuelto (input vacío) + roles sin asignar = `faltan`. Botón "Generar" deshabilitado si `faltan>0`, etiqueta `faltan>0 ? 'Generar (faltan '+faltan+')' : 'Generar'`.
       - Aviso al pie si `camposNuevos.length>0`: "Se crearán N nuevos campos en el esquema." (D-09 UX).
       - onSubmit: `await generarDocumento(expedienteId, { plantillaId: plantilla._id, nombre: nombreDoc, valores, asignacionesRol, camposNuevos })` y redirigir a `/expedientes/${expedienteId}`.
    4. `app/(app)/expedientes/[id]/documentos/nuevo/page.tsx` (D-05): client component. Carga `getExpediente(id)` y `listPlantillas()`; un `<select>` para elegir plantilla; al elegir carga `getPlantilla(plantillaId)` (con variablesDetectadas) y resuelve `contactoFieldsByRol` (para cada vínculo, fetch contacto y mapear campos base/parametros). Renderiza `<GeneracionForm />`. `params` es síncrono en Next.js 14.
    5. Test `apps/frontend/__tests__/documentos/GeneracionForm.test.tsx` (Vitest + RTL):
       - Renderiza secciones por tipoObjeto (al menos "Datos del expediente").
       - Botón Generar deshabilitado con etiqueta "Generar (faltan N)" cuando hay campos vacíos.
       - Al rellenar todos los campos requeridos el botón se habilita y muestra "Generar".
       (Mockear lib/api/documentos.generarDocumento.)
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter frontend test -- GeneracionForm</automated>
  </verify>
  <acceptance_criteria>
    - `grep 'groupByTipoObjeto' apps/frontend/components/documentos/GeneracionForm.tsx` existe (D-02)
    - `grep 'faltan' apps/frontend/components/documentos/GeneracionForm.tsx` existe (D-07 contador)
    - `grep 'RolFaltanteModal' apps/frontend/components/documentos/GeneracionForm.tsx` existe (D-06)
    - `grep 'nuevo' apps/frontend/components/documentos/GeneracionFormSection.tsx` existe (badge D-08)
    - `apps/frontend/app/(app)/expedientes/[id]/documentos/nuevo/page.tsx` existe
    - `pnpm --filter frontend test -- GeneracionForm` pasa
  </acceptance_criteria>
  <done>Formulario de generación con secciones, modal de rol, badge nuevo, contador de faltantes y página; test verde.</done>
</task>

<task type="auto">
  <name>Task 3: DocumentosList + integración en ExpedienteTabs (descarga + subida)</name>
  <read_first>
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx (estructura de pestañas; recibe expediente con documentos[])
    - apps/frontend/lib/api/documentos.ts (listDocumentos, downloadDocumento, uploadDocumento, deleteDocumento)
    - apps/frontend/components/expedientes/ContactosVinculadosTab.tsx (patrón tab que lista + usa react-query)
  </read_first>
  <action>
    1. `components/documentos/DocumentosList.tsx`:
       - Props `{ expedienteId }`. `useQuery(['documentos', expedienteId], () => listDocumentos(expedienteId))`.
       - Renderiza tabla/lista: nombre, tipo (badge generado/subido), formato, fechaCreacion. Por fila botón "Descargar" → `const {url}=await downloadDocumento(doc._id); window.open(url, '_blank');` (DOC-05). Botón "Eliminar" → deleteDocumento + invalidate.
       - Cabecera: botón "Generar documento" → `router.push('/expedientes/'+expedienteId+'/documentos/nuevo')`.
       - Input de subida (DOC-06): `<input type="file" accept=".docx,.pdf,.txt">` + campo nombre → `uploadDocumento(expedienteId, file, nombre)` + invalidate. Mostrar error legible si ApiError (extensión no permitida → 400).
       - Estado vacío: "No hay documentos todavía."
    2. En `ExpedienteTabs.tsx` añadir/poblar la pestaña "Documentos" para renderizar `<DocumentosList expedienteId={expediente._id} />` (reemplaza el placeholder vacío de EXPE-07). Si la pestaña no existe aún, añadirla junto a Contactos/Parámetros.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter frontend build && pnpm --filter frontend lint</automated>
  </verify>
  <acceptance_criteria>
    - `grep 'downloadDocumento' apps/frontend/components/documentos/DocumentosList.tsx` existe (DOC-05)
    - `grep 'uploadDocumento' apps/frontend/components/documentos/DocumentosList.tsx` existe (DOC-06)
    - `grep 'accept=".docx,.pdf,.txt"' apps/frontend/components/documentos/DocumentosList.tsx` existe
    - `grep 'documentos/nuevo' apps/frontend/components/documentos/DocumentosList.tsx` existe (botón generar)
    - `grep 'DocumentosList' apps/frontend/components/expedientes/ExpedienteTabs.tsx` existe (EXPE-07)
    - `pnpm --filter frontend build` y `pnpm --filter frontend lint` salen 0
  </acceptance_criteria>
  <done>Pestaña Documentos lista documentos reales con descarga, subida y acceso al formulario de generación.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: UAT — flujo completo de generación, descarga y subida</name>
  <action>Checkpoint de verificación humana. Tras completar las Tasks 1-3, arrancar backend+Mongo+MinIO y pausar para que el usuario ejecute manualmente los pasos de <how-to-verify>. No continuar hasta recibir la señal de reanudación.</action>
  <what-built>
    Flujo completo de generación de documentos en la UI: formulario por secciones con pre-relleno (DOC-01), modal de rol faltante (DOC-02), campos nuevos con badge + selector de tipo (DOC-03), botón Generar con contador, página /expedientes/[id]/documentos/nuevo (D-05), pestaña Documentos con descarga (DOC-05) y subida (DOC-06).
  </what-built>
  <how-to-verify>
    Requiere backend + Mongo + MinIO corriendo (`docker compose up` o `pnpm dev` con servicios).
    1. Crear una plantilla con variables `{{expediente.nombre}}`, `{{expediente.honorariosBase}}` (campo nuevo) y `{{contacto.vendedor.nombre}}`.
    2. En un expediente SIN contacto con rol "vendedor", ir a la pestaña Documentos → "Generar documento".
    3. Elegir la plantilla. Verificar: secciones "Datos del expediente" / "Contactos por rol"; `expediente.nombre` pre-rellenado; `honorariosBase` con badge "nuevo" + selector de tipo.
    4. Verificar que el botón muestra "Generar (faltan N)" y está deshabilitado.
    5. Pulsar asignar contacto para rol "vendedor" → modal: buscar uno existente o crear básico (nombre + NIF). Asignar.
    6. Rellenar campos restantes → botón pasa a "Generar" habilitado.
    7. Generar → redirige al expediente; el documento aparece en la pestaña Documentos.
    8. Pulsar "Descargar" → se abre/descarga el .docx con las variables sustituidas correctamente.
    9. Subir un .docx/.pdf/.txt preexistente → aparece como tipo "subido".
    10. Intentar subir un .exe → error legible.
  </how-to-verify>
  <resume-signal>Escribe "approved" o describe los problemas encontrados.</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter frontend test -- preRelleno` y `-- GeneracionForm` verdes.
- `pnpm --filter frontend build` + `pnpm --filter frontend lint` salen 0.
- UAT humano aprobado (flujo end-to-end con backend real).
</verification>

<success_criteria>
- DOC-01: formulario agrupado por tipoObjeto con pre-relleno desde expediente/contactos.
- DOC-02: modal de rol faltante (buscar/crear) + botón Generar bloqueado con contador.
- DOC-03: campos nuevos con badge + selector de tipo; declarados al generar (backend 06-01).
- DOC-05: descarga vía presigned URL desde la pestaña Documentos.
- DOC-06: subida de documento preexistente con validación de extensión.
</success_criteria>

<output>
After completion, create `.planning/phases/06-generaci-n-y-documentos/06-03-SUMMARY.md`
</output>
