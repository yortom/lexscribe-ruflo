---
phase: 03-contactos
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-validation/src/contactos.ts
  - packages/shared-validation/src/index.ts
  - packages/shared-types/src/contacto.ts
  - packages/shared-types/src/index.ts
  - apps/backend/src/modules/contactos/contactos.module.ts
  - apps/backend/src/modules/contactos/contactos.controller.ts
  - apps/backend/src/modules/contactos/contactos.service.ts
  - apps/backend/src/modules/contactos/contactos.repository.ts
  - apps/backend/src/modules/contactos/schemas/contacto.schema.ts
  - apps/backend/src/modules/contactos/dto/create-contacto.dto.ts
  - apps/backend/src/modules/contactos/dto/update-contacto.dto.ts
  - apps/backend/src/modules/contactos/dto/query-contacto.dto.ts
  - apps/backend/src/app.module.ts
  - apps/backend/test/contactos/contactos.e2e-spec.ts
autonomous: true
requirements:
  - CONT-01
  - CONT-02
  - CONT-03
  - CONT-04
  - CONT-05

must_haves:
  truths:
    - "POST /api/v1/contactos crea un contacto persona física o jurídica con nombre, documentacionFiscal, documentoIdentidad, direccion, email, telefono y tipologia; usuarioId se inyecta desde JWT (CONT-01, CONT-02)"
    - "POST /api/v1/contactos con `parametros: { profesion: 'Abogado' }` registra `profesion` en la entrada `esquemas` con `tipoObjeto:'contacto'` del usuario (CONT-03)"
    - "GET /api/v1/contactos?search=...&tipologia=...&page=1&limit=20 devuelve `{ items, total, page, limit }` paginado y filtrado (CONT-04)"
    - "GET /api/v1/contactos/:id devuelve el contacto + `expedientesVinculados: []` (stub vacío hasta Phase 4) (CONT-05)"
    - "DELETE /api/v1/contactos/:id hace soft-delete (activo:false, fechaInactivacion:Date) y el contacto desaparece del listado por defecto"
    - "Sin Bearer token → 401 en todos los endpoints; con tipologia inválida → 400; con `usuarioId` en body → 400 (Zod .strict)"
    - "Crear/editar/borrar contacto produce un registro en `auditoria` con `recurso='contacto'` (cierre del bucle interceptor)"
  artifacts:
    - path: "apps/backend/src/modules/contactos/schemas/contacto.schema.ts"
      provides: "Mongoose schema Contacto con softDeletePlugin + text index + partial unique"
      contains: "softDeletePlugin"
    - path: "apps/backend/src/modules/contactos/contactos.controller.ts"
      provides: "GET/POST/PATCH/DELETE /contactos + GET /contactos/:id"
      exports: ["ContactosController"]
    - path: "apps/backend/src/modules/contactos/contactos.service.ts"
      provides: "Lógica de negocio + integración EsquemasService.addParametro"
      exports: ["ContactosService"]
    - path: "packages/shared-validation/src/contactos.ts"
      provides: "Zod schemas reusables FE/BE"
      exports: ["TipoPersonaSchema", "TipologiaContactoSchema", "CreateContactoSchema", "UpdateContactoSchema", "QueryContactoSchema"]
    - path: "apps/backend/test/contactos/contactos.e2e-spec.ts"
      provides: "E2E coverage de CONT-01..05 + soft-delete + auth + audit"
      min_lines: 200
  key_links:
    - from: "apps/backend/src/modules/contactos/contactos.service.ts"
      to: "EsquemasService.addParametro"
      via: "import EsquemasModule en ContactosModule, inject EsquemasService"
      pattern: "esquemasService\\.addParametro"
    - from: "apps/backend/src/modules/contactos/schemas/contacto.schema.ts"
      to: "softDeletePlugin"
      via: "ContactoSchema.plugin(softDeletePlugin) tras SchemaFactory.createForClass"
      pattern: "ContactoSchema\\.plugin\\(softDeletePlugin\\)"
    - from: "apps/backend/src/modules/contactos/contactos.controller.ts"
      to: "AuditInterceptor + @Audited"
      via: "@UseInterceptors(AuditInterceptor) + @Audited('contacto', accion)"
      pattern: "@Audited\\('contacto'"
---

<objective>
Construir el módulo backend `contactos` end-to-end, primera colección de negocio que aplica `softDeletePlugin` productivamente. Incluye schema Mongoose con índices (text + partial unique + compuesto), repositorio, servicio con integración a `EsquemasService` para parámetros dinámicos (CONT-03), controlador autenticado con auditoría, DTOs Zod compartidos FE/BE, y suite e2e completa cubriendo CONT-01..05 + soft-delete + audit.

