# Phase 6: Generación y Documentos — Research

**Researched:** 2026-06-02
**Domain:** Document generation pipeline (docxtemplater, MinIO, NestJS, Next.js)
**Confidence:** HIGH — all findings verified against codebase + npm registry

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Pipeline de generación (DOC-04)
- **D-01:** Cuando `storagePath = null` (plantilla pegada/txt), el `GenerationService` genera un `.docx` mínimo en memoria usando `docx` (npm) on-the-fly antes de pasar a docxtemplater. Sin cambios en Phase 5, sin migración de datos.
- Storage key del documento generado: `documentos/generados/{documentoId}/{nombreSlug}.docx`
- Storage key del documento subido: `documentos/subidos/{documentoId}/{nombreSlug}.{ext}`

#### Formulario de generación — estructura (DOC-01)
- **D-02:** Secciones por tipoObjeto: "Datos del expediente" | "Contactos por rol" | "Cláusulas" | "Fechas". Generadas dinámicamente via `groupByTipoObjeto(plantilla.variablesDetectadas)`.
- **D-03:** Pre-relleno máximo: `expediente.campo` desde `expediente.parametros`; `contacto.rol.campo` desde contacto con ese `rol` exacto en el expediente.
- **D-04:** Nombre del documento auto-generado como `{nombrePlantilla} - {YYYY-MM-DD}`, editable por el usuario.
- **D-05:** Ruta de formulario: `/expedientes/[id]/documentos/nuevo` (nueva página Next.js App Router).

#### Roles no asignados en expediente (DOC-02)
- **D-06:** Modal inline con dos opciones: buscar contacto existente / crear contacto básico (nombre + NIF mínimo). El contacto se vincula al expediente con el rol durante la generación.
- **D-07:** Botón "Generar" deshabilitado con contador "Faltan X campos" hasta variables resueltas.

#### Variables nuevas en formulario (DOC-03)
- **D-08:** Campos no existentes en esquema se muestran inline con badge "nuevo" + mini-selector de tipo (texto | número | fecha | booleano). tipoDato por defecto: `texto`.
- **D-09:** Al generar, se auto-declara via `EsquemasService.addParametro` (FL-13 entrada C). Se muestra aviso de campos nuevos creados.

#### Claude's Discretion
- Estructura del JSON `datosCongelados`: `{ expediente: {...}, contacto: { [rol]: {...} }, clausula: { [nombre]: {...} }, fecha: {...} }`.
- TTL presigned URL: 300s (5 min) — ya implementado en `StorageService.getPresignedUrl`.
- Orden documentos en expediente: por `fechaCreacion` descendente.
- Slugify nombre de archivo: misma función de Phase 5 (`plantillas.service.ts`).
- `DocumentosModule` importa `StorageModule` y `EsquemasModule` explícitamente (no global).
- `@Audited` en todos los endpoints write del módulo documentos.

### Deferred Ideas (OUT OF SCOPE)
- Edición/regeneración de documentos (F-080 post-MVP).
- Cálculo automático de fechas (Phase 7).
- Eventos de calendario desde documentos (Phase 7 FL-8/FL-9).
- Ninguna idea de scope creep surgió durante la discusión.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | Formulario de generación con pre-relleno desde expediente/contactos | `groupByTipoObjeto` ya existe en shared-validation; pre-relleno lee `expediente.parametros` + contactos por rol |
| DOC-02 | Roles requeridos: modal de asignación/creación de contacto; generación bloqueada si falta variable | Modal inline pattern; botón deshabilitado hasta validación completa |
| DOC-03 | Variables nuevas en formulario → añadidas al esquema dinámico (FL-13 entrada C) | `EsquemasService.addParametro` ya implementado e idempotente |
| DOC-04 | Generación .docx via docxtemplater + upload MinIO + registro `documentos` con `datosCongelados` | docxtemplater 3.68.7 (npm) + PizZip 3.2.0; `StorageService.putObject` listo; `docx` npm para on-the-fly base |
| DOC-05 | Descarga .docx via endpoint autenticado con presigned URL (5 min TTL) | `StorageService.getPresignedUrl(key, 300)` ya implementado |
| DOC-06 | Subida de documento preexistente (.docx/.pdf/.txt) a MinIO con tipo "subido" | `StorageService.putObject` + multer pattern ya establecido en PlantillasController |
| DOC-07 | Cambios posteriores en contactos/expediente NO afectan documentos ya generados | `datosCongelados` frozen JSON snapshot — inmutabilidad por diseño |
</phase_requirements>

