---
phase: 04-clausulas-y-expedientes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/modules/clausulas/schemas/clausula.schema.ts
  - apps/backend/src/modules/clausulas/clausulas.repository.ts
  - apps/backend/src/modules/clausulas/clausulas.service.ts
  - apps/backend/src/modules/clausulas/clausulas.controller.ts
  - apps/backend/src/modules/clausulas/clausulas.module.ts
  - apps/backend/src/modules/clausulas/dto/create-clausula.dto.ts
  - apps/backend/src/modules/clausulas/dto/update-clausula.dto.ts
  - apps/backend/src/modules/clausulas/dto/query-clausula.dto.ts
  - apps/backend/src/app.module.ts
  - apps/backend/test/clausulas/clausulas.e2e-spec.ts
  - packages/shared-validation/src/clausulas.ts
  - packages/shared-validation/src/index.ts
  - packages/shared-types/src/clausula.ts
  - packages/shared-types/src/index.ts
autonomous: true
requirements: [CLAU-01, CLAU-02, CLAU-03]
must_haves:
  truths:
    - "El usuario puede crear, editar y borrar cláusulas con texto, nombre y labels libres"
    - "El usuario puede buscar cláusulas por texto (full-text) y filtrar por label"
    - "Borrar una cláusula la marca como inactiva (soft-delete) y desaparece del listado por defecto"
    - "Toda mutación (create/update/delete) queda registrada en `auditoria`"
  artifacts:
    - path: "apps/backend/src/modules/clausulas/schemas/clausula.schema.ts"
      provides: "Mongoose schema Clausula con softDeletePlugin + text index"
      contains: "ClausulaSchema.index"
    - path: "apps/backend/src/modules/clausulas/clausulas.controller.ts"
      provides: "Endpoints REST GET/POST/PATCH/DELETE /clausulas con JwtAuthGuard + AuditInterceptor"
      contains: "@UseGuards(JwtAuthGuard)"
    - path: "packages/shared-validation/src/clausulas.ts"
      provides: "Zod schemas CreateClausulaSchema / UpdateClausulaSchema / QueryClausulaSchema"
      exports: ["CreateClausulaSchema", "UpdateClausulaSchema", "QueryClausulaSchema"]
    - path: "apps/backend/test/clausulas/clausulas.e2e-spec.ts"
      provides: "Cobertura e2e CRUD + búsqueda + filtro labels + soft-delete"
      min_lines: 200
  key_links:
    - from: "apps/backend/src/modules/clausulas/clausulas.controller.ts"
      to: "ClausulasService"
      via: "constructor injection"
      pattern: "private readonly service: ClausulasService"
    - from: "apps/backend/src/modules/clausulas/clausulas.repository.ts"
      to: "Mongo $text index"
      via: "$text $search query"
      pattern: "\\$text.*\\$search"
    - from: "apps/backend/src/modules/clausulas/clausulas.module.ts"
      to: "apps/backend/src/app.module.ts"
      via: "imports array"
      pattern: "ClausulasModule"
---

<objective>
Implementar el módulo NestJS `clausulas` siguiendo el patrón exacto de Phase 3 `contactos`: schema Mongoose con `softDeletePlugin` + índice `$text`, repository con búsqueda full-text + filtro por label, service con validación y errores tipados, controller con `JwtAuthGuard` + `AuditInterceptor`, DTOs Zod en `@lexscribe/shared-validation`, types en `@lexscribe/shared-types`, módulo registrado en `AppModule`. Tests e2e exhaustivos cubriendo CLAU-01..03 + soft-delete + auditoría.

Purpose: Cubrir CLAU-01 (CRUD cláusulas), CLAU-02 (labels libres múltiples), CLAU-03 (búsqueda + filtro por label) — biblioteca de cláusulas operativa antes de Phase 5 (que las insertará en plantillas).

Output: Módulo backend `clausulas` 100% funcional con endpoints REST autenticados, validados, auditados, soft-delete habilitado y suite e2e verde.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-clausulas-y-expedientes/04-RESEARCH.md
@docs/DATOS.md
@docs/FUNCIONAL.md
@docs/ARQUITECTURA.md
@CLAUDE.md

# Phase 3 reference patterns (copy structure verbatim, adapt fields)
@apps/backend/src/modules/contactos/schemas/contacto.schema.ts
@apps/backend/src/modules/contactos/contactos.repository.ts
@apps/backend/src/modules/contactos/contactos.service.ts
@apps/backend/src/modules/contactos/contactos.controller.ts
@apps/backend/src/modules/contactos/contactos.module.ts
@apps/backend/src/modules/contactos/dto/create-contacto.dto.ts
@apps/backend/test/contactos/contactos.e2e-spec.ts
@packages/shared-validation/src/contactos.ts
@packages/shared-validation/src/index.ts
@packages/shared-types/src/contacto.ts

