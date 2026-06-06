---
phase: 07-calendario-y-facturaci-n
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/DATOS.md
  - packages/shared-types/src/evento.ts
  - packages/shared-types/src/index.ts
  - packages/shared-validation/src/eventos.ts
  - packages/shared-validation/src/index.ts
  - apps/backend/src/modules/eventos/schemas/evento.schema.ts
  - apps/backend/src/modules/eventos/eventos.repository.ts
  - apps/backend/src/modules/eventos/eventos.service.ts
  - apps/backend/src/modules/eventos/eventos.controller.ts
  - apps/backend/src/modules/eventos/eventos.module.ts
  - apps/backend/src/modules/eventos/dto/create-evento.dto.ts
  - apps/backend/src/modules/eventos/dto/update-evento.dto.ts
  - apps/backend/src/modules/eventos/dto/query-evento.dto.ts
  - apps/backend/src/modules/eventos/tests/eventos.service.spec.ts
  - apps/backend/src/modules/eventos/tests/eventos.repository.spec.ts
  - apps/backend/src/app.module.ts
  - apps/backend/jest.config.ts
autonomous: true
requirements: [CAL-01, CAL-02, CAL-03, CAL-04, CAL-05]
must_haves:
  truths:
    - "docs/DATOS.md §4.6 documents the mostrarEnCalendario field and §9 has a 2026-06-06 changelog entry"
    - "POST /eventos creates an evento with origen documento|manual and returns it"
    - "GET /eventos filters by expedienteId, date range, and soloCalendario (mostrarEnCalendario=true)"
    - "PATCH /eventos/:id updates color/visibility/other mutable fields"
    - "DELETE /eventos/:id soft-deletes; softDeleteByDocumentoId soft-deletes all events of a document"
    - "GET /eventos/count?documentoId=:id returns active event count for FL-9 pre-check"
  artifacts:
    - path: "apps/backend/src/modules/eventos/schemas/evento.schema.ts"
      provides: "Evento Mongoose schema with mostrarEnCalendario + softDeletePlugin + indices"
      contains: "mostrarEnCalendario"
    - path: "apps/backend/src/modules/eventos/eventos.repository.ts"
      provides: "create/findById/list/softDelete/softDeleteByDocumentoId/countByDocumentoId"
      contains: "softDeleteByDocumentoId"
    - path: "apps/backend/src/modules/eventos/eventos.controller.ts"
      provides: "REST endpoints with JwtAuthGuard + @Audited + @CurrentUser"
      contains: "@Audited"
    - path: "packages/shared-types/src/evento.ts"
      provides: "Evento + EventoListResponse interfaces"
      exports: ["Evento", "EventoListResponse"]
    - path: "packages/shared-validation/src/eventos.ts"
      provides: "CreateEventoSchema/UpdateEventoSchema/QueryEventoSchema Zod"
      exports: ["CreateEventoSchema", "UpdateEventoSchema", "QueryEventoSchema"]
    - path: "docs/DATOS.md"
      provides: "mostrarEnCalendario documented in §4.6 + §9 changelog entry"
      contains: "mostrarEnCalendario"
  key_links:
    - from: "apps/backend/src/app.module.ts"
      to: "EventosModule"
      via: "imports[] registration"
      pattern: "EventosModule"
    - from: "apps/backend/src/modules/eventos/eventos.repository.ts"
      to: "mongoose model find/findOneAndUpdate"
      via: "activo:true soft-delete filter on reads"
      pattern: "activo:\\s*true"
---

<objective>
Build the backend EventosModule (collection `eventos`) plus shared contracts, and register the new `mostrarEnCalendario` field (D-01) in `docs/DATOS.md`. Covers CAL-01 (events from document), CAL-02 (manual events), CAL-03 (filtered listing for calendar + Fechas tab), CAL-04 (color), and the CAL-05 backend support (`softDeleteByDocumentoId` + count endpoint consumed by FL-9 in 07-03).

This plan includes Wave 0 work: the DATOS.md doc update (must precede schema code per CLAUDE.md rule 4) and the shared-types/shared-validation contracts that 07-03 (frontend) consumes.

