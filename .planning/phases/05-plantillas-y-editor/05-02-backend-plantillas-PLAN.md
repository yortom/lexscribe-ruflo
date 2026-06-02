---
phase: 05-plantillas-y-editor
plan: 02
type: execute
wave: 2
depends_on: ["05-01"]
files_modified:
  - apps/backend/src/common/storage/storage.module.ts
  - apps/backend/src/common/storage/storage.service.ts
  - apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts
  - apps/backend/src/modules/plantillas/plantillas.repository.ts
  - apps/backend/src/modules/plantillas/plantillas.service.ts
  - apps/backend/src/modules/plantillas/plantillas.controller.ts
  - apps/backend/src/modules/plantillas/plantillas.module.ts
  - apps/backend/src/modules/plantillas/conversion.ts
  - apps/backend/src/modules/plantillas/dto/create-plantilla.dto.ts
  - apps/backend/src/modules/plantillas/dto/update-plantilla.dto.ts
  - apps/backend/src/modules/plantillas/dto/query-plantilla.dto.ts
  - apps/backend/src/modules/plantillas/dto/declarar-variable.dto.ts
  - apps/backend/src/app.module.ts
  - apps/backend/jest.config.ts
  - apps/backend/package.json
  - apps/backend/test/plantillas.e2e-spec.ts
autonomous: true
requirements: [PLAN-01, PLAN-04, PLAN-06]
must_haves:
  truths:
    - "POST /plantillas accepts pasted text / extracted .txt/.docx text and persists contenido + storagePath"
    - "Detection runs on save; unknown tipoObjeto blocks the save with a 400 listing variable + line (F-030b)"
    - "PATCH /plantillas/:id creates version+1 active and marks previous inactive (no transaction; insert-then-deactivate)"
    - "POST /plantillas/:id/declarar-variable adds a field to the dynamic esquema via EsquemasService; clausula/fecha rejected"
    - "Original .docx uploaded to MinIO under /plantillas/{plantillaId}/... and storagePath recorded"
  artifacts:
    - path: "apps/backend/src/common/storage/storage.service.ts"
      provides: "S3-compatible client (putObject, ensureBucket onModuleInit) reusable by Phase 6"
      min_lines: 40
    - path: "apps/backend/src/modules/plantillas/plantillas.service.ts"
      provides: "parse+validate on save, versioning two-step, declare-variable, conversion orchestration"
      min_lines: 60
    - path: "apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts"
      provides: "Mongoose schema with plantillaRaizId/version/activo/variablesDetectadas/clausulasReferenciadas"
      contains: "plantillaRaizId"
  key_links:
    - from: "plantillas.service.ts"
      to: "@lexscribe/shared-validation parseVariables/validarVariables"
      via: "import + call on save"
      pattern: "parseVariables\\("
    - from: "plantillas.service.ts"
      to: "EsquemasService.addParametro"
      via: "declare-variable injection"
      pattern: "addParametro\\("
    - from: "plantillas.service.ts"
      to: "StorageService.putObject"
      via: ".docx upload"
      pattern: "putObject\\("
---

<objective>
Build the backend `plantillas` module (NestJS, replicating the Phase 4 clausulas Repository+Service+Controller pattern) plus a reusable `StorageService` (S3-compatible MinIO client). On save the service parses variables via the shared parser, blocks unknown tipoObjeto (F-030b), persists a versioned record (PLAN-06), uploads any original .docx to MinIO, and exposes declare-variable (PLAN-04) and format conversion.

Purpose: This is the persistence + business-logic core of Phase 5. Versioning and validation live here; the frontend (Wave 3) is a thin client over these endpoints.
Output: plantillas module with CRUD + versioning + declare-variable + conversion, StorageService, e2e tests (S3 mocked).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@docs/DATOS.md
@docs/ARQUITECTURA.md
@apps/backend/src/modules/clausulas/clausulas.service.ts
@apps/backend/src/modules/clausulas/clausulas.repository.ts
@apps/backend/src/modules/clausulas/clausulas.controller.ts
@apps/backend/src/modules/clausulas/clausulas.module.ts
@apps/backend/src/modules/clausulas/schemas/clausula.schema.ts
@apps/backend/src/modules/esquemas/esquemas.service.ts
@apps/backend/src/modules/esquemas/esquemas.controller.ts
@apps/backend/src/common/errors/index.ts
@apps/backend/jest.config.ts
@apps/backend/package.json
@infra/docker-compose.yml