<interfaces>
<!-- Key contracts the executor must use directly -->

From apps/backend/src/common/plugins/soft-delete.plugin.ts:
```typescript
export function softDeletePlugin(schema: Schema): void;
// Adds `activo: Boolean (default true)` + `fechaInactivacion: Date|null`
// Pre-hooks on find/findOne/findOneAndUpdate/countDocuments auto-filter `activo: true`
// unless query has `withInactive: true` option set.
```

From apps/backend/src/common/errors/index.ts:
```typescript
export class NotFoundError extends DomainError {
  constructor(recurso: string, id: string);  // → HTTP 404, body { code:'NOT_FOUND', message }
}
export class ConflictError extends DomainError {
  constructor(message: string);              // → HTTP 409, body { code:'CONFLICT', message }
}
export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown);  // → HTTP 400
}
```

From apps/backend/src/common/decorators/current-user.decorator.ts:
```typescript
export const CurrentUser: (field?: string) => ParameterDecorator;
// Usage: @CurrentUser('id') uid: string  → injects req.user.id (from JWT)
```

From apps/backend/src/common/pipes/mongo-id.pipe.ts:
```typescript
export class MongoIdPipe implements PipeTransform<string, string>;
// Throws ValidationError if param is not a 24-char hex ObjectId
```