Purpose: A clean, audited, soft-delete-aware eventos API mirroring the documentos module pattern exactly, so the frontend (07-03) and FL-9 doc-delete modification (07-03) can build against stable contracts.
Output: EventosModule registered in AppModule, shared `evento.ts` types + Zod schemas, DATOS.md updated, unit tests for service + repository.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-calendario-y-facturaci-n/07-CONTEXT.md
@.planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md

<interfaces>
<!-- Contracts this plan CREATES (consumed by 07-03). Mirror documentos.ts patterns exactly. -->

New: packages/shared-types/src/evento.ts
```typescript
export interface Evento {
  _id: string;
  usuarioId: string;
  origen: 'documento' | 'manual';
  expedienteId: string | null;
  documentoId: string | null;
  subtipo: 'fecha_limite' | 'aviso' | 'recordatorio' | null;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;   // ISO string
  fechaFin: string | null;
  color: string | null;
  mostrarEnCalendario: boolean;  // D-01
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}
export interface EventoListResponse {
  items: Evento[];
  total: number;
  page: number;
  limit: number;
}
export interface EventoCountResponse { total: number; }
```

Existing pattern (DO NOT edit, replicate): packages/shared-types/src/documento.ts exports `Documento`, `DocumentoListResponse`. Existing index.ts re-exports with `export * from './documento';`.

