---
phase: 07-calendario-y-facturaci-n
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-types/src/factura.ts
  - packages/shared-types/src/index.ts
  - packages/shared-validation/src/facturacion.ts
  - packages/shared-validation/src/index.ts
  - apps/backend/src/modules/facturacion/schemas/factura.schema.ts
  - apps/backend/src/modules/facturacion/facturacion.repository.ts
  - apps/backend/src/modules/facturacion/facturacion.service.ts
  - apps/backend/src/modules/facturacion/facturacion.controller.ts
  - apps/backend/src/modules/facturacion/facturacion.module.ts
  - apps/backend/src/modules/facturacion/dto/create-factura.dto.ts
  - apps/backend/src/modules/facturacion/dto/update-factura.dto.ts
  - apps/backend/src/modules/facturacion/dto/update-estado.dto.ts
  - apps/backend/src/modules/facturacion/dto/query-factura.dto.ts
  - apps/backend/src/modules/facturacion/tests/facturacion.service.spec.ts
  - apps/backend/src/modules/facturacion/tests/facturacion.repository.spec.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: [FAC-01, FAC-02, FAC-03, FAC-04, FAC-05]
must_haves:
  truths:
    - "POST /facturas creates an entry with default estado=pendiente and default fecha=today"
    - "GET /facturas?expedienteId=:id returns entries for that expediente sorted by fecha desc"
    - "PATCH /facturas/:id/estado updates estado to pendiente|facturado|cobrado"
    - "PATCH /facturas/:id edits concepto/importe/fecha/numero/notas; DELETE soft-deletes"
    - "GET /facturas/totales/:expedienteId returns total + per-status subtotals computed via $sum aggregate with activo:true"
  artifacts:
    - path: "apps/backend/src/modules/facturacion/schemas/factura.schema.ts"
      provides: "Factura schema + softDeletePlugin + indices"
      contains: "estado"
    - path: "apps/backend/src/modules/facturacion/facturacion.repository.ts"
      provides: "create/listByExpediente/update/updateEstado/softDelete/getTotales"
      contains: "getTotales"
    - path: "apps/backend/src/modules/facturacion/facturacion.controller.ts"
      provides: "REST endpoints with JwtAuthGuard + @Audited + @CurrentUser"
      contains: "@Audited"
    - path: "packages/shared-types/src/factura.ts"
      provides: "Factura + FacturaListResponse + FacturaTotales interfaces"
      exports: ["Factura", "FacturaListResponse", "FacturaTotales"]
    - path: "packages/shared-validation/src/facturacion.ts"
      provides: "CreateFacturaSchema/UpdateFacturaSchema/UpdateEstadoSchema/QueryFacturaSchema"
      exports: ["CreateFacturaSchema", "UpdateEstadoSchema"]
  key_links:
    - from: "apps/backend/src/app.module.ts"
      to: "FacturacionModule"
      via: "imports[] registration"
      pattern: "FacturacionModule"
    - from: "apps/backend/src/modules/facturacion/facturacion.repository.ts"
      to: "mongoose aggregate $match/$group"
      via: "activo:true in $match (softDeletePlugin does NOT hook aggregate)"
      pattern: "activo: true"
---

<objective>
Build the backend FacturacionModule (collection `facturas`) plus shared contracts. Covers FAC-01 (billing per expediente), FAC-02 (entries with defaults), FAC-03 (estado update), FAC-04 (edit/delete), FAC-05 (total + per-status subtotals via on-the-fly $sum aggregate).

This plan includes its own Wave 0 contract work (shared-types `factura.ts` + shared-validation `facturacion.ts`) so the frontend (07-04) builds against stable contracts. Independent of 07-01 — both backend plans run in Wave 1 in parallel (no file overlap except app.module.ts and index.ts, which are append-only additions; coordinate by appending distinct lines).

Purpose: A clean, audited, soft-delete-aware facturas API mirroring documentos, with the critical billing aggregate that explicitly includes `activo: true` (RESEARCH Pitfall 1 — softDeletePlugin does NOT intercept .aggregate()).
Output: FacturacionModule registered in AppModule, shared `factura.ts` types + Zod schemas, unit tests for service + repository (incl. aggregate with activo filter).
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
<!-- Contracts this plan CREATES (consumed by 07-04). Mirror documentos.ts patterns. -->

New: packages/shared-types/src/factura.ts
```typescript
export type EstadoFactura = 'pendiente' | 'facturado' | 'cobrado';
export interface Factura {
  _id: string;
  usuarioId: string;
  expedienteId: string;
  concepto: string;
  importe: number;
  fecha: string;          // ISO string
  numero: string | null;
  notas: string | null;
  estado: EstadoFactura;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}
export interface FacturaListResponse {
  items: Factura[];
  total: number;
  page: number;
  limit: number;
}
export interface FacturaTotales {
  total: number;
  pendiente: number;
  facturado: number;
  cobrado: number;
}
```