---

## Summary

Phase 6 es el corazón funcional de Lexscribe: combina plantilla + expediente + contactos para producir un `.docx` con `datosCongelados` inmutables. La investigación del codebase confirma que los bloques de construcción clave ya existen: `StorageService` (putObject + getPresignedUrl), `groupByTipoObjeto` y `parseVariables` (shared-validation), `EsquemasService.addParametro`, `textoToDocxBuffer` (para plantillas pegadas), y el patrón NestJS modular (schema + repository + service + controller + DTOs Zod). Lo que falta es el módulo `documentos` y la UI del formulario de generación.

La pieza crítica nueva es `docxtemplater` (versión 3.68.7 en npm), que requiere `pizzip` como compañero. La variable `datosCongelados` es el JSON exacto que se pasa a docxtemplater y se persiste como snapshot inmutable — esto satisface DOC-07 por diseño estructural, sin lógica adicional. La generación on-the-fly para plantillas pegadas (D-01) usa el `textoToDocxBuffer` ya implementado en Phase 5 (`conversion.ts`).

**Primary recommendation:** Crear `DocumentosModule` siguiendo el patrón exacto de PlantillasModule, instalar `docxtemplater` + `pizzip`, encapsular la generación en `GenerationService` (submódulo interno), y construir el formulario Next.js como nueva página en `/expedientes/[id]/documentos/nuevo`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `docxtemplater` | 3.68.7 | Render variables `{{campo}}` en .docx base | Motor oficial del stack — ARQUITECTURA.md §2. Core gratuito MIT. |
| `pizzip` | 3.2.0 | Leer/escribir ZIP del .docx para docxtemplater | Dependencia requerida por docxtemplater; reemplaza JSZip |
| `@aws-sdk/client-s3` | ^3.658.0 | Upload/presigned URL MinIO | Ya instalado en backend (`package.json`) |
| `@aws-sdk/s3-request-presigner` | ^3.658.0 | Generar presigned URLs | Ya instalado en backend (`package.json`) |
| `docx` | ^9.0.0 | Generar .docx base en memoria (D-01: plantillas pegadas) | Ya instalado; `textoToDocxBuffer` ya implementado en `conversion.ts` |
| `mammoth` | ^1.8.0 | Extraer texto plano de .docx de plantilla | Ya instalado; `docxToTexto` ya implementado en `conversion.ts` |
| `multer` | (NestJS built-in via @nestjs/platform-express) | Subida multipart para DOC-06 | Patrón ya establecido en PlantillasController (`FileInterceptor`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@lexscribe/shared-validation` | workspace:* | `parseVariables`, `groupByTipoObjeto`, Zod schemas | DTOs del formulario de generación; validación variables |
| `@lexscribe/shared-types` | workspace:* | Tipos `Documento`, `ExpedienteDetailResponse` actualizado | Contrato frontend-backend |
| `nestjs-zod` | ^4.3.1 | `createZodDto` para DTOs | Patrón establecido en todo el backend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `docxtemplater` | `docx-templates` | docxtemplater es el elegido en ARQUITECTURA.md; no explorar alternativas |
| `pizzip` | `jszip` | docxtemplater 3.x requiere pizzip específicamente; jszip incompatible con dxt v3 |

**Installation (solo lo que falta):**
```bash
pnpm --filter backend add docxtemplater pizzip
pnpm --filter backend add -D @types/pizzip
```

**Versiones verificadas:**
```
docxtemplater: 3.68.7  (npm view, 2026-06-02)
pizzip:        3.2.0   (npm view, 2026-06-02)
```
`docx`, `mammoth`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` ya están en `apps/backend/package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/documentos/
├── documentos.module.ts          # imports StorageModule, EsquemasModule, PlantillasModule, ExpedientesModule, ContactosModule
├── documentos.controller.ts      # HTTP endpoints: generate, upload, getById, download, delete
├── documentos.service.ts         # orchestration: GenerationService + upload flow
├── generation/
│   └── generation.service.ts     # docxtemplater pipeline: buildContext + render + upload
├── schemas/
│   └── documento.schema.ts       # Mongoose schema (DATOS §4.5)
├── dto/
│   ├── generate-documento.dto.ts # Zod: plantillaId, asignaciones de roles, valoresNuevos
│   ├── upload-documento.dto.ts   # Zod: nombre, descripcion
│   └── query-documento.dto.ts    # Zod: page, limit
└── tests/ (spec files collocated)
    ├── documentos.service.spec.ts
    ├── documentos.controller.spec.ts
    ├── generation.service.spec.ts
    └── documento.repository.spec.ts

apps/frontend/app/(app)/expedientes/[id]/
├── page.tsx                       # expediente detail (EXISTING — update documentos tab)
└── documentos/
    └── nuevo/
        └── page.tsx               # formulario generación (D-05)

apps/frontend/components/documentos/
├── GeneracionForm.tsx             # formulario principal agrupado por tipoObjeto
├── GeneracionFormSection.tsx      # sección por tipoObjeto (expediente/contacto/clausula/fecha)
├── RolFaltanteModal.tsx           # modal D-06: buscar/crear contacto
├── NuevoDocumentoPage.tsx         # wrapper con estado de generación
└── DocumentosList.tsx             # listado en pestaña "Documentos" del expediente

apps/frontend/lib/api/
└── documentos.ts                  # cliente HTTP tipado (generate, upload, download, list, delete)

packages/shared-types/src/
└── documento.ts                   # NEW: interface Documento + DocumentoListResponse
```

### Pattern 1: docxtemplater Render Pipeline

**What:** Cargar el .docx base (desde MinIO o generado on-the-fly), construir el JSON de contexto (datosCongelados), renderizar con docxtemplater, subir resultado a MinIO.

**When to use:** Siempre que tipo = "generado".

```typescript
// Source: docxtemplater docs (https://docxtemplater.com/docs/get-started-free/)
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

async function renderDocx(templateBuffer: Buffer, data: Record<string, unknown>): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const output = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  return output;
}
```

**Critical:** `doc.render()` throws synchronously if a variable is missing (by default). Use `nullGetter` option to handle missing vars gracefully OR validate context completeness BEFORE calling render.

```typescript
// Option A: validate before render (recommended — fail fast with meaningful error)
function validateContext(vars: VariableDetectada[], context: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const v of vars) {
    const val = resolveVar(v, context);
    if (val === undefined || val === null || val === '') missing.push(v.raw);
  }
  return missing;
}

// Option B: nullGetter (renders empty string for missing, never throws)
const doc = new Docxtemplater(zip, {
  nullGetter: () => '',  // DOC-07 doesn't need this — datosCongelados is complete by design
});
```

**Phase 6 recommendation:** Validate context completeness BEFORE render. If all variables resolve, render will succeed. This matches the "botón Generar deshabilitado" UX (D-07) and means server never needs nullGetter.

### Pattern 2: datosCongelados JSON Structure

**What:** El JSON completo que se pasa a docxtemplater se persiste como `datosCongelados`. La estructura sigue la sintaxis de variables (FUNCIONAL §5.2).

```typescript
// datosCongelados structure (Claude's Discretion — CONTEXT.md)
// Matches docxtemplater render data directly.
interface DatosCongelados {
  expediente: Record<string, unknown>;        // expediente.nombre, expediente.honorariosBase, ...
  contacto: Record<string, Record<string, unknown>>;  // contacto.vendedor.nombre, ...
  clausula: Record<string, Record<string, unknown>>;  // clausula.primera.texto, ...
  fecha: Record<string, unknown>;             // fecha.firma, ...
}

// Example:
const datosCongelados: DatosCongelados = {
  expediente: { nombre: 'Compraventa Piso Goya', honorariosBase: 1500 },
  contacto: {
    vendedor:  { nombre: 'Ana López', nif: '12345678A' },
    comprador: { nombre: 'Luis Pérez', nif: '87654321B' },
  },
  clausula: {},
  fecha: {},
};
```

**Immutability:** `datosCongelados` is persisted at generation time and NEVER mutated. When a contacto's NIF changes later, the frozen JSON is untouched. This is why DOC-07 is satisfied structurally.

### Pattern 3: Presigned URL Download (DOC-05)

```typescript
// StorageService.getPresignedUrl already implemented — Phase 6 calls it directly
// ARQUITECTURA.md §8.3: endpoint /api/v1/documentos/:id/download

@Get(':id/download')
@Audited('documento', 'update')  // or omit audit for reads
async download(@CurrentUser('id') uid: string, @Param('id', MongoIdPipe) id: string) {
  const doc = await this.service.getById(uid, id);
  if (!doc) throw new NotFoundError('documento', id);
  const url = await this.storage.getPresignedUrl(doc.storagePath, 300); // 5 min TTL
  // Either redirect to presigned URL or return it as JSON
  return { url };
}
```

The frontend opens the presigned URL (window.open or anchor download) within the 5-minute window.

### Pattern 4: On-the-Fly .docx Base (D-01)

When `plantilla.storagePath === null` (pegado/txt origin), the service must generate a base `.docx` before passing to docxtemplater:

```typescript
// textoToDocxBuffer already exists in conversion.ts — reuse directly
import { textoToDocxBuffer } from '../plantillas/conversion';

async function getTemplateBuffer(plantilla: PlantillaDocument, storage: StorageService): Promise<Buffer> {
  if (plantilla.storagePath) {
    // Has original .docx in MinIO — download it
    return storage.getObject(plantilla.storagePath);  // needs getObject added to StorageService
  }
  // Pegado/txt — generate minimal .docx from plain text content
  return textoToDocxBuffer(plantilla.contenido);
}
```

**Note:** `StorageService` currently only has `putObject` and `getPresignedUrl`. For docxtemplater, the template buffer must be loaded into memory. `getObject` (download to buffer) needs to be added to `StorageService`. This is a small addition using `GetObjectCommand` + stream-to-buffer.

### Pattern 5: NestJS Module Wiring (DocumentosModule)

Following the PlantillasModule pattern exactly:

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Documento.name, schema: DocumentoSchema }]),
    AuditoriaModule,      // AuditInterceptor
    AuthModule,           // JwtAuthGuard
    EsquemasModule,       // EsquemasService.addParametro (DOC-03)
    StorageModule,        // StorageService (DOC-04, DOC-05, DOC-06)
    forwardRef(() => PlantillasModule),   // PlantillasService.getById
    forwardRef(() => ExpedientesModule),  // ExpedientesService.getById + linkContacto
    forwardRef(() => ContactosModule),    // ContactosRepository (modal D-06)
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository, GenerationService],
  exports: [DocumentosService, DocumentosRepository],  // ExpedientesModule reads docs
})
export class DocumentosModule {}
```

**forwardRef warning:** DocumentosModule needs ExpedientesModule (to read expediente + its contactos), and ExpedientesModule may need DocumentosModule (to list documentos in `getById`). This creates a circular dependency that requires `forwardRef` on both sides — precedent exists in ContactosModule ↔ ExpedientesModule (Phase 4 pattern).

### Pattern 6: Frontend — GeneracionForm

```typescript
// /expedientes/[id]/documentos/nuevo page
// Sections generated dynamically from groupByTipoObjeto(plantilla.variablesDetectadas)

