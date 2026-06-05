---
phase: 06-generaci-n-y-documentos
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/package.json
  - apps/backend/src/common/storage/storage.service.ts
  - packages/shared-types/src/documento.ts
  - packages/shared-types/src/index.ts
  - packages/shared-validation/src/documentos.ts
  - packages/shared-validation/src/index.ts
  - apps/backend/src/modules/documentos/schemas/documento.schema.ts
  - apps/backend/src/modules/documentos/documentos.repository.ts
  - apps/backend/src/modules/documentos/generation/generation.service.ts
  - apps/backend/src/modules/documentos/tests/generation.service.spec.ts
autonomous: true
requirements: [DOC-01, DOC-03, DOC-04, DOC-07]
must_haves:
  truths:
    - "El sistema construye un JSON de contexto (datosCongelados) a partir de expediente + contactos por rol + overrides del usuario"
    - "El sistema renderiza un .docx con docxtemplater usando ese JSON y lo sube a MinIO con storagePath documentos/generados/{id}/{slug}.docx"
    - "Variables nuevas (campo inexistente en esquema) se auto-declaran vía EsquemasService.addParametro al generar"
    - "datosCongelados se persiste tal cual el JSON renderizado y nunca se muta tras la generación"
    - "Plantillas con storagePath=null generan un .docx base on-the-fly vía textoToDocxBuffer antes de renderizar"
  artifacts:
    - path: "apps/backend/src/modules/documentos/generation/generation.service.ts"
      provides: "Pipeline buildContext + render docxtemplater + upload MinIO + auto-declare esquema"
      min_lines: 80
    - path: "apps/backend/src/modules/documentos/schemas/documento.schema.ts"
      provides: "Mongoose schema documentos (DATOS §4.5) con softDeletePlugin + índices"
      contains: "datosCongelados"
    - path: "apps/backend/src/modules/documentos/documentos.repository.ts"
      provides: "create/findById/listByExpediente/softDelete"
    - path: "packages/shared-types/src/documento.ts"
      provides: "interface Documento + DocumentoListResponse + DatosCongelados"
      contains: "datosCongelados"
    - path: "apps/backend/src/common/storage/storage.service.ts"
      provides: "getObject(key): Promise<Buffer> añadido"
      contains: "getObject"
  key_links:
    - from: "generation.service.ts"
      to: "StorageService.putObject + getObject"
      via: "constructor inject"
      pattern: "storage\\.(putObject|getObject)"
    - from: "generation.service.ts"
      to: "EsquemasService.addParametro"
      via: "auto-declare campos nuevos (DOC-03)"
      pattern: "addParametro"
    - from: "generation.service.ts"
      to: "docxtemplater render"
      via: "PizZip + Docxtemplater"
      pattern: "doc\\.render"
---

<objective>
Construir el núcleo del pipeline de generación de documentos: instalar docxtemplater + pizzip, añadir `getObject` a StorageService, crear los tipos compartidos (`Documento`, `DatosCongelados`) y los DTOs Zod, el schema Mongoose `documentos` con repository, y el `GenerationService` que construye el JSON de contexto (datosCongelados), renderiza el `.docx`, lo sube a MinIO y auto-declara campos nuevos en el esquema dinámico.

Purpose: Es el corazón funcional de Lexscribe (DOC-04, DOC-07). Sin este pipeline no hay generación. `datosCongelados` inmutable satisface DOC-07 por diseño estructural.
Output: Dependencias instaladas, StorageService.getObject, tipos+DTOs compartidos, schema+repo documentos, GenerationService con tests unitarios.
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
@.planning/phases/06-generaci-n-y-documentos/06-RESEARCH.md
@docs/DATOS.md
@docs/FUNCIONAL.md
@docs/ARQUITECTURA.md

<interfaces>
<!-- Contratos exactos del codebase. El executor los usa directamente — sin exploración. -->