From apps/backend/src/modules/auditoria/decorators/audited.decorator.ts:
```typescript
export const Audited: (recurso: string, accion: string) => MethodDecorator;
// Usage: @Audited('clausula', 'create')
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Crear schemas Zod + tipos compartidos para Cláusula</name>
  <read_first>
    - packages/shared-validation/src/contactos.ts (patrón Zod)
    - packages/shared-validation/src/esquemas.ts (para reutilizar `NombreParametroSchema` si fuese necesario — cláusulas NO usan parámetros dinámicos)
    - packages/shared-validation/src/index.ts (estructura de re-exports)
    - packages/shared-types/src/contacto.ts (patrón tipos)
    - packages/shared-types/src/index.ts (estructura de re-exports)
    - docs/DATOS.md §4.4 (esquema canónico clausulas)
  </read_first>
  <behavior>
    - CreateClausulaSchema acepta `{nombre, texto, labels?}` y rechaza extras (strict)
    - `nombre` y `texto` son strings no vacíos; `labels` es array de strings, default `[]`
    - UpdateClausulaSchema = CreateClausulaSchema.partial().strict()
    - QueryClausulaSchema valida `search?`, `label?`, `page` (default 1), `limit` (default 20, max 100)
    - `labels` se normalizan a lowercase trimmed (decisión registrada en RESEARCH §Open Questions Q2) mediante `.transform`
  </behavior>
  <action>
    1. Crear `packages/shared-validation/src/clausulas.ts` con:
       ```typescript
       import { z } from 'zod';

       const LabelSchema = z.string().min(1).max(60).trim().transform((s) => s.toLowerCase());

       export const CreateClausulaSchema = z.object({
         nombre: z.string().min(1).max(200),
         texto: z.string().min(1).max(50000),
         labels: z.array(LabelSchema).default([]),
       }).strict();

       export const UpdateClausulaSchema = CreateClausulaSchema.partial().strict();

       export const QueryClausulaSchema = z.object({
         search: z.string().optional(),
         label: LabelSchema.optional(),
         page: z.coerce.number().int().positive().default(1),
         limit: z.coerce.number().int().positive().max(100).default(20),
       }).strict();

       export type CreateClausulaInput = z.infer<typeof CreateClausulaSchema>;
       export type UpdateClausulaInput = z.infer<typeof UpdateClausulaSchema>;
       export type QueryClausulaInput = z.infer<typeof QueryClausulaSchema>;
       ```
    2. Añadir `export * from './clausulas';` a `packages/shared-validation/src/index.ts`.
    3. Crear `packages/shared-types/src/clausula.ts` con tipos `Clausula`, `ClausulaListResponse`:
       ```typescript
       export interface Clausula {
         _id: string;
         usuarioId: string;
         nombre: string;
         texto: string;
         labels: string[];
         activo: boolean;
         fechaCreacion: string;
         fechaActualizacion: string;
       }
       export interface ClausulaListResponse {
         items: Clausula[];
         total: number;
         page: number;
         limit: number;
       }
       ```
    4. Añadir `export * from './clausula';` a `packages/shared-types/src/index.ts`.
    5. Recompilar packages: `pnpm --filter @lexscribe/shared-validation build && pnpm --filter @lexscribe/shared-types build`.
  </action>
  <verify>
    <automated>cd packages/shared-validation &amp;&amp; pnpm build &amp;&amp; cd ../shared-types &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - Comando `grep -n "CreateClausulaSchema" packages/shared-validation/src/clausulas.ts` retorna línea con `export const CreateClausulaSchema`
    - Comando `grep -n "from './clausulas'" packages/shared-validation/src/index.ts` retorna match
    - Existe `packages/shared-validation/dist/clausulas.js` tras build
    - Existe `packages/shared-types/dist/clausula.d.ts` tras build
    - `node -e "console.log(Object.keys(require('./packages/shared-validation/dist')))"` lista `CreateClausulaSchema`, `UpdateClausulaSchema`, `QueryClausulaSchema`
  </acceptance_criteria>
  <done>
    Zod schemas + tipos disponibles para backend y frontend; builds de ambos packages verdes; tipos correctos al importar `from '@lexscribe/shared-validation'`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implementar ClausulasModule completo (schema + repository + service + controller + DTOs + module)</name>
  <read_first>
    - apps/backend/src/modules/contactos/schemas/contacto.schema.ts (patrón schema + softDeletePlugin)
    - apps/backend/src/modules/contactos/contactos.repository.ts (patrón findAll con paginación + filtros)
    - apps/backend/src/modules/contactos/contactos.service.ts (patrón service + errores tipados)
    - apps/backend/src/modules/contactos/contactos.controller.ts (patrón guards + decoradores audit)
    - apps/backend/src/modules/contactos/contactos.module.ts (patrón imports)
    - apps/backend/src/modules/contactos/dto/create-contacto.dto.ts (patrón `createZodDto`)
    - apps/backend/src/app.module.ts (donde registrar ClausulasModule)
    - docs/DATOS.md §4.4 (schema + índices canónicos)
  </read_first>
  <behavior>
    - GET /clausulas con `?search=foo` usa `$text: { $search: 'foo' }` y ordena por score
    - GET /clausulas con `?label=garantia` filtra `labels: 'garantia'` (ya en lowercase)
    - GET /clausulas sin filtros lista paginado por `fechaCreacion: -1`
    - POST /clausulas crea cláusula → 201 con doc; emite audit `clausula.create`
    - PATCH /clausulas/:id actualiza → 200; 404 si no existe; emite audit `clausula.update`
    - DELETE /clausulas/:id → soft-delete (activo:false); 404 si no existe; emite audit `clausula.delete`
    - Sin JWT válido → 401 (JwtAuthGuard)
    - `usuarioId` viene siempre de `@CurrentUser('id')`, NUNCA del body
  </behavior>
  <action>
    1. **Schema** `apps/backend/src/modules/clausulas/schemas/clausula.schema.ts`:
       ```typescript
       import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
       import { HydratedDocument, Types } from 'mongoose';
       import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

       export type ClausulaDocument = HydratedDocument<Clausula>;

       @Schema({
         collection: 'clausulas',
         timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
       })
       export class Clausula {
         @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
         usuarioId!: Types.ObjectId;
         @Prop({ required: true, type: String }) nombre!: string;
         @Prop({ required: true, type: String }) texto!: string;
         @Prop({ type: [String], default: [] }) labels!: string[];
       }

       export const ClausulaSchema = SchemaFactory.createForClass(Clausula);
       ClausulaSchema.plugin(softDeletePlugin);
       ClausulaSchema.index({ usuarioId: 1, activo: 1, labels: 1 });
       ClausulaSchema.index(
         { nombre: 'text', texto: 'text' },
         { weights: { nombre: 5, texto: 1 }, name: 'clausula_text_idx' },
       );
       ```
    2. **DTOs** `dto/{create,update,query}-clausula.dto.ts` (createZodDto):
       ```typescript
       // create-clausula.dto.ts
       import { createZodDto } from 'nestjs-zod';
       import { CreateClausulaSchema } from '@lexscribe/shared-validation';
       export class CreateClausulaDto extends createZodDto(CreateClausulaSchema) {}
       ```
       Idem para Update y Query.
    3. **Repository** `clausulas.repository.ts` con métodos `findAll`, `findById`, `create`, `update`, `softDelete`. Implementación de `findAll`:
       ```typescript
       async findAll(usuarioId: string, opts: QueryClausulaInput) {
         const filter: Record<string, unknown> = { usuarioId: this.toObjectId(usuarioId) };
         if (opts.label) filter.labels = opts.label;
         if (opts.search) filter.$text = { $search: opts.search };
         const projection = opts.search ? { score: { $meta: 'textScore' } } : undefined;
         const sort = opts.search ? { score: { $meta: 'textScore' } } : { fechaCreacion: -1 };
         const [items, total] = await Promise.all([
           this.model.find(filter, projection).sort(sort)
             .skip((opts.page - 1) * opts.limit).limit(opts.limit).exec(),
           this.model.countDocuments(filter).exec(),
         ]);
         return { items, total };
       }
       ```
       Usar `returnDocument: 'after'` en `findOneAndUpdate` (STATE.md decision). Helper `toObjectId(id)` idéntico al de contactos.
    4. **Service** `clausulas.service.ts` con `list/getById/create/update/remove`. `getById` lanza `NotFoundError('clausula', id)` si no existe. Sin integración con `EsquemasService` (cláusulas no tienen parámetros dinámicos).
    5. **Controller** `clausulas.controller.ts` idéntico en estructura a `contactos.controller.ts`, con `@UseGuards(JwtAuthGuard)`, `@UseInterceptors(AuditInterceptor)`, decoradores `@Audited('clausula','create'|'update'|'delete')` en POST/PATCH/DELETE. `@CurrentUser('id')` en todos los handlers, `@Param('id', MongoIdPipe)` donde aplique.
    6. **Module** `clausulas.module.ts`:
       ```typescript
       @Module({
         imports: [
           MongooseModule.forFeature([{ name: Clausula.name, schema: ClausulaSchema }]),
           AuditoriaModule,
           AuthModule,
         ],
         controllers: [ClausulasController],
         providers: [ClausulasService, ClausulasRepository],
         exports: [ClausulasService, ClausulasRepository],
       })
       export class ClausulasModule {}
       ```
    7. **Registrar en AppModule**: añadir `ClausulasModule` a `imports` de `apps/backend/src/app.module.ts`.
    8. Verificar lint + build: `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend lint &amp;&amp; pnpm --filter @lexscribe/backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "ClausulaSchema.index" apps/backend/src/modules/clausulas/schemas/clausula.schema.ts` muestra 2 líneas (compound + text)
    - `grep -n "softDeletePlugin" apps/backend/src/modules/clausulas/schemas/clausula.schema.ts` muestra el `.plugin(softDeletePlugin)`
    - `grep -n "@UseGuards(JwtAuthGuard)" apps/backend/src/modules/clausulas/clausulas.controller.ts` retorna match
    - `grep -n "@Audited('clausula'," apps/backend/src/modules/clausulas/clausulas.controller.ts` retorna ≥3 líneas (create/update/delete)
    - `grep -n "@CurrentUser('id')" apps/backend/src/modules/clausulas/clausulas.controller.ts` retorna ≥5 líneas (list, getById, create, update, remove)
    - `grep -rn "usuarioId" apps/backend/src/modules/clausulas/dto/` retorna 0 matches (nunca en body)
    - `grep -n "ClausulasModule" apps/backend/src/app.module.ts` retorna match en imports
    - `grep -n "\\$text" apps/backend/src/modules/clausulas/clausulas.repository.ts` retorna match
    - `grep -n "returnDocument: 'after'" apps/backend/src/modules/clausulas/clausulas.repository.ts` retorna ≥2 líneas (update + softDelete)
    - Build backend pasa sin errores TS
  </acceptance_criteria>
  <done>
    Módulo `clausulas` compila, lint verde, registrado en AppModule. Endpoints /api/v1/clausulas operativos (verificable manualmente con `pnpm dev` + curl con JWT, pero no requerido para este task — el e2e siguiente lo cubre).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Tests e2e Clausulas — cubrir CLAU-01..03 + soft-delete + auditoría</name>
  <read_first>
    - apps/backend/test/contactos/contactos.e2e-spec.ts (patrón e2e completo)
    - apps/backend/test/setup-e2e.ts (MongoMemoryServer setup)
    - apps/backend/test/jest-e2e.config.ts (config de e2e)
    - apps/backend/test/auditoria/audit.interceptor.e2e-spec.ts (cómo verificar audit entries)
  </read_first>
  <behavior>
    - 200 OK al crear/listar/actualizar/borrar con JWT válido
    - 401 sin JWT
    - 400 si body envía `usuarioId` o campos desconocidos (strict)
    - 404 al PATCH/DELETE id inexistente
    - Búsqueda `?search=...` devuelve solo docs cuyo `nombre` o `texto` matchea (verificar con doc que NO matchea queda fuera)
    - Filtro `?label=garantia` devuelve solo docs cuyos `labels` incluyen "garantia"
    - DELETE marca `activo:false` (verificable con query directa a `db.collection('clausulas').findOne({_id, activo:false})`)
    - Tras DELETE, GET /clausulas no incluye el doc en la lista (soft-delete plugin filtra)
    - Tras crear/actualizar/borrar, existe entrada en `auditoria` con `accion: 'create'|'update'|'delete'` y `recurso: 'clausula'`
  </behavior>
  <action>
    Crear `apps/backend/test/clausulas/clausulas.e2e-spec.ts` con suite Jest + Supertest siguiendo estructura de `contactos.e2e-spec.ts`:

    1. `beforeAll`: arranca `Test.createTestingModule({ imports:[AppModule] }).compile()`; aplica `useGlobalFilters(new DomainExceptionFilter())`, `useGlobalPipes(new ZodValidationPipe())`; crea usuario seed + JWT.
    2. `afterAll`: `await app.close()` y `mongod.stop()`.
    3. `beforeEach`: limpiar colecciones `clausulas` y `auditoria`.
    4. Tests organizados en describe blocks:
       - `describe('POST /clausulas')`: crea OK, falla 401 sin auth, falla 400 con extra fields o `usuarioId` en body, auditoría escrita
       - `describe('GET /clausulas')`: lista vacía, lista paginada, `?search=hipoteca` devuelve solo match, `?label=garantia` filtra, `?label=GARANTIA` también matchea (lowercase normalization)
       - `describe('PATCH /clausulas/:id')`: actualiza OK, 404 id inexistente, 400 campo desconocido
       - `describe('DELETE /clausulas/:id')`: soft-delete OK (verificar `activo:false` con `mongoose.connection.db.collection('clausulas').findOne(...)`), 404 inexistente, lista posterior NO incluye doc
       - `describe('Audit trail')`: tras POST, verificar entrada en `auditoria` con `{recurso:'clausula', accion:'create', recursoId: id, usuarioId}`
    5. Ejecutar: `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern=clausulas`.

    Mínimo 15 tests. Patrón exacto: imports y helpers `createTestUser`, `getAuthToken` de `contactos.e2e-spec.ts`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern=clausulas</automated>
  </verify>
  <acceptance_criteria>
    - El fichero `apps/backend/test/clausulas/clausulas.e2e-spec.ts` existe y tiene ≥200 líneas
    - `grep -c "it(" apps/backend/test/clausulas/clausulas.e2e-spec.ts` retorna ≥15
    - `grep -n "DomainExceptionFilter" apps/backend/test/clausulas/clausulas.e2e-spec.ts` retorna match (filter aplicado per Phase 2 decision)
    - `grep -n "recurso: 'clausula'" apps/backend/test/clausulas/clausulas.e2e-spec.ts` retorna match (audit assertion)
    - `grep -n "\\$search" apps/backend/test/clausulas/clausulas.e2e-spec.ts` retorna match O test de búsqueda full-text verifica resultados via API
    - Comando `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern=clausulas` finaliza con `0 failed`
  </acceptance_criteria>
  <done>
    Suite e2e completa verde, cubriendo CLAU-01 (CRUD), CLAU-02 (labels múltiples), CLAU-03 (search + label filter), soft-delete, auth, audit trail.
  </done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend lint` → 0 errors
- `pnpm --filter @lexscribe/backend build` → 0 errors
- `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern=clausulas` → all green, ≥15 tests
- `pnpm --filter @lexscribe/shared-validation build` y `pnpm --filter @lexscribe/shared-types build` → verdes
- Toda la suite e2e existente sigue verde (no regresiones): `pnpm --filter @lexscribe/backend test:e2e`
</verification>

<success_criteria>
- Módulo `clausulas` con endpoints REST autenticados, auditados, soft-delete y full-text search operativos
- CLAU-01 (CRUD), CLAU-02 (labels múltiples libres), CLAU-03 (búsqueda + filtro labels) cubiertos por tests e2e
- Sin regresión en contactos/auth/auditoria
</success_criteria>

<output>
Tras completar, crear `.planning/phases/04-clausulas-y-expedientes/04-01-SUMMARY.md` documentando: archivos creados, decisiones tomadas (p.ej. lowercase labels), número de tests, cobertura preliminar.
</output>
