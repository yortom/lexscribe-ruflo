---
phase: 06-generaci-n-y-documentos
plan: 02
type: execute
wave: 2
depends_on: ["06-01"]
files_modified:
  - apps/backend/src/modules/documentos/documentos.service.ts
  - apps/backend/src/modules/documentos/documentos.controller.ts
  - apps/backend/src/modules/documentos/documentos.module.ts
  - apps/backend/src/modules/documentos/dto/generate-documento.dto.ts
  - apps/backend/src/modules/documentos/dto/query-documento.dto.ts
  - apps/backend/src/modules/documentos/dto/upload-documento.dto.ts
  - apps/backend/src/app.module.ts
  - apps/backend/src/modules/expedientes/expedientes.module.ts
  - apps/backend/src/modules/expedientes/expedientes.service.ts
  - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts
  - apps/backend/test/documentos/documentos.e2e-spec.ts
autonomous: true
requirements: [DOC-02, DOC-04, DOC-05, DOC-06, DOC-07]
must_haves:
  truths:
    - "POST /documentos/generar/:expedienteId genera un documento y devuelve el registro con datosCongelados"
    - "Si una asignación de rol incluye un contacto no vinculado al expediente, se vincula al expediente con ese rol durante la generación"
    - "POST /documentos/upload/:expedienteId acepta .docx/.pdf/.txt y crea documento tipo 'subido' en MinIO"
    - "GET /documentos/:id/download devuelve una presigned URL de MinIO con 300s TTL"
    - "GET /documentos?expedienteId lista documentos del expediente por fechaCreacion descendente"
    - "ExpedienteDetailResponse.documentos devuelve los documentos reales del expediente (EXPE-07 cerrado)"
    - "DELETE /documentos/:id hace soft-delete del documento"
  artifacts:
    - path: "apps/backend/src/modules/documentos/documentos.controller.ts"
      provides: "Endpoints generar/upload/list/getById/download/delete con JwtAuthGuard + @Audited"
      exports: ["generar", "upload", "download", "list", "remove"]
    - path: "apps/backend/src/modules/documentos/documentos.service.ts"
      provides: "Orquestación: generar (delega GenerationService + vincula roles), upload, download URL, list, soft-delete"
    - path: "apps/backend/src/modules/documentos/documentos.module.ts"
      provides: "Módulo NestJS con forwardRef a ExpedientesModule/PlantillasModule/ContactosModule"
      contains: "forwardRef"
    - path: "apps/backend/test/documentos/documentos.e2e-spec.ts"
      provides: "e2e DOC-05 (download presigned) + DOC-06 (upload .docx/.pdf/.txt)"
  key_links:
    - from: "app.module.ts"
      to: "DocumentosModule"
      via: "imports array"
      pattern: "DocumentosModule"
    - from: "documentos.controller.ts"
      to: "StorageService.getPresignedUrl(key, 300)"
      via: "endpoint download"
      pattern: "getPresignedUrl"
    - from: "expedientes.service.ts getById"
      to: "DocumentosRepository.listByExpediente"
      via: "poblar documentos reales (EXPE-07)"
      pattern: "listByExpediente"
    - from: "documentos.service.ts generar"
      to: "ExpedientesService.linkContacto"
      via: "vincular contacto/rol del modal D-06"
      pattern: "linkContacto"
---

<objective>
Completar el módulo `DocumentosModule`: service de orquestación + controller con endpoints HTTP (generar, upload, getById, download, list, delete) + DTOs + wiring del módulo (forwardRef a Expedientes/Plantillas/Contactos) + registro en AppModule. Cerrar EXPE-07 poblando `ExpedienteDetailResponse.documentos` con documentos reales. Subida de documentos preexistentes (DOC-06) y descarga vía presigned URL (DOC-05).

Purpose: Expone el pipeline de 06-01 vía HTTP autenticado y conecta documentos con expedientes (vista unificada). Vincula contactos del modal de rol faltante (DOC-02) durante la generación.
Output: DocumentosModule funcional end-to-end (backend); EXPE-07 cerrado; e2e DOC-05/DOC-06 verde.
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
@.planning/phases/06-generaci-n-y-documentos/06-01-SUMMARY.md
@docs/DATOS.md
@docs/ARQUITECTURA.md

<interfaces>
<!-- Contratos de 06-01 (este plan los consume) y patrones del codebase -->