<interfaces>
From @lexscribe/shared-validation (built in 05-01):
  parseVariables(texto: string): VariableDetectada[]
  validarVariables(vars): { valido: boolean; invalidas: VariableDetectada[] }
  CreatePlantillaSchema, UpdatePlantillaSchema, QueryPlantillaSchema, DeclararVariableSchema
  CreatePlantillaInput, UpdatePlantillaInput, QueryPlantillaInput, DeclararVariableInput
  KNOWN_TIPO_OBJETO = ['expediente','contacto','clausula','fecha']

EsquemasService (existing) — addParametro signature:
  addParametro(usuarioId: string|Types.ObjectId, tipoObjeto: TipoObjeto, dto: AddParametroInput)
  // TipoObjeto = 'expediente'|'contacto' ONLY. AddParametroInput = { nombre, tipoDato, obligatorio }.
  // Throws ConflictError if nombre exists with different tipoDato.

Domain errors (common/errors): NotFoundError(resource,id), ConflictError(msg), ValidationError(msg), NotImplementedError(msg).

Clausulas controller pattern: @UseGuards(JwtAuthGuard) + @UseInterceptors(AuditInterceptor) + @CurrentUser('id') uid + @Audited('<recurso>','<accion>') on mutations + @Param('id', MongoIdPipe).

Repository conventions (Mongoose 8/9): toObjectId() helper, `returnDocument:'after'` (not {new:true}), `Record<string,unknown>` filters, softDeletePlugin per-schema.

MinIO env (docker-compose): MINIO_ENDPOINT (default 'minio'), MINIO_PORT (9000), MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET (default 'lexscribe'). Read via ConfigService (app.module already uses @nestjs/config).

Storage layout (DATOS §6): /plantillas/{plantillaId}/{nombreOriginal}.docx

plantillas schema (DATOS §4.3) — EXACT fields:
  usuarioId, plantillaRaizId, version(Number), nombre, contenido(String texto plano),
  formatoOriginal('txt'|'docx'|'pegado'), storagePath(String|null),
  variablesDetectadas[{raw,tipoObjeto,rol,campo,esArray}], clausulasReferenciadas[ObjectId],
  activo, fechaInactivacion, timestamps fechaCreacion/fechaActualizacion.
Indexes: {plantillaRaizId:1, version:-1}, {usuarioId:1, activo:1}, {'variablesDetectadas.tipoObjeto':1,'variablesDetectadas.campo':1}.