Existing pattern (DATOS §4.7): fields concepto(req), importe(Number req), fecha(ISODate default hoy), numero(opt), notas(opt), estado(enum default pendiente). Indices: `{ expedienteId: 1, fecha: -1 }`, `{ estado: 1 }`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create shared contracts factura.ts + facturacion.ts (Wave 0)</name>
  <read_first>
    - docs/DATOS.md §4.7 facturas (line ~291 — fields, indices, $sum note)
    - packages/shared-types/src/documento.ts (interface pattern)
    - packages/shared-types/src/index.ts (re-export)
    - packages/shared-validation/src/documentos.ts (Zod pattern)
    - packages/shared-validation/src/index.ts (re-export)
    - .planning/phases/07-calendario-y-facturaci-n/07-CONTEXT.md (D-12/D-13/D-14)
  </read_first>
  <action>
    1. Create packages/shared-types/src/factura.ts with `EstadoFactura`, `Factura`, `FacturaListResponse`, `FacturaTotales` exactly as in the <interfaces> block.
    2. packages/shared-types/src/index.ts: add `export * from './factura';`.
    3. Create packages/shared-validation/src/facturacion.ts:
       - `CreateFacturaSchema = z.object({ expedienteId: z.string().length(24), concepto: z.string().min(1), importe: z.number(), fecha: z.string().datetime().optional(), numero: z.string().nullable().optional(), notas: z.string().nullable().optional(), estado: z.enum(['pendiente','facturado','cobrado']).default('pendiente') })` + `CreateFacturaInput`. (fecha optional → service defaults to today per FAC-02; estado default pendiente per FAC-03.)
       - `UpdateFacturaSchema = z.object({ concepto: z.string().min(1).optional(), importe: z.number().optional(), fecha: z.string().datetime().optional(), numero: z.string().nullable().optional(), notas: z.string().nullable().optional() })` + `UpdateFacturaInput`. (estado is NOT here — dedicated endpoint.)
       - `UpdateEstadoSchema = z.object({ estado: z.enum(['pendiente','facturado','cobrado']) })` + `UpdateEstadoInput`. (FAC-03)
       - `QueryFacturaSchema = z.object({ expedienteId: z.string().length(24), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(100) })` + `QueryFacturaInput`.
    4. packages/shared-validation/src/index.ts: add `export * from './facturacion';`.
    5. Build: `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build`.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build</automated>
  </verify>
  <acceptance_criteria>
    - `packages/shared-types/src/factura.ts` exists and `grep "FacturaTotales" packages/shared-types/src/factura.ts` matches
    - `grep "export \* from './factura'" packages/shared-types/src/index.ts` matches
    - `grep "UpdateEstadoSchema" packages/shared-validation/src/facturacion.ts` matches
    - `grep "estado: z.enum(\['pendiente','facturado','cobrado'\]).default('pendiente')" packages/shared-validation/src/facturacion.ts` matches (default pendiente)
    - `grep "export \* from './facturacion'" packages/shared-validation/src/index.ts` matches
    - shared builds exit 0
  </acceptance_criteria>
  <done>factura.ts types + facturacion Zod schemas (incl. UpdateEstadoSchema, default pendiente) exist and build; consumers can import them.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Factura schema + repository (incl. getTotales aggregate) + repository tests</name>
  <read_first>
    - apps/backend/src/modules/documentos/schemas/documento.schema.ts (schema + softDeletePlugin + index pattern)
    - apps/backend/src/modules/documentos/documentos.repository.ts (toObjectId, create/list/softDelete + activo:true filter)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (mock factory pattern)
    - apps/backend/src/common/plugins/soft-delete.plugin.ts (confirm aggregate is NOT hooked → Pitfall 1)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 3 getTotales aggregate, Pitfall 1, Pitfall 6 float rounding)
    - docs/DATOS.md §4.7 (indices)
  </read_first>
  <behavior>
    - facturacion.repository.spec.ts: getTotales() builds an aggregate with `$match: { usuarioId, expedienteId, activo: true }` then `$group: { _id: '$estado', subtotal: { $sum: '$importe' } }`; maps rows into `{ total, pendiente, facturado, cobrado }` with missing statuses defaulting to 0.
    - getTotales rounds to 2 decimals (Pitfall 6): e.g. mocked rows pendiente=1.10, facturado=2.20 → total=3.3 (not 3.3000000000000003).
    - listByExpediente() filter includes `activo: true` and sorts `{ fecha: -1 }`.
    - softDelete sets activo:false.
  </behavior>
  <action>
    1. Create apps/backend/src/modules/facturacion/schemas/factura.schema.ts: `@Schema({ collection: 'facturas', timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } })`. Props: usuarioId (ObjectId ref Usuario, required, index), expedienteId (ObjectId ref Expediente, required), concepto (String required), importe (Number required), fecha (Date required), numero (String default null), notas (String default null), estado (enum ['pendiente','facturado','cobrado'] default 'pendiente'). Apply `FacturaSchema.plugin(softDeletePlugin)`. Indices: `{ expedienteId: 1, fecha: -1 }`, `{ estado: 1 }`.
    2. Create apps/backend/src/modules/facturacion/facturacion.repository.ts mirroring documentos repo: `toObjectId` helper; `CreateFacturaData` interface; methods:
       - `create(usuarioId, data)` → model.create with usuarioId/expedienteId coerced to ObjectId.
       - `findById(usuarioId, id)` → findOne `{ _id, usuarioId, activo: true }`.
       - `listByExpediente(usuarioId, expedienteId, q: QueryFacturaInput)` → filter `{ usuarioId, expedienteId, activo: true }`, sort `{ fecha: -1 }`, paginate; return `{ items, total }`.
       - `update(usuarioId, id, patch)` → findOneAndUpdate `{ _id, usuarioId, activo: true }`, `{ $set: patch }`, returnDocument:'after'.
       - `updateEstado(usuarioId, id, estado)` → findOneAndUpdate set estado, returnDocument:'after'.
       - `softDelete(usuarioId, id)` → findOneAndUpdate set activo:false + fechaInactivacion, returnDocument:'after'.
       - `getTotales(usuarioId, expedienteId)` → EXACTLY per RESEARCH Pattern 3: aggregate `[{ $match: { usuarioId: oid, expedienteId: oid, activo: true } }, { $group: { _id: '$estado', subtotal: { $sum: '$importe' } } }]`; build `map[row._id] = row.subtotal`; return `{ total, pendiente, facturado, cobrado }` where each value is `Math.round((map[k] ?? 0) * 100) / 100` and total is the rounded sum (Pitfall 6). **The `activo: true` in $match is MANDATORY — softDeletePlugin does NOT hook .aggregate().**
    3. Create apps/backend/src/modules/facturacion/tests/facturacion.repository.spec.ts: mock model.aggregate to return `[{_id:'pendiente',subtotal:1.10},{_id:'facturado',subtotal:2.20}]`; assert getTotales returns `{ total:3.3, pendiente:1.1, facturado:2.2, cobrado:0 }` and that the pipeline passed to aggregate contains `activo: true` in $match. Also test listByExpediente builds filter with activo:true and sort fecha:-1.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.repository.spec</automated>
  </verify>
  <acceptance_criteria>
    - `grep "estado" apps/backend/src/modules/facturacion/schemas/factura.schema.ts` matches with default 'pendiente'
    - `grep "softDeletePlugin" apps/backend/src/modules/facturacion/schemas/factura.schema.ts` matches
    - `grep "getTotales" apps/backend/src/modules/facturacion/facturacion.repository.ts` matches
    - `grep "activo: true" apps/backend/src/modules/facturacion/facturacion.repository.ts` matches inside the aggregate $match
    - `grep "Math.round" apps/backend/src/modules/facturacion/facturacion.repository.ts` matches (Pitfall 6 rounding)
    - facturacion.repository.spec exits 0
  </acceptance_criteria>
  <done>Factura schema + softDeletePlugin + 2 indices; repository with getTotales aggregate that explicitly filters activo:true and rounds to 2 decimals; repository spec green proving aggregate excludes inactive and rounds correctly.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Facturacion service + controller + module + DTOs + service tests + AppModule wiring</name>
  <read_first>
    - apps/backend/src/modules/documentos/documentos.service.ts (service pattern, NotFoundError)
    - apps/backend/src/modules/documentos/documentos.controller.ts (guards, audit, @CurrentUser, MongoIdPipe, @Query)
    - apps/backend/src/modules/documentos/documentos.module.ts (module registration + exports)
    - apps/backend/src/modules/documentos/dto/query-documento.dto.ts (createZodDto)
    - apps/backend/src/app.module.ts (imports[] — add FacturacionModule)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (endpoints in requirements table)
  </read_first>
  <behavior>
    - facturacion.service.spec.ts: create(uid, dto) when dto.fecha omitted defaults fecha to a Date ~ now (FAC-02); estado defaults pendiente from Zod (FAC-03).
    - getById/update/updateEstado/remove throw NotFoundError('factura', id) when repo returns null.
    - getTotales(uid, expedienteId) returns the repo's totales object (FAC-05).
  </behavior>
  <action>
    1. Create DTO files: `dto/create-factura.dto.ts` (CreateFacturaDto from CreateFacturaSchema), `dto/update-factura.dto.ts` (UpdateFacturaDto), `dto/update-estado.dto.ts` (UpdateEstadoDto from UpdateEstadoSchema), `dto/query-factura.dto.ts` (QueryFacturaDto). All via `createZodDto` importing from `@lexscribe/shared-validation`.
    2. Create apps/backend/src/modules/facturacion/facturacion.service.ts (@Injectable) injecting FacturacionRepository. Methods:
       - `create(usuarioId, dto: CreateFacturaInput)` → resolve `const fecha = dto.fecha ? new Date(dto.fecha) : new Date();` then `repo.create(usuarioId, { ...dto, fecha })` (FAC-02 default today).
       - `list(usuarioId, q: QueryFacturaInput)` → `{ items, total } = repo.listByExpediente(usuarioId, q.expedienteId, q)`; return `{ items, total, page: q.page, limit: q.limit }`.
       - `getById` → repo.findById, NotFoundError if null.
       - `update(usuarioId, id, dto: UpdateFacturaInput)` → coerce fecha if present, repo.update, NotFoundError if null (FAC-04).
       - `updateEstado(usuarioId, id, estado)` → repo.updateEstado, NotFoundError if null (FAC-03).
       - `remove(usuarioId, id)` → repo.softDelete, NotFoundError if null (FAC-04).
       - `getTotales(usuarioId, expedienteId)` → repo.getTotales (FAC-05).
       Import errors from `../../common/errors`.
    3. Create apps/backend/src/modules/facturacion/facturacion.controller.ts: `@UseGuards(JwtAuthGuard) @UseInterceptors(AuditInterceptor) @Controller('facturas')`. Endpoints:
       - `@Post()` `@Audited('factura','create')` → create(uid, dto: CreateFacturaDto). (FAC-02)
       - `@Get('totales/:expedienteId')` → getTotales(uid, @Param('expedienteId', MongoIdPipe) expedienteId). Place BEFORE `:id` route. (FAC-05)
       - `@Get()` → list(uid, @Query() q: QueryFacturaDto). (FAC-01)
       - `@Patch(':id/estado')` `@Audited('factura','update')` → updateEstado(uid, id, dto.estado: UpdateEstadoDto). (FAC-03)
       - `@Patch(':id')` `@Audited('factura','update')` → update(uid, id, dto: UpdateFacturaDto). (FAC-04)
       - `@Delete(':id')` `@Audited('factura','delete')` → remove(uid, id). (FAC-04)
       Use `@CurrentUser('id') uid: string`; never usuarioId in body (AUTH-04).
    4. Create apps/backend/src/modules/facturacion/facturacion.module.ts: imports MongooseModule.forFeature([{ name: Factura.name, schema: FacturaSchema }]), AuditoriaModule, AuthModule; controllers [FacturacionController]; providers [FacturacionService, FacturacionRepository]; exports [FacturacionService].
    5. apps/backend/src/app.module.ts: import FacturacionModule, add to imports[] (after EventosModule / DocumentosModule).
    6. Create apps/backend/src/modules/facturacion/tests/facturacion.service.spec.ts per <behavior> with a mocked FacturacionRepository.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.service.spec && pnpm --filter @lexscribe/backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "@Audited('factura'" apps/backend/src/modules/facturacion/facturacion.controller.ts` matches
    - `grep "totales/:expedienteId" apps/backend/src/modules/facturacion/facturacion.controller.ts` matches and appears before `:id`
    - `grep ":id/estado" apps/backend/src/modules/facturacion/facturacion.controller.ts` matches (FAC-03 dedicated endpoint)
    - `grep "NotFoundError('factura'" apps/backend/src/modules/facturacion/facturacion.service.ts` matches
    - `grep "FacturacionModule" apps/backend/src/app.module.ts` matches in imports
    - facturacion.service.spec exits 0 and backend build exits 0
  </acceptance_criteria>
  <done>FacturacionController exposes POST/GET totales/GET/PATCH estado/PATCH/DELETE with auth+audit; service defaults fecha to today + throws NotFoundError; module registered in AppModule; service spec green; backend builds.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend test` green (facturacion service + repository specs)
- `pnpm --filter @lexscribe/backend build` succeeds
- `pnpm --filter @lexscribe/shared-types build && pnpm --filter @lexscribe/shared-validation build` succeed
- getTotales aggregate provably excludes activo:false records and rounds to 2 decimals
</verification>

<success_criteria>
- FAC-01: GET /facturas?expedienteId returns expediente entries sorted by fecha desc.
- FAC-02: POST /facturas defaults fecha=today, estado=pendiente.
- FAC-03: PATCH /facturas/:id/estado changes estado.
- FAC-04: PATCH /facturas/:id edits + DELETE /facturas/:id soft-deletes.
- FAC-05: GET /facturas/totales/:expedienteId returns total + subtotals via $sum aggregate with activo:true filter.
</success_criteria>

<output>
After completion, create `.planning/phases/07-calendario-y-facturaci-n/07-02-SUMMARY.md`
</output>