De 06-01 (ya creado):
- GenerationService.generar(usuarioId, expedienteId, dto: GenerateDocumentoInput): Promise<DocumentoDocument>
- DocumentosRepository: create / findById / listByExpediente(usuarioId, expedienteId, {page,limit}) / softDelete
- Documento schema; shared-types Documento/DocumentoListResponse/DownloadUrlResponse
- shared-validation: GenerateDocumentoSchema/Input, QueryDocumentoSchema/Input, UploadDocumentoMetaSchema/Input

Patrón controller (apps/backend/src/modules/plantillas/plantillas.controller.ts):
```typescript
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('documentos')
// @CurrentUser('id') uid: string ; @Param('id', MongoIdPipe) ; @Audited('documento','create'|'update'|'delete')
// Upload: @UseInterceptors(FileInterceptor('file')) + @UploadedFile() file: Express.Multer.File
```

createZodDto patrón (DTOs): `export class GenerateDocumentoDto extends createZodDto(GenerateDocumentoSchema) {}` (import from 'nestjs-zod').

ExpedientesService.linkContacto(usuarioId, expedienteId, dto: { contactoId: string; rol: string }): Promise<...>
  — lanza ConflictError si (contactoId, rol) ya existe. Para DOC-02 capturar ConflictError y continuar (ya vinculado = ok).
ExpedientesService.getById(usuarioId, id) — actualmente devuelve { ...expediente, documentos: [], fechas: [] } (placeholders).

ExpedientesModule actual: imports MongooseModule, EsquemasModule, AuditoriaModule, AuthModule, forwardRef(()=>ContactosModule). Exports ExpedientesService, ExpedientesRepository.

StorageService.getPresignedUrl(key, ttlSeconds=300): Promise<string>.

MIME por extensión (Pitfall 5):
```typescript
const MIME_BY_EXT: Record<string,string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};
```