Purpose: Habilitar la base de contactos del despacho, requisito previo para Phase 4 (expedientes asocian contactos). Materializar el patrón establecido en Phase 2 (esquemas) sobre una colección con soft-delete real.
Output: Módulo NestJS operativo, endpoints `/api/v1/contactos*` verificados por e2e, esquema dinámico extensible vía POST con `parametros`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@docs/FUNCIONAL.md
@docs/DATOS.md
@docs/ARQUITECTURA.md
@.planning/phases/03-contactos/03-RESEARCH.md
@.planning/phases/03-contactos/03-VALIDATION.md
@.planning/phases/02-auth-y-bases-transversales/02-02-bases-transversales-PLAN.md
@.planning/phases/02-auth-y-bases-transversales/02-04-seed-esquemas-backup-PLAN.md
@apps/backend/src/common/plugins/soft-delete.plugin.ts
@apps/backend/src/common/errors/index.ts
@apps/backend/src/modules/esquemas/esquemas.module.ts
@apps/backend/src/modules/esquemas/esquemas.service.ts
@apps/backend/src/modules/auditoria/decorators/audited.decorator.ts
@apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts
@apps/backend/src/app.module.ts
@apps/backend/test/esquemas/esquemas.e2e-spec.ts
@apps/backend/test/setup-e2e.ts
@packages/shared-validation/src/esquemas.ts
@packages/shared-validation/src/index.ts

<interfaces>
<!-- Contratos a respetar (extraídos del codebase Phase 2). El executor NO debe explorar; usar estos directamente. -->

DomainError tipados (ya en `apps/backend/src/common/errors/index.ts`):
```typescript
NotFoundError(resource: string, id: string)            // 404 — code:'NOT_FOUND'
ConflictError(message: string)                         // 409 — code:'CONFLICT'
ValidationError(message: string, details?: unknown)    // 400 — code:'VALIDATION'
UnauthorizedError(message?: string)                    // 401 — code:'UNAUTHORIZED'
NotImplementedError(message: string)                   // 501 — code:'NOT_IMPLEMENTED'
```

softDeletePlugin contract (`apps/backend/src/common/plugins/soft-delete.plugin.ts`):
- Aplica `activo: Boolean = true` + `fechaInactivacion: Date | null` al schema.
- Hooks pre: `find`, `findOne`, `findOneAndUpdate`, `count`, `countDocuments`, `updateOne`, `updateMany` filtran `activo:true` salvo `setOptions({withInactive:true})`.
- `schema.statics.softDelete(filter)` → updateMany con `$set:{activo:false, fechaInactivacion:new Date()}`.
- NUNCA `mongoose.plugin(softDeletePlugin)` (global). Aplicar por schema.

EsquemasService (`apps/backend/src/modules/esquemas/esquemas.service.ts`):
```typescript
addParametro(usuarioId: string, tipoObjeto: 'expediente'|'contacto', dto: { nombre: string, tipoDato: 'texto'|'numero'|'fecha'|'booleano', obligatorio: boolean }): Promise<Esquema>
// Idempotente con $addToSet. Lanza ConflictError si nombre existe con tipoDato distinto.
// EsquemasModule ya exporta EsquemasService — solo importar el módulo.
```

NombreParametroSchema (de `packages/shared-validation/src/esquemas.ts`):
```typescript
export const NombreParametroSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);
```

@Audited decorator + AuditInterceptor (de `apps/backend/src/modules/auditoria/`):
```typescript
@UseInterceptors(AuditInterceptor)            // a nivel controller
@Audited(recurso: string, accion: 'create'|'update'|'delete'|'link'|'unlink'|'generate')  // a nivel método
// Payload registrado: {usuarioId, recurso, recursoId, contexto, ip?, userAgent?}
```

JwtAuthGuard + @CurrentUser:
```typescript
@UseGuards(JwtAuthGuard)
controller(@CurrentUser('id') usuarioId: string) { ... }
// usuarioId NUNCA desde body (AUTH-04).
```

Pagination envelope (ARQUITECTURA.md §6.1, ya usado en esquemas):
```json
{ "items": [...], "total": 123, "page": 1, "limit": 20 }
```