// Pre-fill logic:
function preRellenarFormulario(vars: VariableDetectada[], expediente: Expediente): FormValues {
  const values: FormValues = {};
  for (const v of vars) {
    if (v.tipoObjeto === 'expediente') {
      // expediente.campo → from expediente.parametros
      values[v.raw] = expediente.parametros[v.campo];
    } else if (v.tipoObjeto === 'contacto' && v.rol) {
      // contacto.rol.campo → find contacto with that rol in expediente.contactos
      const vinculo = expediente.contactos.find(c => c.rol === v.rol);
      if (vinculo) {
        // fetch contacto data and pre-fill v.campo from contacto.parametros or base fields
        values[v.raw] = getContactoField(vinculo.contactoId, v.campo);
      }
    }
  }
  return values;
}
```

### Anti-Patterns to Avoid

- **Storing MinIO path derived from content:** always use `{documentoId}` as path prefix, store `storagePath` in DB, never reconstruct it from nombres.
- **Mutating datosCongelados after generation:** NEVER update the `datosCongelados` field. It is frozen at generation time.
- **Calling docxtemplater with incomplete context:** validate all variables resolve before `doc.render()` — avoids opaque docxtemplater throw.
- **Importing StorageModule as @Global:** pattern says explicit import per module (documented STATE.md).
- **Streaming presigned URL through backend:** return the URL to the frontend and let the browser download directly from MinIO — avoids memory pressure for large files.
- **Using `getSignedUrl` for upload endpoint:** presigned URLs are for GET (download). Upload is always via `putObject` in the backend.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .docx variable substitution | Custom string replace in XML | `docxtemplater` | Handles nested XML, paragraphs, runs, XML escaping, nested loops — complex Open XML internals |
| ZIP manipulation of .docx | Custom ZIP reader | `pizzip` | docxtemplater 3.x requires PizZip specifically; pair required |
| Plain text → .docx base | Custom Open XML builder | `docx` npm (`textoToDocxBuffer`) | Already implemented in `conversion.ts` — reuse directly |
| .docx → plain text | Custom XML parser | `mammoth` (`docxToTexto`) | Already implemented — reuse directly |
| Temporary file download URLs | Proxy download through NestJS | MinIO presigned URL | Memory-efficient; MinIO serves directly to browser |
| Slugify function | Write new slugify | Reuse from `plantillas.service.ts` | Identical need; extract to shared util or copy pattern |

**Key insight:** docxtemplater handles all the Open XML complexity (escaping, nested document structure, paragraph wrapping). Any attempt to do string substitution directly on the XML inside a .docx WILL produce corrupted files due to XML splitting of text runs.

---

## Common Pitfalls

### Pitfall 1: docxtemplater Delimiter Conflict with `{{}}`

**What goes wrong:** The default delimiters in docxtemplater are `{{` and `}}` — which matches the project's variable syntax exactly. However, if the Word .docx was edited in an editor that splits text runs across XML elements, `{{variable}}` may become `<w:t>{{</w:t><w:t>variable</w:t><w:t>}}</w:t>` in the XML, making docxtemplater unable to find the tag.

**Why it happens:** Word editors split runs for formatting reasons (e.g., spell-check, autocorrect). mammoth's `extractRawText` doesn't show this, but the underlying XML does.

**How to avoid:** Always test with a real .docx file. If variables are not resolved, inspect the docx XML. For `storagePath=null` (generated from text via `textoToDocxBuffer`), this is never a problem because the docx is generated programmatically with clean runs.

**Warning signs:** `TemplateError: Multi error` from docxtemplater with "unclosed tag" or "unopened tag" errors.

**Mitigation:** If this becomes an issue, docxtemplater's `@lexscribe` pipeline can pre-process: upload the .docx through an "unwrap runs" step. For MVP, it's acceptable to document that users should avoid heavy formatting inside `{{` markers.

### Pitfall 2: StorageService Missing `getObject` Method

**What goes wrong:** `StorageService` currently only has `putObject` and `getPresignedUrl`. To download the template buffer for docxtemplater rendering, the service needs `getObject(key): Promise<Buffer>`.

**Why it happens:** Phase 5 never needed to download files — it only uploaded them.

**How to avoid:** Add `getObject` to `StorageService` before writing `GenerationService`. Uses `GetObjectCommand` + stream conversion:

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

async getObject(key: string): Promise<Buffer> {
  const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
  const stream = response.Body as Readable;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

In tests, mock `getObject` alongside `putObject` and `getPresignedUrl`.

### Pitfall 3: Circular DI Between DocumentosModule and ExpedientesModule

**What goes wrong:** `ExpedientesService.getById` returns `documentos: []` (placeholder). In Phase 6, `getById` should return real `documentos`. But DocumentosModule needs ExpedientesModule to read the expediente, and ExpedientesModule needs DocumentosModule to populate documentos. Classic circular dependency.

**Why it happens:** Bidirectional module dependency.

**How to avoid:** Use `forwardRef()` on both sides — precedent in ContactosModule ↔ ExpedientesModule (Phase 4, STATE.md). DocumentosModule exports `DocumentosService`; ExpedientesModule imports `forwardRef(() => DocumentosModule)` and calls `DocumentosService.listByExpediente`.

**Alternative (simpler):** ExpedientesService.getById fetches documentos directly from DocumentosRepository (not through DocumentosService), breaking the service-level circular dependency. Requires DocumentosModule to export DocumentosRepository.

### Pitfall 4: datosCongelados Completeness Validation

**What goes wrong:** If `doc.render()` is called with a context where a variable path doesn't exist, docxtemplater throws a TemplateError. Alternatively, if `nullGetter` is configured, missing vars render as empty string silently — the document is generated with blank fields.

**Why it happens:** The frontend validation (D-07) prevents the user from submitting with missing fields, but the backend must also validate as defense-in-depth.

**How to avoid:** Before calling `doc.render()`, iterate `plantilla.variablesDetectadas` and check each path resolves in the context JSON. If any path is missing, throw `ValidationError` (400) listing the unresolved variables.

### Pitfall 5: MIME Types for Document Upload (DOC-06)

**What goes wrong:** Browser uploads may send incorrect MIME types for `.docx` files (e.g., `application/zip` or `application/octet-stream` instead of the correct `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

**Why it happens:** MIME type detection varies by browser and OS.

**How to avoid:** Accept files by extension validation (`.docx`, `.pdf`, `.txt`) on the backend, not by MIME type alone. Store the MIME type that corresponds to the extension, not what the browser reports.

```typescript
const MIME_BY_EXT: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};
```

### Pitfall 6: forwardRef with PlantillasModule

**What goes wrong:** DocumentosModule needs PlantillasService (to load plantilla + variablesDetectadas). PlantillasModule exports PlantillasService. No circular dependency here — DocumentosModule imports PlantillasModule without forwardRef needed. However, PlantillasModule.exports must include PlantillasService (it does — confirmed in codebase).

**How to avoid:** Import PlantillasModule directly (no forwardRef needed). The circular risk is only with ExpedientesModule.

### Pitfall 7: `slugify` Function Not in Shared Package

**What goes wrong:** The `slugify` function exists inside `plantillas.service.ts` (private, not exported). DocumentosService needs the same function for storage keys.

**How to avoid:** Two options: (a) extract to `apps/backend/src/common/utils/slugify.ts` and import in both services, or (b) copy the 5-line implementation directly into `documentos.service.ts`. Given the project's "keep files under 500 lines" and simplicity preference, option (b) is acceptable for MVP.

---

## Code Examples

### docxtemplater Minimal Usage (verified against npm docs)

```typescript
// Source: https://docxtemplater.com/docs/get-started-free/
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

function renderTemplate(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);  // throws TemplateError if variables missing (without nullGetter)

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}
```

### StorageService.getObject (to add in Phase 6)

```typescript
// Add to apps/backend/src/common/storage/storage.service.ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

async getObject(key: string): Promise<Buffer> {
  const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
  const stream = response.Body as Readable;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### Mongoose Schema documentos (DATOS §4.5)

```typescript
@Schema({ collection: 'documentos', timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } })
export class Documento {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true }) usuarioId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Expediente', required: true }) expedienteId!: Types.ObjectId;
  @Prop({ required: true, type: String }) nombre!: string;
  @Prop({ type: String, enum: ['generado', 'subido'], required: true }) tipo!: 'generado' | 'subido';
  // Only if tipo = 'generado':
  @Prop({ type: Types.ObjectId, ref: 'Plantilla', default: null }) plantillaId!: Types.ObjectId | null;
  @Prop({ type: Object, default: null }) datosCongelados!: Record<string, unknown> | null;
  @Prop({ type: [Types.ObjectId], ref: 'Clausula', default: null }) clausulasUsadas!: Types.ObjectId[] | null;
  // Common:
  @Prop({ required: true, type: String }) storagePath!: string;
  @Prop({ type: String, enum: ['docx', 'pdf', 'txt'], required: true }) formato!: 'docx' | 'pdf' | 'txt';
}
// Apply softDeletePlugin + indexes: { expedienteId, fechaCreacion:-1 } and { plantillaId: 1 }
```

### Context Builder (datosCongelados)

```typescript
// Constructs the JSON object for docxtemplater + datosCongelados persistence
function buildContext(
  expediente: { parametros: Record<string, unknown>; nombre: string; fechaCreacion: string },
  contactosPorRol: Record<string, Record<string, unknown>>,
  clausulas: Record<string, Record<string, unknown>>,
  fechas: Record<string, unknown>,
  overrides: Record<string, Record<string, unknown>>,  // user-provided new field values
): Record<string, unknown> {
  return {
    expediente: { nombre: expediente.nombre, fechaCreacion: expediente.fechaCreacion, ...expediente.parametros, ...overrides.expediente },
    contacto: contactosPorRol,
    clausula: clausulas,
    fecha: fechas,
  };
}
```

### Upload Documento Preexistente (DOC-06)

```typescript
// Controller endpoint — mirrors PlantillasController.createFromDocx pattern
@Post('upload/:expedienteId')
@Audited('documento', 'create')
@UseInterceptors(FileInterceptor('file'))
async uploadDocumento(
  @CurrentUser('id') uid: string,
  @Param('expedienteId', MongoIdPipe) expedienteId: string,
  @UploadedFile() file: Express.Multer.File,
  @Body('nombre') nombre: string,
  @Body('descripcion') descripcion?: string,
) {
  return this.service.uploadExistente(uid, expedienteId, { file, nombre, descripcion });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSZip with docxtemplater | PizZip with docxtemplater | docxtemplater 3.x | PizZip required; faster and more spec-compliant |
| docxtemplater `render()` sync throws | Same — no change | — | Must validate context before calling; no async API |
| AWS SDK v2 (aws-sdk) | AWS SDK v3 (@aws-sdk/client-s3) | SDK v3 GA | Already using v3; `getSignedUrl` from `@aws-sdk/s3-request-presigner` |

**Not deprecated:**
- `docxtemplater` core (free, MIT) remains the standard. Pro modules (loops, conditionals) are paid but not needed for MVP.
- `pizzip` 3.x is current and maintained.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | docxtemplater, all backend | Yes (dev env) | 22 LTS (project standard) | — |
| `docxtemplater` | DOC-04 generation | Not installed | 3.68.7 (need `pnpm add`) | — |
| `pizzip` | DOC-04 (docxtemplater peer dep) | Not installed | 3.2.0 (need `pnpm add`) | — |
| `docx` (npm) | D-01 on-the-fly base | Installed (^9.0.0) | Already in package.json | — |
| `mammoth` | Template .docx → text | Installed (^1.8.0) | Already in package.json | — |
| `@aws-sdk/client-s3` | Storage operations | Installed (^3.658.0) | Already in package.json | — |
| `@aws-sdk/s3-request-presigner` | Presigned URL | Installed (^3.658.0) | Already in package.json | — |
| MinIO (running) | DOC-04, DOC-05, DOC-06 | Yes (docker-compose) | N/A — test env mocked via NODE_ENV=test guard | Mock in tests |

**Missing dependencies with no fallback:**
- `docxtemplater` — must install before implementing GenerationService.
- `pizzip` — must install alongside docxtemplater.

**Missing dependencies with fallback:**
- None beyond the above.

---

## Validation Architecture

`workflow.nyquist_validation` is not set to `false` in `.planning/config.json` — validation section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 (backend unit + e2e) / Vitest 2 (frontend) |
| Config file (backend unit) | `apps/backend/jest.config.ts` |
| Config file (backend e2e) | `apps/backend/jest.e2e.config.ts` |
| Quick run command | `pnpm --filter backend test` |
| Full suite command | `pnpm -r run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | Formulario pre-rellena variables desde expediente/contactos | unit | `pnpm --filter backend test -- generation.service.spec` | No — Wave 0 |
| DOC-02 | Roles faltantes bloquean generación; modal asignación | unit + e2e | `pnpm --filter backend test -- documentos.service.spec` | No — Wave 0 |
| DOC-03 | Variables nuevas → esquema dinámico via addParametro | unit | `pnpm --filter backend test -- generation.service.spec` | No — Wave 0 |
| DOC-04 | docxtemplater render + MinIO upload + datosCongelados | unit | `pnpm --filter backend test -- generation.service.spec` | No — Wave 0 |
| DOC-05 | Presigned URL 5min TTL devuelto por `/documentos/:id/download` | e2e | `pnpm --filter backend test:e2e -- documentos` | No — Wave 0 |
| DOC-06 | Upload .docx/.pdf/.txt → MinIO con tipo "subido" | e2e | `pnpm --filter backend test:e2e -- documentos` | No — Wave 0 |
| DOC-07 | datosCongelados no cambia cuando cambia contacto/expediente | unit | `pnpm --filter backend test -- documentos.service.spec` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter backend test`
- **Per wave merge:** `pnpm -r run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/modules/documentos/tests/generation.service.spec.ts` — covers DOC-01, DOC-03, DOC-04 (mocked docxtemplater + StorageService)
- [ ] `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` — covers DOC-02, DOC-07
- [ ] `apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts` — covers DOC-05, DOC-06
- [ ] `apps/backend/test/documentos/documentos.e2e-spec.ts` — e2e covers DOC-05, DOC-06 via MongoMemoryServer + mocked StorageService
- [ ] Framework install: `pnpm --filter backend add docxtemplater pizzip` — required before GenerationService implementation

---

## Sources

### Primary (HIGH confidence)

- Codebase — `apps/backend/src/common/storage/storage.service.ts` — confirmed `putObject` + `getPresignedUrl` API
- Codebase — `packages/shared-validation/src/variable-parser.ts` — confirmed `parseVariables`, `groupByTipoObjeto`, `VariableDetectada` interface
- Codebase — `apps/backend/src/modules/plantillas/conversion.ts` — confirmed `textoToDocxBuffer` (docx npm) + `docxToTexto` (mammoth)
- Codebase — `apps/backend/package.json` — confirmed installed packages (docx, mammoth, @aws-sdk/*)
- `docs/DATOS.md §4.5` — confirmed `documentos` collection schema (datosCongelados, storagePath, tipo, plantillaId, clausulasUsadas)
- `docs/ARQUITECTURA.md §7.2, §7.3, §8.3` — confirmed pipeline, presigned URL TTL, storage key patterns
- npm registry (2026-06-02) — docxtemplater 3.68.7, pizzip 3.2.0

### Secondary (MEDIUM confidence)

- docxtemplater official docs pattern (render + getZip().generate()) — verified against known API; confirmed nullGetter behavior is optional, default throws on missing vars

### Tertiary (LOW confidence)

- None — all findings verified against code or official registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json + npm registry
- Architecture: HIGH — follows established patterns from Phases 2-5 in codebase
- Pitfalls: HIGH (P1, P2, P3, P6, P7) / MEDIUM (P4 — standard docxtemplater behavior, P5 — MIME type, well-known browser behavior)

**Research date:** 2026-06-02
**Valid until:** 2026-09-01 (stable ecosystem; docxtemplater API very stable)