e2e patrón: apps/backend/test/plantillas/plantillas.e2e-spec.ts — overrideProvider(StorageService).useValue(mockStorageService con putObject/getPresignedUrl/getObject), ZodValidationPipe + DomainExceptionFilter globales, setGlobalPrefix('api/v1').
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: DTOs + DocumentosService (orquestación) + DocumentosController</name>
  <read_first>
    - apps/backend/src/modules/plantillas/plantillas.controller.ts (patrón controller + FileInterceptor)
    - apps/backend/src/modules/plantillas/dto/create-plantilla.dto.ts (patrón createZodDto)
    - apps/backend/src/modules/documentos/generation/generation.service.ts (de 06-01: firma generar)
    - apps/backend/src/modules/documentos/documentos.repository.ts (de 06-01: list/findById/create/softDelete)
    - apps/backend/src/modules/expedientes/expedientes.service.ts (linkContacto + getById)
    - apps/backend/src/common/storage/storage.service.ts (getPresignedUrl, putObject)
  </read_first>
  <action>
    1. Crear DTOs (cada uno `extends createZodDto(...)` de nestjs-zod):
       - `dto/generate-documento.dto.ts`: `GenerateDocumentoDto extends createZodDto(GenerateDocumentoSchema)`.
       - `dto/query-documento.dto.ts`: `QueryDocumentoDto extends createZodDto(QueryDocumentoSchema)`.
       - `dto/upload-documento.dto.ts`: `UploadDocumentoMetaDto extends createZodDto(UploadDocumentoMetaSchema)`.
    2. Crear `documentos.service.ts` (constructor inyecta GenerationService, DocumentosRepository, StorageService, y `@Inject(forwardRef(()=>ExpedientesService)) ExpedientesService`):
       - `async generar(uid, expedienteId, dto: GenerateDocumentoInput)`:
         a. DOC-02: por cada `dto.asignacionesRol` → `try { await this.expedientes.linkContacto(uid, expedienteId, { contactoId: a.contactoId, rol: a.rol }); } catch (e) { if (!(e instanceof ConflictError)) throw e; }` (ya vinculado = ignorar).
         b. `return this.generation.generar(uid, expedienteId, dto);`
       - `async uploadExistente(uid, expedienteId, { file, nombre })` (DOC-06):
         - Validar extensión por nombre original del archivo (`file.originalname`): obtener ext en minúsculas; rechazar con `ValidationError('Formato no permitido')` si no es `.docx|.pdf|.txt` (Pitfall 5 — validar por extensión, NO por mimetype del browser).
         - `const docId = new Types.ObjectId();` `const ext = <.docx|.pdf|.txt>;` `const formato = ext.slice(1) as 'docx'|'pdf'|'txt';`
         - key = `documentos/subidos/${docId.toString()}/${slugify(nombre)}${ext}` (copiar slugify de generation.service o de plantillas).
         - `await this.storage.putObject(key, file.buffer, MIME_BY_EXT[ext]);`
         - `return this.repo.create(uid, { _id: docId, expedienteId, nombre, tipo: 'subido', plantillaId: null, datosCongelados: null, clausulasUsadas: null, storagePath: key, formato });`
       - `async list(uid, expedienteId, query: QueryDocumentoInput)`: `const {items,total}=await this.repo.listByExpediente(uid, expedienteId, query); return {items,total,page:query.page,limit:query.limit};`
       - `async getById(uid, id)`: `const d=await this.repo.findById(uid,id); if(!d) throw new NotFoundError('documento',id); return d;`
       - `async getDownloadUrl(uid, id)` (DOC-05): `const d=await this.getById(uid,id); const url=await this.storage.getPresignedUrl(d.storagePath, 300); return { url };`
       - `async remove(uid, id)`: `const del=await this.repo.softDelete(uid,id); if(!del) throw new NotFoundError('documento',id); return del;` (nota: la evaluación de eventos al borrar es Phase 7 / FL-9 — fuera de scope, dejar comentario `// TODO Phase 7 FL-9: evaluar eventos asociados`).
       - Importar `ConflictError, NotFoundError, ValidationError` de common/errors; `Types` de mongoose. Definir `MIME_BY_EXT` const local.
    3. Crear `documentos.controller.ts` (patrón plantillas.controller.ts, `@Controller('documentos')`, `@UseGuards(JwtAuthGuard)`, `@UseInterceptors(AuditInterceptor)`):
       - `@Post('generar/:expedienteId')` `@Audited('documento','create')` → `generar(uid, @Param('expedienteId',MongoIdPipe), @Body() dto: GenerateDocumentoDto)`.
       - `@Post('upload/:expedienteId')` `@Audited('documento','create')` `@UseInterceptors(FileInterceptor('file'))` → `upload(uid, @Param('expedienteId',MongoIdPipe), @UploadedFile() file, @Body('nombre') nombre)`.
       - `@Get()` → `list(uid, @Query('expedienteId') expedienteId, @Query() q: QueryDocumentoDto)`. (expedienteId requerido como query param; validar presente o ValidationError.)
       - `@Get(':id')` → `getById(uid, @Param('id',MongoIdPipe) id)`.
       - `@Get(':id/download')` → `download(uid, @Param('id',MongoIdPipe) id)` → `this.service.getDownloadUrl(uid,id)`.
       - `@Delete(':id')` `@Audited('documento','delete')` → `remove(uid, @Param('id',MongoIdPipe) id)`.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend exec tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <acceptance_criteria>
    - `grep "@Post('generar/:expedienteId')" apps/backend/src/modules/documentos/documentos.controller.ts` existe
    - `grep "@Post('upload/:expedienteId')" apps/backend/src/modules/documentos/documentos.controller.ts` existe
    - `grep "':id/download'" apps/backend/src/modules/documentos/documentos.controller.ts` existe
    - `grep 'linkContacto' apps/backend/src/modules/documentos/documentos.service.ts` existe (DOC-02)
    - `grep 'documentos/subidos/' apps/backend/src/modules/documentos/documentos.service.ts` existe
    - `grep 'getPresignedUrl' apps/backend/src/modules/documentos/documentos.service.ts` existe (DOC-05, TTL 300)
    - `grep 'MIME_BY_EXT' apps/backend/src/modules/documentos/documentos.service.ts` existe (Pitfall 5)
    - `pnpm --filter backend exec tsc --noEmit` pasa
  </acceptance_criteria>
  <done>DTOs, service de orquestación y controller creados; backend type-checks.</done>
</task>