Contacto field shape (DATOS.md §4.2):
```typescript
{
  usuarioId: ObjectId, tipo: 'fisica'|'juridica',
  tipologia: 'cliente'|'parte_contraria'|'interesado'|'otros',
  nombre: string, documentacionFiscal: string, documentoIdentidad: string,
  documentacionFiscalHash: string,  // placeholder para Phase 8 — null por ahora
  direccion: string, email: string, telefono: string,
  parametros: Record<string, unknown>,
  // soft-delete plugin añade: activo, fechaInactivacion
  // timestamps añade: fechaCreacion, fechaActualizacion
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 0 (Wave 0): Crear scaffold de tests e2e + Zod shared schemas</name>
  <files>
    packages/shared-validation/src/contactos.ts,
    packages/shared-validation/src/index.ts,
    packages/shared-types/src/contacto.ts,
    packages/shared-types/src/index.ts,
    apps/backend/test/contactos/contactos.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Code Examples — Contacto Zod Schema, §E2E Test Setup Pattern),
    .planning/phases/03-contactos/03-VALIDATION.md (Wave 0 Requirements),
    packages/shared-validation/src/esquemas.ts (patrón existente — copiar estructura),
    packages/shared-validation/src/index.ts (re-export pattern),
    apps/backend/test/esquemas/esquemas.e2e-spec.ts (canonical e2e setup)
  </read_first>
  <action>
    1) Crear `packages/shared-validation/src/contactos.ts` con EXACTAMENTE este contenido:
       ```typescript
       import { z } from 'zod';
       import { NombreParametroSchema } from './esquemas';

       export const TipoPersonaSchema = z.enum(['fisica', 'juridica']);
       export const TipologiaContactoSchema = z.enum([
         'cliente', 'parte_contraria', 'interesado', 'otros'
       ]);

       export const CreateContactoSchema = z.object({
         tipo: TipoPersonaSchema,
         tipologia: TipologiaContactoSchema,
         nombre: z.string().min(1),
         documentacionFiscal: z.string().optional(),
         documentoIdentidad: z.string().optional(),
         direccion: z.string().optional(),
         email: z.string().email().optional(),
         telefono: z.string().optional(),
         parametros: z.record(NombreParametroSchema, z.unknown()).optional().default({}),
       }).strict();

       export const UpdateContactoSchema = CreateContactoSchema.partial().strict();

       export const QueryContactoSchema = z.object({
         search: z.string().optional(),
         tipologia: TipologiaContactoSchema.optional(),
         page: z.coerce.number().int().positive().default(1),
         limit: z.coerce.number().int().positive().max(100).default(20),
       }).strict();

       export type CreateContactoInput = z.infer<typeof CreateContactoSchema>;
       export type UpdateContactoInput = z.infer<typeof UpdateContactoSchema>;
       export type QueryContactoInput = z.infer<typeof QueryContactoSchema>;
       ```
    2) Append `export * from './contactos';` al final de `packages/shared-validation/src/index.ts`.
    3) Crear `packages/shared-types/src/contacto.ts`:
       ```typescript
       export interface Contacto {
         _id: string;
         usuarioId: string;
         tipo: 'fisica' | 'juridica';
         tipologia: 'cliente' | 'parte_contraria' | 'interesado' | 'otros';
         nombre: string;
         documentacionFiscal?: string;
         documentoIdentidad?: string;
         direccion?: string;
         email?: string;
         telefono?: string;
         parametros: Record<string, unknown>;
         activo: boolean;
         fechaInactivacion: string | null;
         fechaCreacion: string;
         fechaActualizacion: string;
       }
       export interface ContactoListResponse {
         items: Contacto[];
         total: number;
         page: number;
         limit: number;
       }
       export interface ContactoDetailResponse extends Contacto {
         expedientesVinculados: Array<{ _id: string; nombre: string; rol: string }>;
       }
       ```
    4) Append `export * from './contacto';` a `packages/shared-types/src/index.ts` (crear el archivo si no existe siguiendo el patrón de `packages/shared-validation/src/index.ts`).
    5) Crear scaffold `apps/backend/test/contactos/contactos.e2e-spec.ts` con `describe.skip('CONT-01..05 contactos', () => { it.todo('placeholder for Wave 1') })` — los tests reales se llenan en Task 3. El archivo debe existir desde Wave 0 para que VALIDATION.md pueda referenciarlo.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/shared-validation build &amp;&amp; pnpm --filter backend test:e2e -- contactos --passWithNoTests</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/shared-validation/src/contactos.ts` exits 0.
    - `grep -q "TipologiaContactoSchema" packages/shared-validation/src/contactos.ts` exits 0.
    - `grep -q "z.enum" packages/shared-validation/src/contactos.ts` exits 0 (4+ veces para enums).
    - `grep -q "NombreParametroSchema" packages/shared-validation/src/contactos.ts` exits 0 (reutilizar esquemas existente).
    - `grep -q "\\.strict()" packages/shared-validation/src/contactos.ts` exits 0 (rechazo de props extra).
    - `grep -q "export \\* from './contactos'" packages/shared-validation/src/index.ts` exits 0.
    - `test -f packages/shared-types/src/contacto.ts` exits 0.
    - `grep -q "interface Contacto" packages/shared-types/src/contacto.ts` exits 0.
    - `grep -q "expedientesVinculados" packages/shared-types/src/contacto.ts` exits 0.
    - `test -f apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0.
    - `pnpm --filter @lexscribe/shared-validation build` exits 0 (TypeScript compila).
  </acceptance_criteria>
  <done>
    Schemas Zod compartidos disponibles, types compartidos, scaffold del e2e existe. Wave 1 puede importar tipos sin esperar.
  </done>
</task>

<task type="auto">
  <name>Task 1: Mongoose schema + repository (soft-delete + text search + paginación)</name>
  <files>
    apps/backend/src/modules/contactos/schemas/contacto.schema.ts,
    apps/backend/src/modules/contactos/contactos.repository.ts,
    apps/backend/src/modules/contactos/dto/create-contacto.dto.ts,
    apps/backend/src/modules/contactos/dto/update-contacto.dto.ts,
    apps/backend/src/modules/contactos/dto/query-contacto.dto.ts
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Pattern 1, §Pattern 2, §Pattern 6, §Pitfall 1, §Pitfall 2, §Pitfall 3),
    docs/DATOS.md §4.2 (contactos schema + índices),
    apps/backend/src/common/plugins/soft-delete.plugin.ts (plugin a aplicar),
    apps/backend/src/modules/esquemas/esquemas.repository.ts (patrón toObjectId helper, queries),
    apps/backend/src/modules/esquemas/schemas/esquema.schema.ts (patrón schema NestJS+Mongoose)
  </read_first>
  <action>
    1) Crear `apps/backend/src/modules/contactos/schemas/contacto.schema.ts`:
       ```typescript
       import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
       import { HydratedDocument, Types } from 'mongoose';
       import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

       export type ContactoDocument = HydratedDocument<Contacto>;

       @Schema({
         collection: 'contactos',
         timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
       })
       export class Contacto {
         @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
         usuarioId: Types.ObjectId;

         @Prop({ required: true, enum: ['fisica', 'juridica'] })
         tipo: 'fisica' | 'juridica';

         @Prop({
           required: true,
           enum: ['cliente', 'parte_contraria', 'interesado', 'otros'],
         })
         tipologia: 'cliente' | 'parte_contraria' | 'interesado' | 'otros';

         @Prop({ required: true, type: String })
         nombre: string;

         @Prop({ type: String, default: null }) documentacionFiscal: string | null;
         @Prop({ type: String, default: null }) documentoIdentidad: string | null;
         @Prop({ type: String, default: null }) documentacionFiscalHash: string | null; // Phase 8 placeholder
         @Prop({ type: String, default: null }) direccion: string | null;
         @Prop({ type: String, default: null }) email: string | null;
         @Prop({ type: String, default: null }) telefono: string | null;

         @Prop({ type: Object, default: {} })
         parametros: Record<string, unknown>;
       }

       export const ContactoSchema = SchemaFactory.createForClass(Contacto);

       // Aplicar plugin ANTES de definir índices (§Pitfall 1)
       ContactoSchema.plugin(softDeletePlugin);

       // Index 1: text search en nombre + documentacionFiscal (CONT-04, F-055)
       ContactoSchema.index({ nombre: 'text', documentacionFiscal: 'text' });

       // Index 2: partial unique en documentacionFiscal (DATOS.md §4.2 + §Pitfall 2)
       ContactoSchema.index(
         { usuarioId: 1, documentacionFiscal: 1 },
         {
           unique: true,
           partialFilterExpression: {
             documentacionFiscal: { $exists: true, $type: 'string', $ne: '' },
           },
         },
       );

       // Index 3: listado con filtro por tipologia
       ContactoSchema.index({ usuarioId: 1, activo: 1, tipologia: 1, fechaCreacion: -1 });
       ```
    2) Crear DTOs reutilizando los Zod schemas (patrón `createZodDto` ya usado en `esquemas/dto/add-parametro.dto.ts`):
       ```typescript
       // create-contacto.dto.ts
       import { createZodDto } from 'nestjs-zod';
       import { CreateContactoSchema } from '@lexscribe/shared-validation';
       export class CreateContactoDto extends createZodDto(CreateContactoSchema) {}
       // update-contacto.dto.ts → UpdateContactoSchema → UpdateContactoDto
       // query-contacto.dto.ts → QueryContactoSchema → QueryContactoDto
       ```
    3) Crear `apps/backend/src/modules/contactos/contactos.repository.ts`:
       ```typescript
       import { Injectable } from '@nestjs/common';
       import { InjectModel } from '@nestjs/mongoose';
       import { FilterQuery, Model, Types } from 'mongoose';
       import { Contacto, ContactoDocument } from './schemas/contacto.schema';
       import { CreateContactoInput, UpdateContactoInput, QueryContactoInput } from '@lexscribe/shared-validation';

       @Injectable()
       export class ContactosRepository {
         constructor(@InjectModel(Contacto.name) private readonly model: Model<ContactoDocument>) {}

         private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
           return typeof id === 'string' ? new Types.ObjectId(id) : id;
         }

         async findAll(usuarioId: string, opts: QueryContactoInput): Promise<{ items: ContactoDocument[]; total: number }> {
           const filter: FilterQuery<ContactoDocument> = { usuarioId: this.toObjectId(usuarioId) };
           if (opts.tipologia) filter.tipologia = opts.tipologia;
           if (opts.search) filter.$text = { $search: opts.search };
           const [items, total] = await Promise.all([
             this.model.find(filter).skip((opts.page - 1) * opts.limit).limit(opts.limit).sort({ fechaCreacion: -1 }).exec(),
             this.model.countDocuments(filter).exec(),
           ]);
           return { items, total };
         }

         async findById(usuarioId: string, id: string): Promise<ContactoDocument | null> {
           return this.model.findOne({ _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) }).exec();
         }

         async create(usuarioId: string, data: CreateContactoInput): Promise<ContactoDocument> {
           return this.model.create({ ...data, usuarioId: this.toObjectId(usuarioId) });
         }

         async update(usuarioId: string, id: string, data: UpdateContactoInput): Promise<ContactoDocument | null> {
           return this.model.findOneAndUpdate(
             { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
             { $set: data },
             { new: true },
           ).exec();
         }

         async softDelete(usuarioId: string, id: string): Promise<ContactoDocument | null> {
           return this.model.findOneAndUpdate(
             { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
             { $set: { activo: false, fechaInactivacion: new Date() } },
             { new: true },
           ).exec();
         }
       }
       ```
       Notas:
       - NO añadir `{ activo: true }` manualmente — el plugin lo hace automáticamente.
       - `softDelete` usa `findOneAndUpdate` para scope al usuario (no `schema.statics.softDelete`).
       - `toObjectId` helper inline (mismo patrón que `EsquemasRepository` per Phase 2 STATE.md).
  </action>
  <verify>
    <automated>pnpm --filter backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "ContactoSchema.plugin(softDeletePlugin)" apps/backend/src/modules/contactos/schemas/contacto.schema.ts` exits 0.
    - `grep -q "ContactoSchema.index({ nombre: 'text'" apps/backend/src/modules/contactos/schemas/contacto.schema.ts` exits 0.
    - `grep -q "partialFilterExpression" apps/backend/src/modules/contactos/schemas/contacto.schema.ts` exits 0.
    - `grep -q "documentacionFiscalHash" apps/backend/src/modules/contactos/schemas/contacto.schema.ts` exits 0 (Phase 8 placeholder).
    - `grep -q "createZodDto(CreateContactoSchema)" apps/backend/src/modules/contactos/dto/create-contacto.dto.ts` exits 0.
    - `grep -q "createZodDto(UpdateContactoSchema)" apps/backend/src/modules/contactos/dto/update-contacto.dto.ts` exits 0.
    - `grep -q "createZodDto(QueryContactoSchema)" apps/backend/src/modules/contactos/dto/query-contacto.dto.ts` exits 0.
    - `grep -q "this.toObjectId" apps/backend/src/modules/contactos/contactos.repository.ts` exits 0.
    - `grep -q "\\$text" apps/backend/src/modules/contactos/contactos.repository.ts` exits 0.
    - `! grep -q "activo: true" apps/backend/src/modules/contactos/contactos.repository.ts` (NO filtro manual — plugin lo hace).
    - `pnpm --filter backend build` exits 0 (TypeScript compila).
  </acceptance_criteria>
  <done>
    Schema con índices correctos, soft-delete aplicado, repositorio scoped por usuarioId, DTOs Zod listos. Sin lógica de negocio aún (eso va en Task 2).
  </done>
</task>

<task type="auto">
  <name>Task 2: Service + Controller + Module (con auditoría y EsquemasService)</name>
  <files>
    apps/backend/src/modules/contactos/contactos.service.ts,
    apps/backend/src/modules/contactos/contactos.controller.ts,
    apps/backend/src/modules/contactos/contactos.module.ts,
    apps/backend/src/app.module.ts
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Pattern 3, §Pattern 4, §Pitfall 4, §Pitfall 6),
    apps/backend/src/modules/esquemas/esquemas.module.ts (exports EsquemasService — verificar),
    apps/backend/src/modules/esquemas/esquemas.controller.ts (patrón controller con JwtAuthGuard + AuditInterceptor + @Audited),
    apps/backend/src/modules/esquemas/esquemas.service.ts (patrón service + DomainError),
    apps/backend/src/common/errors/index.ts (NotFoundError, ValidationError disponibles),
    apps/backend/src/modules/auditoria/decorators/audited.decorator.ts (firma decorador),
    apps/backend/src/modules/auditoria/auditoria.module.ts (qué exporta — AuditInterceptor)
  </read_first>
  <action>
    1) Crear `apps/backend/src/modules/contactos/contactos.service.ts`:
       ```typescript
       import { Injectable } from '@nestjs/common';
       import { ContactosRepository } from './contactos.repository';
       import { EsquemasService } from '../esquemas/esquemas.service';
       import { NotFoundError } from '../../common/errors';
       import { CreateContactoInput, UpdateContactoInput, QueryContactoInput } from '@lexscribe/shared-validation';

       @Injectable()
       export class ContactosService {
         constructor(
           private readonly repo: ContactosRepository,
           private readonly esquemasService: EsquemasService,
         ) {}

         async list(usuarioId: string, query: QueryContactoInput) {
           const { items, total } = await this.repo.findAll(usuarioId, query);
           return { items, total, page: query.page, limit: query.limit };
         }

         async getById(usuarioId: string, id: string) {
           const contacto = await this.repo.findById(usuarioId, id);
           if (!contacto) throw new NotFoundError('contacto', id);
           // CONT-05: stub vacío hasta Phase 4 — expedientes module no existe aún
           return { ...contacto.toObject(), expedientesVinculados: [] as Array<{ _id: string; nombre: string; rol: string }> };
         }

         async create(usuarioId: string, dto: CreateContactoInput) {
           const contacto = await this.repo.create(usuarioId, dto);
           // CONT-03: registrar parámetros nuevos en el esquema dinámico (FL-13 Punto A)
           await this.registerParametros(usuarioId, dto.parametros ?? {});
           return contacto;
         }

         async update(usuarioId: string, id: string, dto: UpdateContactoInput) {
           const updated = await this.repo.update(usuarioId, id, dto);
           if (!updated) throw new NotFoundError('contacto', id);
           if (dto.parametros) await this.registerParametros(usuarioId, dto.parametros);
           return updated;
         }

         async remove(usuarioId: string, id: string) {
           const deleted = await this.repo.softDelete(usuarioId, id);
           if (!deleted) throw new NotFoundError('contacto', id);
           return deleted;
         }

         private async registerParametros(usuarioId: string, parametros: Record<string, unknown>) {
           for (const nombre of Object.keys(parametros)) {
             await this.esquemasService.addParametro(usuarioId, 'contacto', {
               nombre,
               tipoDato: 'texto',
               obligatorio: false,
             });
           }
         }
       }
       ```
       Nota: `addParametro` es idempotente con `$addToSet`. Si el parámetro ya existe con el mismo `tipoDato`, no falla. Si existe con tipo distinto, lanza `ConflictError` (que el filter global mapea a 409). Esto es comportamiento intencional.

    2) Crear `apps/backend/src/modules/contactos/contactos.controller.ts`:
       ```typescript
       import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
       import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
       import { CurrentUser } from '../../common/decorators/current-user.decorator';
       import { AuditInterceptor } from '../auditoria/interceptors/audit.interceptor';
       import { Audited } from '../auditoria/decorators/audited.decorator';
       import { ContactosService } from './contactos.service';
       import { CreateContactoDto } from './dto/create-contacto.dto';
       import { UpdateContactoDto } from './dto/update-contacto.dto';
       import { QueryContactoDto } from './dto/query-contacto.dto';

       @UseGuards(JwtAuthGuard)
       @UseInterceptors(AuditInterceptor)
       @Controller('contactos')
       export class ContactosController {
         constructor(private readonly service: ContactosService) {}

         @Get()
         list(@CurrentUser('id') uid: string, @Query() q: QueryContactoDto) {
           return this.service.list(uid, q);
         }

         @Get(':id')
         getById(@CurrentUser('id') uid: string, @Param('id') id: string) {
           return this.service.getById(uid, id);
         }

         @Post()
         @Audited('contacto', 'create')
         create(@CurrentUser('id') uid: string, @Body() dto: CreateContactoDto) {
           return this.service.create(uid, dto);
         }

         @Patch(':id')
         @Audited('contacto', 'update')
         update(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: UpdateContactoDto) {
           return this.service.update(uid, id, dto);
         }

         @Delete(':id')
         @Audited('contacto', 'delete')
         remove(@CurrentUser('id') uid: string, @Param('id') id: string) {
           return this.service.remove(uid, id);
         }
       }
       ```
       Verificar paths exactos de `JwtAuthGuard`, `CurrentUser`, `AuditInterceptor`, `Audited` leyendo los archivos antes (read_first los lista). Si los paths reales difieren (p.ej. `apps/backend/src/modules/auth/guards/...` vs `apps/backend/src/common/guards/...`), usar los paths reales.

    3) Crear `apps/backend/src/modules/contactos/contactos.module.ts`:
       ```typescript
       import { Module } from '@nestjs/common';
       import { MongooseModule } from '@nestjs/mongoose';
       import { Contacto, ContactoSchema } from './schemas/contacto.schema';
       import { ContactosController } from './contactos.controller';
       import { ContactosService } from './contactos.service';
       import { ContactosRepository } from './contactos.repository';
       import { EsquemasModule } from '../esquemas/esquemas.module';
       import { AuditoriaModule } from '../auditoria/auditoria.module';
       import { AuthModule } from '../auth/auth.module';

       @Module({
         imports: [
           MongooseModule.forFeature([{ name: Contacto.name, schema: ContactoSchema }]),
           EsquemasModule,    // Para inyectar EsquemasService (CONT-03)
           AuditoriaModule,   // Para AuditInterceptor
           AuthModule,        // Para JwtAuthGuard
         ],
         controllers: [ContactosController],
         providers: [ContactosService, ContactosRepository],
         exports: [ContactosService, ContactosRepository],
       })
       export class ContactosModule {}
       ```
       Si `AuthModule` ya es global no es necesario importarlo aquí — verificar leyendo `auth.module.ts` (si tiene `@Global()`, omitir el import). Lo mismo con `AuditoriaModule`.

    4) Editar `apps/backend/src/app.module.ts`: añadir `ContactosModule` al array de `imports`. Mantener orden alfabético si el resto lo está.
  </action>
  <verify>
    <automated>pnpm --filter backend build &amp;&amp; pnpm --filter backend test</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "EsquemasService" apps/backend/src/modules/contactos/contactos.service.ts` exits 0.
    - `grep -q "esquemasService.addParametro" apps/backend/src/modules/contactos/contactos.service.ts` exits 0.
    - `grep -q "NotFoundError" apps/backend/src/modules/contactos/contactos.service.ts` exits 0.
    - `grep -q "expedientesVinculados" apps/backend/src/modules/contactos/contactos.service.ts` exits 0 (CONT-05 stub).
    - `grep -q "@UseGuards(JwtAuthGuard)" apps/backend/src/modules/contactos/contactos.controller.ts` exits 0.
    - `grep -q "@UseInterceptors(AuditInterceptor)" apps/backend/src/modules/contactos/contactos.controller.ts` exits 0.
    - `grep -q "@Audited('contacto', 'create')" apps/backend/src/modules/contactos/contactos.controller.ts` exits 0.
    - `grep -q "@Audited('contacto', 'update')" apps/backend/src/modules/contactos/contactos.controller.ts` exits 0.
    - `grep -q "@Audited('contacto', 'delete')" apps/backend/src/modules/contactos/contactos.controller.ts` exits 0.
    - `! grep -q "usuarioId" apps/backend/src/modules/contactos/contactos.controller.ts | grep -v "@CurrentUser"` (usuarioId solo desde @CurrentUser, NUNCA body — AUTH-04).
    - `grep -q "EsquemasModule" apps/backend/src/modules/contactos/contactos.module.ts` exits 0.
    - `grep -q "ContactosModule" apps/backend/src/app.module.ts` exits 0.
    - `pnpm --filter backend build` exits 0.
    - `pnpm --filter backend test` exits 0 (unit tests existentes siguen verdes).
  </acceptance_criteria>
  <done>
    Service + Controller + Module operativos. App boot exitoso con módulo registrado. Falta verificar end-to-end (Task 3).
  </done>
</task>

<task type="auto">
  <name>Task 3: Tests E2E completos (CONT-01..05 + soft-delete + auth + audit)</name>
  <files>
    apps/backend/test/contactos/contactos.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§E2E Test Setup Pattern, §Soft-delete in Action),
    apps/backend/test/esquemas/esquemas.e2e-spec.ts (canonical e2e setup — copiar estructura literal),
    apps/backend/test/setup-e2e.ts (mongodb-memory-server global),
    apps/backend/src/modules/contactos/contactos.controller.ts (endpoints a testear)
  </read_first>
  <action>
    Reescribir `apps/backend/test/contactos/contactos.e2e-spec.ts` con la suite real (eliminar `describe.skip` del Wave 0).

    Estructura (siguiendo literalmente el patrón de `esquemas.e2e-spec.ts`):

    1) `beforeAll`:
       - `Test.createTestingModule({ imports: [AppModule] }).compile()`.
       - `app.use(cookieParser())`, `app.useGlobalPipes(new ZodValidationPipe())`, `app.useGlobalFilters(new DomainExceptionFilter())`, `app.setGlobalPrefix('api/v1')`, `await app.init()`.
       - Get models: `usuarioModel = app.get(getModelToken('Usuario'))`, `contactoModel = app.get(getModelToken('Contacto'))`, `esquemaModel = app.get(getModelToken('Esquema'))`, `auditoriaModel = app.get(getModelToken('Auditoria'))`.
       - Seed: crear 1 usuario con argon2id hash de 'TestPass123!', crear esquema vacío para `tipoObjeto: 'contacto'` (necesario porque `EsquemasService.addParametro` lanza NotFoundError si no existe).
       - Login: POST `/api/v1/auth/login` con email + password → extraer `accessToken` para `bearerToken`.

    2) `afterEach`: `await contactoModel.deleteMany({})` y `await auditoriaModel.deleteMany({})` para aislar tests.

    3) Tests obligatorios (cada uno con `it('CONT-XX: ...', async () => { ... })`):

       **Auth**
       - `'rejects unauthenticated requests with 401'`: GET `/api/v1/contactos` sin Bearer → status 401.
       - `'rejects body with extra fields (Zod strict)'`: POST con `{tipo:'fisica', tipologia:'cliente', nombre:'X', usuarioId:'haxxx'}` + Bearer → 400 + body.code === 'VALIDATION'.

       **CONT-01 + CONT-02 (create)**
       - `'CONT-01/02: creates persona física with base fields and tipologia'`: POST `{tipo:'fisica', tipologia:'cliente', nombre:'Ana López', documentacionFiscal:'12345678A', email:'ana@test.es', telefono:'+34600000000'}` → 201 (o 200) + response contiene `_id`, `usuarioId`, `tipo:'fisica'`, `tipologia:'cliente'`, `nombre:'Ana López'`, `activo:true`.
       - `'CONT-01: creates persona jurídica'`: POST con `tipo:'juridica'`, `nombre:'Acme S.L.'`, `documentacionFiscal:'B12345678'` → 201.
       - `'CONT-02: rejects invalid tipologia'`: POST con `tipologia:'invalido'` → 400 + `code:'VALIDATION'`.

       **CONT-03 (parámetros dinámicos)**
       - `'CONT-03: registers new parametros into esquema contacto'`: POST con `parametros:{ profesion:'Abogado', estadoCivil:'Casado' }` → 201; luego consultar `esquemaModel.findOne({tipoObjeto:'contacto', usuarioId})` → `parametros` array contiene entries con `nombre:'profesion'` y `nombre:'estadoCivil'` (ambos `tipoDato:'texto'`).
       - `'CONT-03: idempotent — repeating same parametro key does not duplicate'`: POST dos veces con `{parametros:{profesion:'X'}}` → esquema sigue con un solo `nombre:'profesion'`.

       **CONT-04 (listado, búsqueda, filtro, paginación)**
       - `'CONT-04: lists with pagination envelope'`: crear 3 contactos, GET `/api/v1/contactos?page=1&limit=2` → response `{items:[2 items], total:3, page:1, limit:2}`.
       - `'CONT-04: filters by tipologia'`: crear 2 cliente + 1 parte_contraria, GET `?tipologia=cliente` → items.length === 2 y todos `tipologia:'cliente'`.
       - `'CONT-04: searches by nombre via $text index'`: crear contactos 'Ana López' y 'Luis Pérez', GET `?search=Ana` → items.length === 1, items[0].nombre === 'Ana López'.

       **CONT-05 (detalle + expedientesVinculados stub)**
       - `'CONT-05: detail includes empty expedientesVinculados array'`: crear contacto, GET `/api/v1/contactos/:id` → response.expedientesVinculados deepEquals [].
       - `'CONT-05: returns 404 for non-existent id'`: GET `/api/v1/contactos/507f1f77bcf86cd799439011` → 404 + `code:'NOT_FOUND'`.

       **Soft-delete**
       - `'soft-deletes via DELETE and excludes from list'`: crear contacto, DELETE `/api/v1/contactos/:id` → 200; GET `/api/v1/contactos` → items NO contiene el id eliminado.
       - `'soft-delete persists activo:false in DB'`: tras DELETE, `contactoModel.findOne({_id:id}, null, {withInactive:true})` → activo:false, fechaInactivacion:Date.

       **Audit (cierre del bucle)**
       - `'audit: POST creates auditoria record with recurso=contacto, accion=create'`: POST contacto, esperar `setImmediate` (`await new Promise(r => setImmediate(r))` + pequeño `await new Promise(r => setTimeout(r, 50))`), `auditoriaModel.findOne({recurso:'contacto', accion:'create'}).sort({timestamp:-1})` → toBeTruthy.
       - `'audit: DELETE creates auditoria record with accion=delete'`: tras DELETE, esperar, find audit con `accion:'delete'` → toBeTruthy.

    4) Cerrar `app.close()` en `afterAll`.

    Total: 13+ tests. Verificar que TODOS pasan en verde antes de marcar done.
  </action>
  <verify>
    <automated>pnpm --filter backend test:e2e -- contactos</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "describe('CONT" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0.
    - `! grep -q "describe.skip" apps/backend/test/contactos/contactos.e2e-spec.ts` (skip eliminado).
    - `grep -q "expedientesVinculados" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (CONT-05).
    - `grep -q "withInactive" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (soft-delete check).
    - `grep -q "auditoriaModel\\|getModelToken('Auditoria')" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (audit loop).
    - `grep -q "recurso: 'contacto'\\|recurso:'contacto'" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0.
    - `grep -q "tipologia: 'cliente'" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0.
    - `grep -q "parametros" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (CONT-03).
    - `grep -q "search=" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (CONT-04).
    - `grep -q "page.*limit\\|limit.*page" apps/backend/test/contactos/contactos.e2e-spec.ts` exits 0 (paginación).
    - `pnpm --filter backend test:e2e -- contactos` shows 13+ passing tests, 0 failing.
    - `pnpm --filter backend test && pnpm --filter backend test:e2e` (full suite) all green.
  </acceptance_criteria>
  <done>
    CONT-01..05 verificados end-to-end. Bucle de auditoría cerrado. Soft-delete operativo en colección de negocio (primera vez productiva en el proyecto). Phase 3 backend deliverable completo.
  </done>