StorageService (apps/backend/src/common/storage/storage.service.ts) — ya implementado:
```typescript
async putObject(key: string, body: Buffer, contentType: string): Promise<string>;   // returns key
async getPresignedUrl(key: string, ttlSeconds = 300): Promise<string>;
// this.s3: S3Client ; this.bucket: string ; GetObjectCommand ya importado de @aws-sdk/client-s3
// AÑADIR: getObject(key): Promise<Buffer>
```

EsquemasService (apps/backend/src/modules/esquemas/esquemas.service.ts) — ya implementado, idempotente:
```typescript
async addParametro(usuarioId: string | Types.ObjectId, tipoObjeto: 'expediente' | 'contacto',
  dto: { nombre: string; tipoDato: 'texto'|'numero'|'fecha'|'booleano'; obligatorio: boolean }): Promise<EsquemaDocument>;
// lanza ConflictError si nombre existe con tipoDato distinto
```

parseVariables / groupByTipoObjeto (packages/shared-validation/src/variable-parser.ts):
```typescript
interface VariableDetectada { raw: string; tipoObjeto: string; rol: string | null; campo: string; esArray: boolean; valido: boolean; linea: number; columna: number; }
function parseVariables(texto: string): VariableDetectada[];
function groupByTipoObjeto(vars: VariableDetectada[]): { tipoObjeto: string; valido: boolean; variables: VariableDetectada[] }[];
```

conversion.ts (apps/backend/src/modules/plantillas/conversion.ts) — REUSAR:
```typescript
export async function textoToDocxBuffer(texto: string): Promise<Buffer>;   // plain text → .docx base (D-01)
export async function docxToTexto(buffer: Buffer): Promise<string>;
```

Plantilla schema (variablesDetectadas subdoc): { raw, tipoObjeto, rol|null, campo, esArray }. storagePath: string|null. contenido: string (texto plano con {{...}}).

slugify (apps/backend/src/modules/plantillas/plantillas.service.ts, privada — COPIAR la implementación de 5 líneas, Pitfall 7):
```typescript
function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}
```

Documento schema target (DATOS §4.5):
campos: usuarioId, expedienteId, nombre, tipo:'generado'|'subido', plantillaId:ObjectId|null,
datosCongelados:Object|null, clausulasUsadas:[ObjectId]|null, storagePath:string,
formato:'docx'|'pdf'|'txt'. + softDeletePlugin (activo, fechaInactivacion) + timestamps {createdAt:'fechaCreacion', updatedAt:'fechaActualizacion'} + minimize:false.
Índices: { expedienteId:1, fechaCreacion:-1 } y { plantillaId:1 }.