<task type="auto">
  <name>Task 2: Wiring DocumentosModule + AppModule + cerrar EXPE-07 en ExpedientesService</name>
  <read_first>
    - apps/backend/src/modules/documentos/documentos.module.ts (si no existe, crear)
    - apps/backend/src/modules/plantillas/plantillas.module.ts (patrón imports StorageModule/EsquemasModule)
    - apps/backend/src/modules/expedientes/expedientes.module.ts (imports + forwardRef ContactosModule; añadir DocumentosModule)
    - apps/backend/src/modules/expedientes/expedientes.service.ts (getById placeholder documentos:[])
    - apps/backend/src/app.module.ts (imports array)
    - .planning/phases/06-generaci-n-y-documentos/06-RESEARCH.md §"Pattern 5" + "Pitfall 3"
  </read_first>
  <action>
    1. Crear `apps/backend/src/modules/documentos/documentos.module.ts` (Pattern 5 del research):
    ```typescript
    @Module({
      imports: [
        MongooseModule.forFeature([{ name: Documento.name, schema: DocumentoSchema }]),
        AuditoriaModule,
        AuthModule,
        EsquemasModule,
        StorageModule,
        PlantillasModule,                       // PlantillasService.getById (sin forwardRef — no hay ciclo)
        forwardRef(() => ExpedientesModule),    // ExpedientesService.linkContacto/getById (ciclo)
        forwardRef(() => ContactosModule),      // ContactosRepository (modal D-06, opcional)
      ],
      controllers: [DocumentosController],
      providers: [DocumentosService, DocumentosRepository, GenerationService],
      exports: [DocumentosService, DocumentosRepository],
    })
    export class DocumentosModule {}
    ```
    2. En `expedientes.module.ts` añadir `forwardRef(() => DocumentosModule)` al array imports (Pitfall 3). Importar DocumentosModule.
    3. En `expedientes.service.ts` cerrar EXPE-07:
       - Inyectar `@Inject(forwardRef(() => DocumentosRepository)) private readonly documentosRepo: DocumentosRepository` (usar DocumentosRepository, no Service, para romper el ciclo a nivel de provider — alternativa más simple del research Pitfall 3). DocumentosModule debe exportar DocumentosRepository (ya en exports).
       - En `getById`: reemplazar `documentos: [] as unknown[]` por:
         `const { items } = await this.documentosRepo.listByExpediente(usuarioId, id, { page: 1, limit: 100 });`
         `return { ...expediente.toObject(), documentos: items, fechas: [] as unknown[] };`
       - Importar `forwardRef, Inject` de @nestjs/common y `DocumentosRepository` de ../documentos/documentos.repository.
    4. En `app.module.ts` añadir `DocumentosModule` al array imports.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend exec tsc --noEmit -p tsconfig.json && pnpm --filter backend test:e2e -- expedientes</automated>
  </verify>
  <acceptance_criteria>
    - `grep 'DocumentosModule' apps/backend/src/app.module.ts` existe (import + en imports array)
    - `grep 'forwardRef(() => DocumentosModule)' apps/backend/src/modules/expedientes/expedientes.module.ts` existe
    - `grep 'forwardRef(() => ExpedientesModule)' apps/backend/src/modules/documentos/documentos.module.ts` existe
    - `grep 'listByExpediente' apps/backend/src/modules/expedientes/expedientes.service.ts` existe (EXPE-07)
    - `pnpm --filter backend exec tsc --noEmit` pasa (DI circular resuelta con forwardRef)
    - `pnpm --filter backend test:e2e -- expedientes` sigue verde (la app arranca con el nuevo módulo)
  </acceptance_criteria>
  <done>DocumentosModule registrado; DI circular resuelta; ExpedienteDetailResponse.documentos devuelve documentos reales.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Tests — documentos.service.spec (DOC-02/DOC-07) + e2e (DOC-05/DOC-06)</name>
  <read_first>
    - apps/backend/test/plantillas/plantillas.e2e-spec.ts (patrón e2e: mock StorageService, auth, ZodValidationPipe + DomainExceptionFilter)
    - apps/backend/src/modules/plantillas/plantillas.service.spec.ts (patrón spec unitario con mocks)
    - apps/backend/src/modules/documentos/documentos.service.ts (de Task 1)
    - .planning/phases/06-generaci-n-y-documentos/06-RESEARCH.md §"Validation Architecture" (test map)
  </read_first>
  <behavior>
    documentos.service.spec.ts (mocks de GenerationService, DocumentosRepository, StorageService, ExpedientesService):
    - Test 1 (DOC-02): generar con asignacionesRol → llama ExpedientesService.linkContacto por cada asignación antes de delegar a GenerationService.generar.
    - Test 2 (DOC-02): si linkContacto lanza ConflictError (ya vinculado) → NO propaga, continúa con generación.
    - Test 3 (DOC-07): generar devuelve el documento de GenerationService con datosCongelados intacto (el service no muta datosCongelados).
    - Test 4 (DOC-06): uploadExistente con ext no permitida (.exe) → lanza ValidationError; no llama putObject.
    - Test 5 (DOC-05): getDownloadUrl llama storage.getPresignedUrl(storagePath, 300) y devuelve {url}.

    documentos.e2e-spec.ts (MongoMemoryServer + StorageService mockeado, igual que plantillas):
    - DOC-06: POST /documentos/upload/:expedienteId con un .txt buffer → 201, documento tipo 'subido', formato 'txt', storagePath empieza por 'documentos/subidos/'.
    - DOC-06: upload con extensión .exe → 400 (ValidationError).
    - DOC-05: GET /documentos/:id/download → 200 con { url } (presigned mock).
    - list: GET /documentos?expedienteId=... → items ordenados por fechaCreacion desc.
  </behavior>
  <action>
    1. Crear `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` cubriendo Tests 1-5 del bloque <behavior>. Mockear ExpedientesService.linkContacto (jest.fn que resuelve, y en Test 2 que rechaza con `new ConflictError('...')`), GenerationService.generar (jest.fn resuelve un documento fake con datosCongelados), StorageService.getPresignedUrl (resuelve URL mock), DocumentosRepository (create/findById/listByExpediente/softDelete jest.fn).
    2. Crear `apps/backend/test/documentos/documentos.e2e-spec.ts` siguiendo EXACTAMENTE el patrón de plantillas.e2e-spec.ts:
       - `mockStorageService` con `onModuleInit`, `putObject` (resuelve key), `getObject` (resuelve un Buffer mínimo), `getPresignedUrl` (resuelve 'https://minio-mock/presigned').
       - overrideProvider(StorageService).useValue(mockStorageService).
       - Crear usuario + token (argon2 + login como en plantillas), crear un expediente vía API, luego ejercer upload/download/list según <behavior>.
       - Para DOC-06 upload usar `.attach('file', Buffer.from('hola'), 'doc.txt')` y `.field('nombre','Mi doc')`.
       - Para .exe usar `.attach('file', Buffer.from('x'), 'malo.exe')` → esperar 400.
    3. Ejecutar y verificar verde.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend test -- documentos.service.spec && pnpm --filter backend test:e2e -- documentos</automated>
  </verify>
  <acceptance_criteria>
    - `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` existe y `grep 'ConflictError' ...documentos.service.spec.ts` (Test 2)
    - `apps/backend/test/documentos/documentos.e2e-spec.ts` existe y `grep "upload/" ...documentos.e2e-spec.ts`
    - `grep 'documentos/subidos/' apps/backend/test/documentos/documentos.e2e-spec.ts` o aserción equivalente sobre storagePath
    - `pnpm --filter backend test -- documentos.service.spec` pasa los 5 tests
    - `pnpm --filter backend test:e2e -- documentos` pasa (DOC-05 + DOC-06)
  </acceptance_criteria>
  <done>Service spec (DOC-02/05/06/07) + e2e (DOC-05/06 + list) verdes.</done>
</task>

</tasks>

<verification>
- `pnpm --filter backend exec tsc --noEmit` pasa.
- `pnpm --filter backend test -- documentos.service.spec` y `pnpm --filter backend test -- generation.service.spec` verdes.
- `pnpm --filter backend test:e2e -- documentos` verde.
- `pnpm --filter backend test:e2e -- expedientes` sigue verde (módulo nuevo no rompe arranque).
</verification>

<success_criteria>
- DOC-04: POST /documentos/generar/:expedienteId genera y persiste documento (pipeline completo end-to-end backend).
- DOC-02: asignaciones de rol vinculan contacto al expediente durante generación; ConflictError tolerado.
- DOC-05: GET /documentos/:id/download devuelve presigned URL 300s TTL.
- DOC-06: POST /documentos/upload/:expedienteId crea documento 'subido' (.docx/.pdf/.txt), valida extensión.
- EXPE-07: ExpedienteDetailResponse.documentos poblado con documentos reales.
</success_criteria>

<output>
After completion, create `.planning/phases/06-generaci-n-y-documentos/06-02-SUMMARY.md`
</output>