</task>

</tasks>

<verification>
1. `pnpm --filter backend test && pnpm --filter backend test:e2e` — todo verde, incluye 13+ tests de contactos + suites de phases anteriores.
2. `pnpm --filter backend build` exitoso.
3. `grep -RIn "softDeletePlugin" apps/backend/src/modules/` — debe aparecer SOLO en `contactos/schemas/contacto.schema.ts` (esquemas/auditoria correctamente excluidos).
4. `grep -RIn "UnauthorizedException\\|NotFoundException\\|HttpException" apps/backend/src/modules/contactos/` — vacío (todo el módulo usa DomainError tipados).
5. Lint + type-check verdes (`pnpm --filter backend lint`).
</verification>

<success_criteria>
- CONT-01: POST crea persona física/juridica con campos base + tipologia (e2e verde).
- CONT-02: tipologia validado contra enum (e2e verde).
- CONT-03: parametros nuevos registrados en esquema dinámico vía EsquemasService idempotente (e2e verde).
- CONT-04: GET con search + tipologia + page + limit devuelve envelope paginado (e2e verde).
- CONT-05: GET /:id incluye expedientesVinculados:[] como stub (e2e verde).
- Soft-delete operativo: DELETE marca activo:false; listado por defecto excluye; bypass via `withInactive` funciona.
- Auditoría: registros create/update/delete escritos asíncronamente y verificables.
- Suite backend completa verde.
</success_criteria>

<output>
After completion, create `.planning/phases/03-contactos/03-01-SUMMARY.md` documentando:
- Endpoints expuestos y sus response shapes.
- Decisiones específicas tomadas (p.ej. paths reales de JwtAuthGuard si difieren).
- Cierre de AUTH-06: confirmación de que `softDeletePlugin` está aplicado por primera vez a colección de negocio (`contactos`) y verificado e2e.
- Phase 8 prep: campo `documentacionFiscalHash` ya existe en schema (null), listo para encryption sin migración.
</output>