Existing pattern: packages/shared-validation/src/documentos.ts uses `z.object`, `z.coerce.number()`, `.default()`. createZodDto DTOs live in `dto/*.dto.ts` as `class XDto extends createZodDto(XSchema) {}`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update DATOS.md (D-01) + create shared contracts (Wave 0)</name>
  <read_first>
    - docs/DATOS.md (§4.6 eventos at line ~256, §9 changelog at line ~488 — read current state)
    - packages/shared-types/src/documento.ts (interface pattern to replicate)
    - packages/shared-types/src/index.ts (re-export pattern)
    - packages/shared-validation/src/documentos.ts (Zod pattern: z.object, z.coerce, .default, .nullable().optional())
    - packages/shared-validation/src/index.ts (re-export pattern)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 5 Zod, §Code Examples shared-types)
    - .planning/phases/07-calendario-y-facturaci-n/07-CONTEXT.md (D-01)
  </read_first>
  <action>
    1. docs/DATOS.md §4.6 `eventos`: add the field `mostrarEnCalendario: Boolean,  // F-066/D-01 — controla si el evento aparece en la vista global de calendario; siempre visible en pestaña Fechas del expediente. Default true.` to the schema block (after `color`). Add a fourth index bullet under §4.6 **Índices:** `- { usuarioId: 1, mostrarEnCalendario: 1, fechaInicio: 1 } — filtro de la vista global de calendario (D-03).`
    2. docs/DATOS.md §9 Changelog: append a row dated `2026-06-06` with text: `eventos: añadido campo mostrarEnCalendario (Boolean, default true) — controla visibilidad del evento en la vista global de calendario sin afectar la pestaña Fechas del expediente (D-01, Phase 7 / CAL-03). Añadido índice { usuarioId, mostrarEnCalendario, fechaInicio }.`
    3. Create packages/shared-types/src/evento.ts with `Evento`, `EventoListResponse`, `EventoCountResponse` interfaces exactly as in the <interfaces> block above.
    4. packages/shared-types/src/index.ts: add `export * from './evento';`.
    5. Create packages/shared-validation/src/eventos.ts:
       - `CreateEventoSchema = z.object({ origen: z.enum(['documento','manual']), expedienteId: z.string().length(24).nullable().optional(), documentoId: z.string().length(24).nullable().optional(), subtipo: z.enum(['fecha_limite','aviso','recordatorio']).nullable().optional(), titulo: z.string().min(1), descripcion: z.string().nullable().optional(), fechaInicio: z.string().datetime(), fechaFin: z.string().datetime().nullable().optional(), color: z.string().nullable().optional(), mostrarEnCalendario: z.boolean().default(true) })` + `export type CreateEventoInput = z.infer<...>`.
       - `UpdateEventoSchema = CreateEventoSchema.partial().omit({ origen: true })` + `UpdateEventoInput`.
       - `QueryEventoSchema = z.object({ expedienteId: z.string().length(24).optional(), documentoId: z.string().length(24).optional(), fechaDesde: z.string().datetime().optional(), fechaHasta: z.string().datetime().optional(), soloCalendario: z.coerce.boolean().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(50) })` + `QueryEventoInput`.
       - `CountEventoQuerySchema = z.object({ documentoId: z.string().length(24) })` + `CountEventoQueryInput`.
    6. packages/shared-validation/src/index.ts: add `export * from './eventos';`.
    7. Build shared packages: `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build`.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build</automated>
  </verify>
  <acceptance_criteria>
    - `grep mostrarEnCalendario docs/DATOS.md` returns at least 2 matches (schema + changelog)
    - `grep 2026-06-06 docs/DATOS.md` returns a changelog row
    - `packages/shared-types/src/evento.ts` exists and `grep "mostrarEnCalendario" packages/shared-types/src/evento.ts` matches
    - `grep "export \* from './evento'" packages/shared-types/src/index.ts` matches
    - `grep "CreateEventoSchema" packages/shared-validation/src/eventos.ts` and `grep "QueryEventoSchema" packages/shared-validation/src/eventos.ts` match
    - `grep "export \* from './eventos'" packages/shared-validation/src/index.ts` matches
    - shared-types + shared-validation builds exit 0
  </acceptance_criteria>
  <done>DATOS.md documents D-01 with changelog; evento.ts types + eventos Zod schemas exist and build; consumers can import from @lexscribe/shared-types and @lexscribe/shared-validation.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Eventos schema + repository + tests</name>
  <read_first>
    - apps/backend/src/modules/documentos/schemas/documento.schema.ts (schema + softDeletePlugin + index pattern to mirror)
    - apps/backend/src/modules/documentos/documentos.repository.ts (toObjectId helper, create/findById/listByExpediente/softDelete + activo:true filter pattern)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (jest mock pattern, FAKE ids, makeX factories)
    - apps/backend/src/common/plugins/soft-delete.plugin.ts (confirm it does NOT hook aggregate)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 1 schema with full @Prop list, Pitfall 1)
  </read_first>
  <behavior>
    - eventos.repository.spec.ts: create() persists usuarioId+expedienteId+documentoId as ObjectId; origen/subtipo/mostrarEnCalendario stored.
    - list() with soloCalendario=true adds `mostrarEnCalendario: true` to the filter (CAL-03).
    - list() with fechaDesde/fechaHasta builds a `fechaInicio: { $gte, $lte }` range.
    - softDeleteByDocumentoId(uid, docId) calls updateMany with `{ documentoId, usuarioId }` setting activo:false (CAL-05 support).
    - countByDocumentoId(uid, docId) returns count of `{ documentoId, usuarioId, activo: true }` (FL-9 pre-check).
  </behavior>
  <action>
    1. Create apps/backend/src/modules/eventos/schemas/evento.schema.ts EXACTLY per RESEARCH Pattern 1: `@Schema({ collection: 'eventos', timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } })`, props: usuarioId (ObjectId ref Usuario, required, index), origen (enum ['documento','manual'] required), expedienteId (ObjectId ref Expediente, default null), documentoId (ObjectId ref Documento, default null), subtipo (enum ['fecha_limite','aviso','recordatorio'] default null), titulo (String required), descripcion (String default null), fechaInicio (Date required), fechaFin (Date default null), color (String default null), `mostrarEnCalendario` (Boolean default true, index). Apply `EventoSchema.plugin(softDeletePlugin)`. Indices: `{ fechaInicio: 1 }`, `{ expedienteId: 1, fechaInicio: 1 }`, `{ documentoId: 1 }`, `{ usuarioId: 1, mostrarEnCalendario: 1, fechaInicio: 1 }`.
    2. Create apps/backend/src/modules/eventos/eventos.repository.ts mirroring documentos.repository.ts: `toObjectId` helper; `CreateEventoData` interface; methods:
       - `create(usuarioId, data)` → model.create with usuarioId/expedienteId/documentoId coerced to ObjectId (null-safe).
       - `findById(usuarioId, id)` → findOne `{ _id, usuarioId, activo: true }`.
       - `list(usuarioId, q: QueryEventoInput)` → build filter `{ usuarioId, activo: true }`, add `expedienteId` if present, `documentoId` if present, `mostrarEnCalendario: true` if `q.soloCalendario`, and `fechaInicio` range from fechaDesde/fechaHasta; sort `{ fechaInicio: 1 }`, paginate via page/limit, return `{ items, total }` (count via countDocuments).
       - `update(usuarioId, id, patch)` → findOneAndUpdate `{ _id, usuarioId, activo: true }`, `{ $set: patch }`, `{ returnDocument: 'after' }`.
       - `softDelete(usuarioId, id)` → findOneAndUpdate set activo:false, fechaInactivacion:new Date(), returnDocument:'after'.
       - `softDeleteByDocumentoId(usuarioId, documentoId)` → `updateMany({ documentoId, usuarioId, activo: true }, { $set: { activo: false, fechaInactivacion: new Date() } })` returning the modifiedCount.
       - `countByDocumentoId(usuarioId, documentoId)` → countDocuments `{ documentoId, usuarioId, activo: true }`.
    3. Create apps/backend/src/modules/eventos/tests/eventos.repository.spec.ts: unit-test list() filter construction (soloCalendario adds mostrarEnCalendario:true; date range), softDeleteByDocumentoId calls updateMany with correct filter, countByDocumentoId. Mock the Mongoose model (jest.fn for find/countDocuments/updateMany returning chainable `{ sort, skip, limit, exec }`). Follow the mock chain style used in documentos repo spec.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.repository.spec</automated>
  </verify>
  <acceptance_criteria>
    - `grep "mostrarEnCalendario" apps/backend/src/modules/eventos/schemas/evento.schema.ts` matches
    - `grep "softDeletePlugin" apps/backend/src/modules/eventos/schemas/evento.schema.ts` matches
    - `grep "softDeleteByDocumentoId" apps/backend/src/modules/eventos/eventos.repository.ts` matches
    - `grep "countByDocumentoId" apps/backend/src/modules/eventos/eventos.repository.ts` matches
    - `grep "activo: true" apps/backend/src/modules/eventos/eventos.repository.ts` matches (read-path soft-delete filter)
    - eventos.repository.spec test command exits 0
  </acceptance_criteria>
  <done>Schema with mostrarEnCalendario + 4 indices + softDeletePlugin; repository with all 7 methods; repository spec green covering soloCalendario filter and softDeleteByDocumentoId.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Eventos service + controller + module + DTOs + service tests + AppModule wiring</name>
  <read_first>
    - apps/backend/src/modules/documentos/documentos.service.ts (service pattern, NotFoundError usage)
    - apps/backend/src/modules/documentos/documentos.controller.ts (JwtAuthGuard, AuditInterceptor, @Audited, @CurrentUser, MongoIdPipe, @Query patterns)
    - apps/backend/src/modules/documentos/documentos.module.ts (module registration: MongooseModule.forFeature, AuditoriaModule, AuthModule imports, exports)
    - apps/backend/src/modules/documentos/dto/query-documento.dto.ts (createZodDto pattern)
    - apps/backend/src/app.module.ts (imports[] array — add EventosModule)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (mock factory + jest pattern)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pitfall 4 one-way dep; endpoints list in requirements table)
  </read_first>
  <behavior>
    - eventos.service.spec.ts: create(uid, dto) calls repo.create with usuarioId + dto; returns created (CAL-01/CAL-02).
    - getById throws NotFoundError('evento', id) when repo returns null.
    - update(uid, id, patch) throws NotFoundError when repo.update returns null; otherwise returns updated (CAL-04 color via patch).
    - remove(uid, id) throws NotFoundError when repo.softDelete returns null.
    - countByDocumento(uid, documentoId) returns `{ total }` from repo.countByDocumentoId.
  </behavior>
  <action>
    1. Create dto files: `dto/create-evento.dto.ts` → `class CreateEventoDto extends createZodDto(CreateEventoSchema) {}`; `dto/update-evento.dto.ts` → `UpdateEventoDto` from UpdateEventoSchema; `dto/query-evento.dto.ts` → `QueryEventoDto` from QueryEventoSchema. Import schemas from `@lexscribe/shared-validation`.
    2. Create apps/backend/src/modules/eventos/eventos.service.ts (@Injectable) injecting EventosRepository. Methods: `create(usuarioId, dto: CreateEventoInput)` → repo.create; `list(usuarioId, q: QueryEventoInput)` → `{ items, total } = repo.list(...)` then return `{ items, total, page: q.page, limit: q.limit }`; `getById(usuarioId, id)` → repo.findById, throw `new NotFoundError('evento', id)` if null; `update(usuarioId, id, dto: UpdateEventoInput)` → repo.update, throw NotFoundError if null; `remove(usuarioId, id)` → repo.softDelete, throw NotFoundError if null; `countByDocumento(usuarioId, documentoId)` → `{ total: await repo.countByDocumentoId(...) }`. Import errors from `../../common/errors`.
    3. Create apps/backend/src/modules/eventos/eventos.controller.ts: `@UseGuards(JwtAuthGuard) @UseInterceptors(AuditInterceptor) @Controller('eventos')`. Endpoints:
       - `@Post()` `@Audited('evento','create')` → create(uid, dto: CreateEventoDto). (CAL-01, CAL-02)
       - `@Get('count')` → countByDocumento(uid, @Query('documentoId') documentoId) — place BEFORE `:id` route to avoid shadowing. (FL-9 pre-check)
       - `@Get()` → list(uid, @Query() q: QueryEventoDto). (CAL-03)
       - `@Get(':id')` → getById(uid, @Param('id', MongoIdPipe) id).
       - `@Patch(':id')` `@Audited('evento','update')` → update(uid, id, dto: UpdateEventoDto). (CAL-04)
       - `@Delete(':id')` `@Audited('evento','delete')` → remove(uid, id).
       Use `@CurrentUser('id') uid: string` everywhere; never accept usuarioId in body (AUTH-04).
    4. Create apps/backend/src/modules/eventos/eventos.module.ts: imports MongooseModule.forFeature([{ name: Evento.name, schema: EventoSchema }]), AuditoriaModule, AuthModule; controllers [EventosController]; providers [EventosService, EventosRepository]; exports [EventosService, EventosRepository] (07-03 DocumentosModule will import EventosModule one-way — no forwardRef, Pitfall 4).
    5. apps/backend/src/app.module.ts: import EventosModule and add to imports[] array (after DocumentosModule).
    6. Create apps/backend/src/modules/eventos/tests/eventos.service.spec.ts per <behavior> with a mocked EventosRepository factory (jest.fn for create/findById/list/update/softDelete/countByDocumentoId).
    7. apps/backend/jest.config.ts: add a coverageThreshold entry for `./src/modules/eventos/` at lines/functions >= 80% (SEC-06 continuity), mirroring the existing `./src/modules/documentos/` entry exactly (same structure/keys). Read the documentos threshold block first and copy its shape.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.service.spec && pnpm --filter @lexscribe/backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "@Audited('evento'" apps/backend/src/modules/eventos/eventos.controller.ts` matches (create/update/delete audited)
    - `grep "Get('count')" apps/backend/src/modules/eventos/eventos.controller.ts` matches and appears before `Get(':id')`
    - `grep "NotFoundError('evento'" apps/backend/src/modules/eventos/eventos.service.ts` matches
    - `grep "EventosModule" apps/backend/src/app.module.ts` matches in imports
    - `grep "exports:" apps/backend/src/modules/eventos/eventos.module.ts` includes EventosService and EventosRepository
    - `grep "modules/eventos" apps/backend/jest.config.ts` matches (coverageThreshold entry added, SEC-06)
    - eventos.service.spec exits 0 and backend build exits 0
  </acceptance_criteria>
  <done>EventosController exposes POST/GET/GET count/GET :id/PATCH/DELETE with auth+audit; service throws NotFoundError correctly; module registered in AppModule and exports service+repository for FL-9; service spec green; backend builds.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend test` green (eventos service + repository specs)
- `pnpm --filter @lexscribe/backend build` succeeds
- `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build` succeed
- `grep mostrarEnCalendario docs/DATOS.md` matches both schema and changelog
</verification>

<success_criteria>
- CAL-01/CAL-02: POST /eventos accepts origen documento|manual and persists documentoId/expedienteId/subtipo.
- CAL-03: GET /eventos filters by expedienteId, date range, and soloCalendario (mostrarEnCalendario=true).
- CAL-04: PATCH /eventos/:id updates color.
- CAL-05 (backend): softDeleteByDocumentoId + GET /eventos/count exist and are exported for FL-9 (07-03).
- D-01 registered in DATOS.md §4.6 + §9 changelog dated 2026-06-06.
</success_criteria>

<output>
After completion, create `.planning/phases/07-calendario-y-facturaci-n/07-01-SUMMARY.md`
</output>