Versioning rule (DATOS §4.3 note + locked decision): NO transactions (single-node mongod). Sequential two-step: (a) INSERT new doc version+1 activo:true FIRST, then (b) deactivate old (activo:false, fechaInactivacion:now). New active inserted before old deactivated so a crash never leaves zero active versions.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: StorageService + StorageModule (reusable MinIO/S3 client)</name>
  <read_first>
    - infra/docker-compose.yml (MINIO_* env names, lines 17-52)
    - apps/backend/src/app.module.ts (ConfigModule/ConfigService usage)
    - docs/ARQUITECTURA.md §3 (stack) §8 (storage)
    - docs/DATOS.md §6 (storage layout)
  </read_first>
  <action>
    Install the S3 SDK: add `"@aws-sdk/client-s3": "^3.658.0"` to apps/backend/package.json dependencies, run `pnpm install` from root.

    Create `apps/backend/src/common/storage/storage.service.ts` (reusable by Phase 6 documentos — keep generic, NOT plantilla-specific):
      @Injectable() StorageService implements OnModuleInit
      - Constructor injects ConfigService. Build an S3Client:
          new S3Client({ endpoint: `http://${MINIO_ENDPOINT}:${MINIO_PORT}`, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY } })
        Read each var via config.get<string>('MINIO_ENDPOINT') with defaults matching docker-compose ('minio', '9000', 'minioadmin', 'minioadmin', 'lexscribe').
      - store bucket name from MINIO_BUCKET.
      - async onModuleInit(): ensure-bucket — HeadBucketCommand; on NotFound/404 catch -> CreateBucketCommand. Wrap in try/catch, log via injected Logger (nestjs-pino Logger or console). Do NOT throw on failure during tests (guard with `if (process.env.NODE_ENV === 'test') return;` at top of onModuleInit so e2e doesn't need a live MinIO).
      - async putObject(key: string, body: Buffer, contentType: string): Promise<string> — PutObjectCommand({Bucket, Key:key, Body:body, ContentType:contentType}); return key (the storagePath).
      - async getPresignedUrl(key: string, ttlSeconds = 300): Promise<string> — use @aws-sdk/s3-request-presigner getSignedUrl with GetObjectCommand (add `"@aws-sdk/s3-request-presigner": "^3.658.0"` to deps). (Phase 6 will use this; include now since StorageService is the reuse point.)

    Create `apps/backend/src/common/storage/storage.module.ts`:
      @Module({ providers: [StorageService], exports: [StorageService] }) StorageModule. Mark @Global() OR import explicitly in PlantillasModule — choose explicit import (DDD, CLAUDE.md). So NOT global; PlantillasModule imports StorageModule.

    Keep each file < 200 lines, no `any`.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm type-check</automated>
  </verify>
  <acceptance_criteria>
    - grep "implements OnModuleInit" apps/backend/src/common/storage/storage.service.ts -> match
    - grep "forcePathStyle: true" apps/backend/src/common/storage/storage.service.ts -> match
    - grep "async putObject" apps/backend/src/common/storage/storage.service.ts -> match
    - grep "HeadBucketCommand" apps/backend/src/common/storage/storage.service.ts -> match (ensure-bucket)
    - grep "exports: \[StorageService\]" apps/backend/src/common/storage/storage.module.ts -> match
    - grep "@aws-sdk/client-s3" apps/backend/package.json -> match
    - pnpm type-check passes
  </acceptance_criteria>
  <done>StorageService with ensure-bucket onModuleInit + putObject + presigned URL, exported via StorageModule, type-checks clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: plantilla schema + repository (versioning two-step) + conversion helpers</name>
  <read_first>
    - apps/backend/src/modules/clausulas/schemas/clausula.schema.ts (schema + softDeletePlugin + index pattern)
    - apps/backend/src/modules/clausulas/clausulas.repository.ts (toObjectId, returnDocument:'after', filter typing)
    - docs/DATOS.md §4.3 (plantillas fields + indexes, lines 147-182)
    - 05-01 plantillas.ts (Zod input types)
  </read_first>
  <behavior>
    - createFirstVersion: inserts doc with version=1, plantillaRaizId === own _id (set in a second update or via pre-save), activo=true
    - createNewVersion(raizId): inserts version = (max existing version)+1, activo=true, copies plantillaRaizId; then deactivates the prior active version (activo:false, fechaInactivacion set) — INSERT happens BEFORE deactivate
    - findActiveByRaiz(raizId): returns the single activo:true doc
    - listActive(usuarioId): only activo:true (soft-delete + version filter), newest first
    - findVersions(raizId): all versions incl inactive, sorted version desc
  </behavior>
  <action>
    Create `apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts` replicating clausula.schema.ts structure:
      @Schema({ collection: 'plantillas', timestamps: { createdAt:'fechaCreacion', updatedAt:'fechaActualizacion' } })
      Props (DATOS §4.3): usuarioId (ObjectId ref Usuario, index, required); plantillaRaizId (ObjectId, index); version (Number, required, default 1); nombre (String, required); contenido (String, required); formatoOriginal (String enum ['txt','docx','pegado'], default 'pegado'); storagePath (String, default null); variablesDetectadas (array of subdoc {raw,tipoObjeto,rol(String,default null),campo,esArray(Boolean,default false)} — use `@Prop({ type: [VariableDetectadaSchema], default: [] })` with a nested @Schema({_id:false})); clausulasReferenciadas ([Types.ObjectId] ref Clausula, default []).
      Apply softDeletePlugin (adds activo + fechaInactivacion). Add the 3 indexes from DATOS §4.3:
        PlantillaSchema.index({ plantillaRaizId: 1, version: -1 });
        PlantillaSchema.index({ usuarioId: 1, activo: 1 });
        PlantillaSchema.index({ 'variablesDetectadas.tipoObjeto': 1, 'variablesDetectadas.campo': 1 });
      Use `minimize: false` if any empty-object concern (follow expediente decision in STATE).

    Create `apps/backend/src/modules/plantillas/plantillas.repository.ts` (mirror clausulas.repository.ts):
      - toObjectId() helper.
      - createFirstVersion(usuarioId, data): create with version:1; then set plantillaRaizId = _id via findByIdAndUpdate (returnDocument:'after'). (plantillaRaizId == _id means v1.)
      - createNewVersion(usuarioId, raizId, data): compute next version = (await model.find({plantillaRaizId}).sort({version:-1}).limit(1)).version + 1; create new doc {plantillaRaizId, version:next, activo:true, ...data}; THEN findOneAndUpdate the prior active ({plantillaRaizId, activo:true, _id:{$ne:newId}}, {$set:{activo:false, fechaInactivacion:new Date()}}). INSERT FIRST, deactivate second (no transaction — STATE: single-node mongod).
      - findActiveById(usuarioId, id), findActiveByRaiz(usuarioId, raizId), listActive(usuarioId, query) with pagination + optional $text-less name search (use regex on nombre since no $text index here; `{ nombre: { $regex: search, $options: 'i' } }`), findVersions(usuarioId, raizId), softDelete(usuarioId, id).
      - updateVariablesDetectadas(id, vars, clausulasRefs) helper if needed.

    Create `apps/backend/src/modules/plantillas/conversion.ts` (pure helpers, locked decisions D-08/D-09):
      - Install `"mammoth": "^1.8.0"` and `"docx": "^9.0.0"` in apps/backend/package.json deps; `pnpm install`.
      - export async function docxToTexto(buffer: Buffer): Promise<string> — `mammoth.extractRawText({ buffer })` then return result.value. Keeps {{...}} markers verbatim (raw text extraction, no HTML).
      - export async function textoToDocxBuffer(texto: string): Promise<Buffer> — build a `docx` Document with one Paragraph per line (split on \n), Packer.toBuffer(doc). Basic paragraphs only (no styling). NO docxtemplater (that is Phase 6).

    Create a unit test `apps/backend/src/modules/plantillas/plantillas.repository.spec.ts` covering versioning two-step using the Phase 3 schema-hook unit pattern (extract pre-hooks; no DB) OR mark MISSING and rely on e2e in Task 4. Prefer: write `conversion.spec.ts` (pure, fast) asserting docxToTexto roundtrip preserves "{{expediente.nombre}}" and textoToDocxBuffer returns a non-empty Buffer. Add `./src/modules/plantillas/` coverageThreshold to jest.config.ts (branches 70, functions 80, lines 80, statements 80) mirroring the contactos block.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm jest --runTestsByPath src/modules/plantillas/conversion.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "plantillaRaizId" apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts -> match
    - grep "PlantillaSchema.index({ plantillaRaizId: 1, version: -1 })" apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts -> match
    - grep "softDeletePlugin" apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts -> match
    - grep "createNewVersion" apps/backend/src/modules/plantillas/plantillas.repository.ts -> match
    - grep "extractRawText" apps/backend/src/modules/plantillas/conversion.ts -> match (mammoth, keeps markers)
    - grep "'./src/modules/plantillas/'" apps/backend/jest.config.ts -> match (coverageThreshold added)
    - conversion.spec.ts passes
  </acceptance_criteria>
  <done>Versioned schema with 3 indexes + softDelete, repository with insert-then-deactivate two-step, conversion helpers (mammoth docx->txt keeping markers, docx npm txt->docx), coverageThreshold registered.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: plantillas service + controller + module + DTOs + e2e</name>
  <read_first>
    - apps/backend/src/modules/clausulas/clausulas.service.ts + clausulas.controller.ts + clausulas.module.ts
    - apps/backend/src/modules/esquemas/esquemas.service.ts (addParametro return/throw contract)
    - apps/backend/src/modules/clausulas/dto/*.dto.ts (createZodDto pattern with nestjs-zod)
    - apps/backend/test/ (an existing *.e2e-spec.ts for setup boilerplate: MongoMemoryServer + DomainExceptionFilter + ZodValidationPipe)
    - 05-01 plantillas.ts + variable-parser.ts exports
  </read_first>
  <behavior>
    - POST /plantillas {nombre, contenido:"...{{expediente.nombre}}...", formatoOriginal:'pegado'} -> 201, version=1, plantillaRaizId==_id, variablesDetectadas has 1 entry, activo:true
    - POST /plantillas with contenido containing "{{contrato.algo}}" -> 400 with code VALIDATION, message names "contrato" and line (F-030b save-block, D-07 total block)
    - PATCH /plantillas/:id {contenido:"new"} -> 201/200 new doc version=2 activo:true; GET prior id shows activo:false; listActive returns only v2
    - POST /plantillas/:id/declarar-variable {tipoObjeto:'expediente', nombre:'honorariosBase', tipoDato:'numero'} -> esquema expediente gains param (EsquemasService.addParametro called)
    - POST /plantillas/:id/declarar-variable {tipoObjeto:'clausula', ...} -> 400/422 ValidationError (Pitfall 4: clausula/fecha NOT declarable)
    - GET /plantillas -> only active; GET /plantillas/:id/versions -> all versions desc
    - DELETE /plantillas/:id -> soft-delete
  </behavior>
  <action>
    Create DTOs in `apps/backend/src/modules/plantillas/dto/` using nestjs-zod createZodDto over the 05-01 schemas (mirror clausulas dto files):
      create-plantilla.dto.ts -> createZodDto(CreatePlantillaSchema)
      update-plantilla.dto.ts -> createZodDto(UpdatePlantillaSchema)
      query-plantilla.dto.ts  -> createZodDto(QueryPlantillaSchema)
      declarar-variable.dto.ts -> createZodDto(DeclararVariableSchema)

    Create `apps/backend/src/modules/plantillas/plantillas.service.ts`:
      Inject PlantillasRepository, EsquemasService, StorageService.
      - private detectarYValidar(contenido): parse with parseVariables; run validarVariables; if !valido throw ValidationError with a message built from invalidas: e.g. `Tipo de objeto desconocido en variables: ${invalidas.map(v => `${v.raw} (línea ${v.linea})`).join(', ')}` (F-030b / D-07 total save-block).
      - create(uid, dto): detectarYValidar(dto.contenido) -> variablesDetectadas; createFirstVersion(uid, {nombre, contenido, formatoOriginal, variablesDetectadas, clausulasReferenciadas:[]}). Return doc.
      - createFromDocx(uid, nombre, buffer): contenido = await docxToTexto(buffer); detectarYValidar; createFirstVersion(... formatoOriginal:'docx'); upload original to MinIO at `plantillas/${doc._id}/${slug(nombre)}.docx` via StorageService.putObject(key, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); update storagePath. (If accepting file upload, controller uses @UseInterceptors(FileInterceptor('file')) from @nestjs/platform-express + Multer; otherwise accept base64 — choose FileInterceptor; add multipart route POST /plantillas/upload.)
      - update(uid, id, dto): load active; detectarYValidar(dto.contenido) -> vars; createNewVersion(uid, raizId, {nombre: dto.nombre ?? prev.nombre, contenido, formatoOriginal: prev.formatoOriginal, variablesDetectadas: vars, clausulasReferenciadas: prev.clausulasReferenciadas}). (PLAN-06 versioning.)
      - declararVariable(uid, id, dto: DeclararVariableInput): the Zod schema already restricts tipoObjeto to expediente|contacto, but ALSO guard explicitly (Pitfall 4): `if (dto.tipoObjeto !== 'expediente' && dto.tipoObjeto !== 'contacto') throw new ValidationError('Solo se pueden declarar variables de expediente o contacto')`. Then `await this.esquemas.addParametro(uid, dto.tipoObjeto, { nombre: dto.nombre, tipoDato: dto.tipoDato, obligatorio: false })`.
      - list/getById/getVersions/remove delegating to repo (NotFoundError when missing).

    Create `apps/backend/src/modules/plantillas/plantillas.controller.ts` (mirror clausulas.controller.ts):
      @UseGuards(JwtAuthGuard) @UseInterceptors(AuditInterceptor) @Controller('plantillas')
      - GET / list (@Query QueryPlantillaDto)
      - GET /:id getById (MongoIdPipe)
      - GET /:id/versions getVersions
      - POST / @Audited('plantilla','create') create (CreatePlantillaDto) — pasted/txt text path
      - POST /upload @Audited('plantilla','create') createFromDocx — @UseInterceptors(FileInterceptor('file')), @UploadedFile() + @Body('nombre')
      - PATCH /:id @Audited('plantilla','update') update (UpdatePlantillaDto) — returns new version
      - POST /:id/declarar-variable @Audited('esquema','create') declararVariable (DeclararVariableDto)
      - DELETE /:id @Audited('plantilla','delete') remove

    Create `apps/backend/src/modules/plantillas/plantillas.module.ts` (mirror clausulas.module.ts): MongooseModule.forFeature([{name:Plantilla.name, schema:PlantillaSchema}]), import AuditoriaModule, AuthModule, EsquemasModule (to inject EsquemasService — confirm EsquemasModule exports EsquemasService; if not, that is a one-line export add in esquemas.module.ts), StorageModule. providers: [PlantillasService, PlantillasRepository]. exports: [PlantillasService, PlantillasRepository] (Phase 6 needs to read plantilla versions).

    Register PlantillasModule in `apps/backend/src/app.module.ts` imports array.

    Create `apps/backend/test/plantillas.e2e-spec.ts` mirroring an existing e2e setup (MongoMemoryServer, DomainExceptionFilter, ZodValidationPipe, JWT helper). Mock StorageService (override provider with putObject -> returns key, onModuleInit no-op) so no live MinIO. Cover every <behavior> case: create v1 + detection, unknown-type 400 (F-030b), PATCH -> v2 active + v1 inactive, declarar-variable expediente success, declarar-variable clausula 400, versions list, soft-delete, audit emission.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test:e2e -- --runTestsByPath test/plantillas.e2e-spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "parseVariables(" apps/backend/src/modules/plantillas/plantillas.service.ts -> match
    - grep "createNewVersion(" apps/backend/src/modules/plantillas/plantillas.service.ts -> match
    - grep "addParametro(" apps/backend/src/modules/plantillas/plantillas.service.ts -> match
    - grep "Solo se pueden declarar variables de expediente o contacto" apps/backend/src/modules/plantillas/plantillas.service.ts -> match (Pitfall 4)
    - grep "@Controller('plantillas')" apps/backend/src/modules/plantillas/plantillas.controller.ts -> match
    - grep "declarar-variable" apps/backend/src/modules/plantillas/plantillas.controller.ts -> match
    - grep "PlantillasModule" apps/backend/src/app.module.ts -> match
    - e2e suite green (create/unknown-type/version/declarar) and no docxtemplater import anywhere in plantillas module
  </acceptance_criteria>
  <done>plantillas service+controller+module wired; save parses+validates+versions; declare-variable proxies EsquemasService rejecting clausula/fecha; original .docx uploaded via StorageService; e2e green with StorageService mocked.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend test:e2e -- --runTestsByPath test/plantillas.e2e-spec.ts` all green.
- `pnpm --filter @lexscribe/backend type-check` clean (StorageService + module wiring).
- Versioning is insert-then-deactivate, no `session`/transaction calls in plantillas.repository.ts.
- Declare-variable rejects clausula/fecha both at the Zod boundary AND in the service (Pitfall 4 defense-in-depth).
- No `docxtemplater` dependency added (only mammoth + docx).
- StorageService reusable (generic putObject/getPresignedUrl, ensure-bucket onModuleInit), exported by StorageModule.
</verification>

<success_criteria>
PLAN-01 (.txt/.docx/pasted -> plantilla with contenido + storagePath), PLAN-04 (declare new field from editor into esquema), PLAN-06 (edit -> new active version, prior inactive but conserved) are implemented backend-side with e2e coverage. F-030b unknown-type block enforced. StorageService ready for Phase 6 reuse.
</success_criteria>

<output>
After completion, create `.planning/phases/05-plantillas-y-editor/05-02-SUMMARY.md`
</output>