Patrón de schema/repo: ver plantilla.schema.ts y expedientes.repository.ts (toObjectId helper, returnDocument:'after').
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Instalar dependencias y añadir StorageService.getObject</name>
  <read_first>
    - apps/backend/src/common/storage/storage.service.ts (estado actual: putObject + getPresignedUrl; GetObjectCommand ya importado)
    - apps/backend/package.json (confirmar docx ^9, mammoth ^1.8, @aws-sdk/* ^3.658 ya presentes; docxtemplater/pizzip ausentes)
    - .planning/phases/06-generaci-n-y-documentos/06-RESEARCH.md §"StorageService.getObject" (código verbatim)
  </read_first>
  <action>
    1. Instalar dependencias desde la raíz del monorepo:
       `pnpm --filter backend add docxtemplater@3.68.7 pizzip@3.2.0`
       `pnpm --filter backend add -D @types/pizzip`
    2. En `apps/backend/src/common/storage/storage.service.ts` añadir el método `getObject` (Pitfall 2 del research). `GetObjectCommand` YA está importado de `@aws-sdk/client-s3`. Añadir import `import { Readable } from 'stream';` al inicio. Insertar después de `getPresignedUrl`:
    ```typescript
    /**
     * Download an object from MinIO into a Buffer (Phase 6 — load template .docx for docxtemplater).
     * @param key Storage key
     * @returns Object contents as Buffer
     */
    async getObject(key: string): Promise<Buffer> {
      const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const stream = response.Body as Readable;
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }
    ```
    3. No cambiar la guarda `NODE_ENV==='test'` de onModuleInit.
  </action>
  <verify>
    <automated>cd apps/backend && node -e "const p=require('./package.json'); if(!p.dependencies.docxtemplater||!p.dependencies.pizzip) process.exit(1)" && pnpm --filter backend exec tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <acceptance_criteria>
    - `grep '"docxtemplater"' apps/backend/package.json` devuelve la versión 3.68.7
    - `grep '"pizzip"' apps/backend/package.json` devuelve 3.2.0
    - `grep 'async getObject' apps/backend/src/common/storage/storage.service.ts` existe
    - `grep "from 'stream'" apps/backend/src/common/storage/storage.service.ts` existe
    - `pnpm --filter backend exec tsc --noEmit` pasa sin errores
  </acceptance_criteria>
  <done>docxtemplater + pizzip instalados; StorageService.getObject implementado; backend type-checks.</done>
</task>

<task type="auto">
  <name>Task 2: Tipos compartidos (Documento, DatosCongelados) + DTOs Zod de generación</name>
  <read_first>
    - packages/shared-types/src/expediente.ts (patrón de interfaces + ExpedienteDetailResponse.documentos: unknown[] a actualizar)
    - packages/shared-types/src/index.ts (re-exports)
    - packages/shared-validation/src/plantillas.ts (patrón de DTOs Zod con createZodDto / z.infer)
    - packages/shared-validation/src/index.ts (re-exports)
    - docs/DATOS.md §4.5 (campos de documentos)
  </read_first>
  <action>
    1. Crear `packages/shared-types/src/documento.ts`:
    ```typescript
    export interface DatosCongelados {
      expediente: Record<string, unknown>;
      contacto: Record<string, Record<string, unknown>>;
      clausula: Record<string, Record<string, unknown>>;
      fecha: Record<string, unknown>;
    }

    export interface Documento {
      _id: string;
      usuarioId: string;
      expedienteId: string;
      nombre: string;
      tipo: 'generado' | 'subido';
      plantillaId: string | null;
      datosCongelados: DatosCongelados | null;
      clausulasUsadas: string[] | null;
      storagePath: string;
      formato: 'docx' | 'pdf' | 'txt';
      activo: boolean;
      fechaCreacion: string;
      fechaActualizacion: string;
    }

    export interface DocumentoListResponse {
      items: Documento[];
      total: number;
      page: number;
      limit: number;
    }

    export interface DownloadUrlResponse {
      url: string;
    }
    ```
    2. En `packages/shared-types/src/index.ts` añadir `export * from './documento';`. También cambiar en `expediente.ts` la línea `documentos: unknown[];` por `documentos: Documento[];` e importar `import type { Documento } from './documento';` al inicio del archivo expediente.ts.
    3. Crear `packages/shared-validation/src/documentos.ts` con DTOs Zod (mismo estilo que plantillas.ts):
    ```typescript
    import { z } from 'zod';

    // DOC-03: campo nuevo declarado en formulario (tipoDato + valor)
    export const NuevoCampoSchema = z.object({
      tipoObjeto: z.enum(['expediente', 'contacto']),
      rol: z.string().min(1).nullable().optional(),
      nombre: z.string().min(1),
      tipoDato: z.enum(['texto', 'numero', 'fecha', 'booleano']).default('texto'),
    });

    // POST /documentos/generar/:expedienteId
    export const GenerateDocumentoSchema = z.object({
      plantillaId: z.string().length(24),
      nombre: z.string().min(1),
      // valores resueltos por el usuario en el formulario, estructura por tipoObjeto:
      // { expediente: {campo: valor}, contacto: { [rol]: {campo: valor} }, fecha: {campo: valor} }
      valores: z.object({
        expediente: z.record(z.unknown()).default({}),
        contacto: z.record(z.record(z.unknown())).default({}),
        clausula: z.record(z.record(z.unknown())).default({}),
        fecha: z.record(z.unknown()).default({}),
      }),
      // asignaciones de rol creadas/elegidas en el modal D-06 (contactoId por rol)
      asignacionesRol: z.array(z.object({ rol: z.string().min(1), contactoId: z.string().length(24) })).default([]),
      // campos nuevos a auto-declarar en esquema (DOC-03)
      camposNuevos: z.array(NuevoCampoSchema).default([]),
    });
    export type GenerateDocumentoInput = z.infer<typeof GenerateDocumentoSchema>;

    export const QueryDocumentoSchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });
    export type QueryDocumentoInput = z.infer<typeof QueryDocumentoSchema>;

    export const UploadDocumentoMetaSchema = z.object({
      nombre: z.string().min(1),
    });
    export type UploadDocumentoMetaInput = z.infer<typeof UploadDocumentoMetaSchema>;
    ```
    4. En `packages/shared-validation/src/index.ts` añadir `export * from './documentos';`.
    5. Compilar ambos paquetes: `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build`.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build</automated>
  </verify>
  <acceptance_criteria>
    - `grep 'interface DatosCongelados' packages/shared-types/src/documento.ts` existe
    - `grep 'documentos: Documento\[\]' packages/shared-types/src/expediente.ts` existe (ya NO unknown[])
    - `grep 'GenerateDocumentoSchema' packages/shared-validation/src/documentos.ts` existe
    - `grep "export \* from './documento'" packages/shared-types/src/index.ts` existe
    - `grep "export \* from './documentos'" packages/shared-validation/src/index.ts` existe
    - Ambos `pnpm --filter ... build` salen con código 0
  </acceptance_criteria>
  <done>Tipos Documento/DatosCongelados y DTOs Zod compartidos compilan; ExpedienteDetailResponse.documentos tipado como Documento[].</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Schema documentos, repository y GenerationService (pipeline docxtemplater)</name>
  <read_first>
    - apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts (patrón @Schema + softDeletePlugin + índices + minimize:false)
    - apps/backend/src/modules/expedientes/expedientes.repository.ts (patrón repository: toObjectId, returnDocument:'after')
    - apps/backend/src/modules/plantillas/conversion.ts (textoToDocxBuffer para D-01)
    - apps/backend/src/modules/esquemas/esquemas.service.ts (addParametro signature, idempotente)
    - apps/backend/src/modules/plantillas/plantillas.service.ts (slugify privada — copiar)
    - apps/backend/src/modules/plantillas/plantillas.service.spec.ts (patrón de spec unitario con mocks)
    - .planning/phases/06-generaci-n-y-documentos/06-RESEARCH.md §"Pattern 1/2/4" + "Pitfall 4"
  </read_first>
  <behavior>
    generation.service.spec.ts (mockear StorageService, EsquemasService, repos; mockear docxtemplater render):
    - Test 1 (DOC-04): genera buildContext con estructura { expediente, contacto:{[rol]:{}}, clausula, fecha } a partir de expediente.parametros + nombre + fechaCreacion + valores del formulario + overrides.
    - Test 2 (DOC-04): cuando plantilla.storagePath != null → llama storage.getObject; cuando storagePath == null → llama textoToDocxBuffer(plantilla.contenido).
    - Test 3 (DOC-04): tras render exitoso, llama storage.putObject con key `documentos/generados/{documentoId}/{slug}.docx` y persiste documento con datosCongelados === el JSON de contexto, tipo:'generado', formato:'docx'.
    - Test 4 (DOC-07): el objeto datosCongelados persistido es exactamente el contexto pasado a render (snapshot inmutable; mutar el expediente después no cambia datosCongelados — verificar igualdad estructural con el contexto capturado).
    - Test 5 (DOC-03): por cada entrada en camposNuevos, llama esquemas.addParametro(uid, campoNuevo.tipoObjeto, {nombre, tipoDato, obligatorio:false}) antes/durante la generación.
    - Test 6 (Pitfall 4): si una variable de plantilla.variablesDetectadas no resuelve en el contexto (undefined/null/''), lanza ValidationError (NO llama render).
  </behavior>
  <action>
    1. Crear `apps/backend/src/modules/documentos/schemas/documento.schema.ts` siguiendo el patrón de plantilla.schema.ts:
       - `@Schema({ collection:'documentos', timestamps:{createdAt:'fechaCreacion', updatedAt:'fechaActualizacion'}, minimize:false })`.
       - Props: `usuarioId: Types.ObjectId (ref 'Usuario', required)`, `expedienteId: Types.ObjectId (ref 'Expediente', required)`, `nombre: String required`, `tipo: String enum ['generado','subido'] required`, `plantillaId: Types.ObjectId ref 'Plantilla' default null`, `datosCongelados: Object default null`, `clausulasUsadas: [Types.ObjectId] ref 'Clausula' default null`, `storagePath: String required`, `formato: String enum ['docx','pdf','txt'] required`.
       - `DocumentoSchema.plugin(softDeletePlugin)`.
       - `DocumentoSchema.index({ expedienteId:1, fechaCreacion:-1 })` y `DocumentoSchema.index({ plantillaId:1 })`.
       - Exportar `Documento`, `DocumentoDocument = HydratedDocument<Documento>`, `DocumentoSchema`.
    2. Crear `apps/backend/src/modules/documentos/documentos.repository.ts` (patrón expedientes.repository.ts con `toObjectId`):
       - `create(usuarioId, data): Promise<DocumentoDocument>` (data incluye expedienteId, nombre, tipo, plantillaId?, datosCongelados?, clausulasUsadas?, storagePath, formato).
       - `findById(usuarioId, id): Promise<DocumentoDocument | null>`.
       - `listByExpediente(usuarioId, expedienteId, {page, limit}): Promise<{items, total}>` ordenado `{ fechaCreacion: -1 }` con skip/limit.
       - `softDelete(usuarioId, id): Promise<DocumentoDocument | null>` con `$set:{activo:false, fechaInactivacion:new Date()}`, `returnDocument:'after'`.
       - `updateStoragePath(id, key)` NO necesario aquí (el documentoId se conoce tras create — generar create con storagePath placeholder y luego update, O crear el _id con `new Types.ObjectId()` ANTES y construir el key; usar la segunda: generar `const docId = new Types.ObjectId()` en el service, build key, putObject, luego create con `_id: docId`). Añadir soporte de `_id` opcional en create.
    3. Crear `apps/backend/src/modules/documentos/generation/generation.service.ts`:
       - Constructor inyecta: `PlantillasService` (getById), `ExpedientesRepository` (findById), `ContactosRepository` (findById), `EsquemasService` (addParametro), `StorageService` (getObject/putObject), `DocumentosRepository` (create).
       - Copiar la función privada `slugify` (5 líneas, ver interfaces).
       - Método público `async generar(usuarioId: string, expedienteId: string, dto: GenerateDocumentoInput): Promise<DocumentoDocument>`:
         a. Cargar plantilla activa via `PlantillasService.getById(usuarioId, dto.plantillaId)` (lanza NotFound si no existe).
         b. Cargar expediente via `ExpedientesRepository.findById(usuarioId, expedienteId)` (NotFoundError si null).
         c. DOC-03: por cada `dto.camposNuevos` → `await this.esquemas.addParametro(usuarioId, campo.tipoObjeto, { nombre: campo.nombre, tipoDato: campo.tipoDato, obligatorio: false })`.
         d. Construir `datosCongelados` (buildContext):
            ```
            {
              expediente: { nombre: exp.nombre, fechaCreacion: <ISO>, ...exp.parametros, ...dto.valores.expediente },
              contacto: dto.valores.contacto,   // { [rol]: { campo: valor } } resuelto por el formulario
              clausula: dto.valores.clausula,
              fecha: dto.valores.fecha,
            }
            ```
            (El pre-relleno vive en el frontend; el backend recibe `valores` ya resueltos. Las asignaciones de rol se materializan en 06-02.)
         e. Pitfall 4 — validación de completitud: por cada `v` de `plantilla.variablesDetectadas`, resolver el path en datosCongelados (expediente.campo → datosCongelados.expediente[campo]; contacto.rol.campo → datosCongelados.contacto[rol]?.[campo]; clausula.nombre.campo y fecha.campo análogos). Si algún valor es `undefined|null|''`, acumular `v.raw` y lanzar `ValidationError('Variables sin resolver: ' + lista.join(', '))`. NO llamar render.
         f. Obtener el buffer base de plantilla: `const baseBuffer = plantilla.storagePath ? await this.storage.getObject(plantilla.storagePath) : await textoToDocxBuffer(plantilla.contenido)` (D-01).
         g. Render docxtemplater (Pattern 1):
            ```typescript
            import PizZip from 'pizzip';
            import Docxtemplater from 'docxtemplater';
            const zip = new PizZip(baseBuffer);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
            doc.render(datosCongelados);
            const out: Buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            ```
         h. Generar `const docId = new Types.ObjectId();` ANTES del upload; key = `documentos/generados/${docId.toString()}/${slugify(dto.nombre)}.docx`.
         i. `await this.storage.putObject(key, out, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')`.
         j. `return this.repo.create(usuarioId, { _id: docId, expedienteId, nombre: dto.nombre, tipo: 'generado', plantillaId: dto.plantillaId, datosCongelados, clausulasUsadas: plantilla.clausulasReferenciadas.map(String) ?? null, storagePath: key, formato: 'docx' });`
       - Importar `ValidationError, NotFoundError` de `../../../common/errors`; `Types` de mongoose; `textoToDocxBuffer` de `../../plantillas/conversion`.
    4. Crear `apps/backend/src/modules/documentos/tests/generation.service.spec.ts` cubriendo Tests 1-6 del bloque <behavior>. Usar `jest.mock` o mocks de provider para docxtemplater/PizZip (mockear el módulo `docxtemplater` y `pizzip` para que `render` no lance y `generate` devuelva un Buffer). Mockear StorageService (putObject resuelve key, getObject resuelve Buffer vacío), EsquemasService.addParametro (jest.fn), repos.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend test -- generation.service.spec</automated>
  </verify>
  <acceptance_criteria>
    - `grep "collection: 'documentos'" apps/backend/src/modules/documentos/schemas/documento.schema.ts` existe
    - `grep 'DocumentoSchema.plugin(softDeletePlugin)' apps/backend/src/modules/documentos/schemas/documento.schema.ts` existe
    - `grep 'index({ expedienteId: 1, fechaCreacion: -1 })' apps/backend/src/modules/documentos/schemas/documento.schema.ts` existe
    - `grep 'doc.render(datosCongelados)' apps/backend/src/modules/documentos/generation/generation.service.ts` existe
    - `grep 'documentos/generados/' apps/backend/src/modules/documentos/generation/generation.service.ts` existe
    - `grep 'addParametro' apps/backend/src/modules/documentos/generation/generation.service.ts` existe
    - `grep 'ValidationError' apps/backend/src/modules/documentos/generation/generation.service.ts` existe (Pitfall 4)
    - `pnpm --filter backend test -- generation.service.spec` pasa los 6 tests (DOC-01/03/04/07)
  </acceptance_criteria>
  <done>Schema+repo documentos creados; GenerationService renderiza, valida completitud, sube a MinIO, auto-declara campos nuevos y persiste datosCongelados inmutable; spec verde.</done>
</task>

</tasks>

<verification>
- `pnpm --filter backend exec tsc --noEmit` pasa (backend type-checks con nuevas deps).
- `pnpm --filter @lexscribe/shared-types build` y `pnpm --filter @lexscribe/shared-validation build` salen 0.
- `pnpm --filter backend test -- generation.service.spec` verde (6 tests).
- StorageService.getObject existe; docxtemplater + pizzip en package.json.
</verification>

<success_criteria>
- DOC-04 (parcial): GenerationService renderiza .docx via docxtemplater + sube a MinIO + persiste datosCongelados (orquestación HTTP en 06-02).
- DOC-07: datosCongelados se persiste tal cual y nunca se muta (verificado por test).
- DOC-03 (backend): camposNuevos auto-declarados via EsquemasService.addParametro.
- DOC-01 (backend): buildContext estructura el JSON por tipoObjeto.
</success_criteria>

<output>
After completion, create `.planning/phases/06-generaci-n-y-documentos/06-01-SUMMARY.md`
</output>
