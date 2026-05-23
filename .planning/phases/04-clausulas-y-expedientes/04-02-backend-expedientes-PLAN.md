---
phase: 04-clausulas-y-expedientes
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/modules/expedientes/schemas/expediente.schema.ts
  - apps/backend/src/modules/expedientes/expedientes.repository.ts
  - apps/backend/src/modules/expedientes/expedientes.service.ts
  - apps/backend/src/modules/expedientes/expedientes.controller.ts
  - apps/backend/src/modules/expedientes/expedientes.module.ts
  - apps/backend/src/modules/expedientes/dto/create-expediente.dto.ts
  - apps/backend/src/modules/expedientes/dto/update-expediente.dto.ts
  - apps/backend/src/modules/expedientes/dto/query-expediente.dto.ts
  - apps/backend/src/modules/expedientes/dto/link-contacto.dto.ts
  - apps/backend/src/modules/contactos/contactos.module.ts
  - apps/backend/src/modules/contactos/contactos.service.ts
  - apps/backend/src/app.module.ts
  - apps/backend/test/expedientes/expedientes.e2e-spec.ts
  - apps/backend/test/contactos/contactos.e2e-spec.ts
  - packages/shared-validation/src/expedientes.ts
  - packages/shared-validation/src/index.ts
  - packages/shared-types/src/expediente.ts
  - packages/shared-types/src/index.ts
autonomous: true
requirements: [EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07]
must_haves:
  truths:
    - "El usuario puede crear/editar/borrar expedientes con nombre y parámetros dinámicos"
    - "El usuario puede asociar y desasociar contactos a un expediente con un rol libre"
    - "Si se intenta asociar (contactoId, rol) duplicado, el sistema devuelve 409 con mensaje legible"
    - "GET /expedientes/:id devuelve detalle con `contactos[]`, `parametros{}`, `documentos:[]` (placeholder), `fechas:[]` (placeholder)"
    - "GET /contactos/:id devuelve `expedientesVinculados` REAL (no stub) — cierra CONT-05"
    - "Link y unlink emiten eventos `expedientes.linked` / `expedientes.unlinked` que son auditados por AuditListener"
  artifacts:
    - path: "apps/backend/src/modules/expedientes/schemas/expediente.schema.ts"
      provides: "Schema Expediente con array embebido contactos[] + parametros + softDelete + índices"
      contains: "ContactoVinculadoSchema"
    - path: "apps/backend/src/modules/expedientes/expedientes.controller.ts"
      provides: "Endpoints CRUD + POST/DELETE link/unlink contactos"
      contains: "@Post(':id/contactos')"
    - path: "apps/backend/src/modules/expedientes/expedientes.repository.ts"
      provides: "Repository con findByContactoId para CONT-05 + pushContacto/pullContacto"
      contains: "findByContactoId"
    - path: "apps/backend/src/modules/contactos/contactos.service.ts"
      provides: "ContactosService.getById poblando expedientesVinculados real (CONT-05 cerrado)"
      contains: "expedientesRepo"
    - path: "packages/shared-validation/src/expedientes.ts"
      provides: "Zod schemas CreateExpediente / UpdateExpediente / QueryExpediente / LinkContacto"
      exports: ["CreateExpedienteSchema", "LinkContactoSchema"]
  key_links:
    - from: "ExpedientesService.linkContacto"
      to: "EventEmitter2 'expedientes.linked'"
      via: "eventEmitter.emit"
      pattern: "expedientes\\.linked"
    - from: "ContactosService.getById"
      to: "ExpedientesRepository.findByContactoId"
      via: "constructor injection via forwardRef"
      pattern: "findByContactoId"
    - from: "ExpedientesService.linkContacto"
      to: "ContactosRepository.findById (validate contacto exists)"
      via: "constructor injection (ContactosModule imported by ExpedientesModule)"
      pattern: "contactosRepo\\.findById"
---

<objective>
Implementar el módulo NestJS `expedientes` con array embebido `contactos[{contactoId, rol}]` + endpoints REST CRUD + endpoints `link`/`unlink` para asociar contactos con rol contextual. Cierra el stub `expedientesVinculados:[]` que dejó Phase 3 en `ContactosService.getById` resolviendo la dependencia circular Contactos↔Expedientes con `forwardRef`. Detalle expediente devuelve `documentos:[]` y `fechas:[]` como placeholders para Phase 6/7. Tests e2e exhaustivos cubren EXPE-01..07 + cierre de CONT-05.

Purpose: Cubrir EXPE-01..07 (gestión expedientes + asociación contactos con rol + parámetros dinámicos + listado/búsqueda + placeholders documentos/fechas) y cerrar definitivamente CONT-05 (vista inversa "expedientes de un contacto") que quedó stubbed en Phase 3.

Output: Módulo backend `expedientes` operativo. `ContactosService.getById` ahora retorna lista real de expedientes vinculados. Eventos `expedientes.linked`/`expedientes.unlinked` auditados.
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

# Phase 3 reference patterns
@apps/backend/src/modules/contactos/schemas/contacto.schema.ts
@apps/backend/src/modules/contactos/contactos.repository.ts
@apps/backend/src/modules/contactos/contactos.service.ts
@apps/backend/src/modules/contactos/contactos.controller.ts
@apps/backend/src/modules/contactos/contactos.module.ts
@apps/backend/src/modules/esquemas/esquemas.service.ts
@apps/backend/src/modules/auditoria/listeners/audit.listener.ts
@apps/backend/test/contactos/contactos.e2e-spec.ts

<interfaces>
From apps/backend/src/modules/esquemas/esquemas.service.ts:
```typescript
addParametro(
  usuarioId: string,
  tipoObjeto: 'expediente' | 'contacto',
  parametro: { nombre: string; tipoDato: 'texto'|'numero'|'fecha'|'booleano'; obligatorio: boolean },
): Promise<EsquemaDocument>;
// Idempotente ($addToSet). Lanza ConflictError si nombre existe con tipoDato distinto.
```

From apps/backend/src/modules/contactos/contactos.repository.ts:
```typescript
class ContactosRepository {
  findById(usuarioId: string, id: string): Promise<ContactoDocument | null>;
  // Exportado por ContactosModule — se inyecta en ExpedientesService.
}
```

From apps/backend/src/modules/auditoria/listeners/audit.listener.ts:
```typescript
@OnEvent('*.linked', { async: true })
@OnEvent('*.unlinked', { async: true })
// El listener captura cualquier evento que termine en `.linked` o `.unlinked`
// y escribe en `auditoria` con payload { usuarioId, recurso, recursoId, contexto, ip?, userAgent? }.
// IMPORTANTE: el namespace del evento debe terminar exactamente en `.linked` (no `.contactoLinked`)
// para que el wildcard lo capture. Emitir como `expedientes.linked` con contexto `{contactoId, rol}`.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Schemas Zod + tipos compartidos para Expediente y LinkContacto</name>
  <read_first>
    - packages/shared-validation/src/contactos.ts (patrón Zod)
    - packages/shared-validation/src/esquemas.ts (reutilizar NombreParametroSchema para parametros dinámicos)
    - packages/shared-types/src/contacto.ts
    - docs/DATOS.md §4.1 (expedientes canónico)
  </read_first>
  <behavior>
    - CreateExpedienteSchema acepta `{nombre, parametros?}`; strict; `parametros` es `Record<string, unknown>` default `{}`
    - UpdateExpedienteSchema = partial().strict()
    - QueryExpedienteSchema valida `search?`, `contactoId?` (24-char hex), `page`, `limit`
    - LinkContactoSchema valida `{contactoId, rol}` — `contactoId` ObjectId hex, `rol` string 1-60 chars (texto libre)
  </behavior>
  <action>
    1. Crear `packages/shared-validation/src/expedientes.ts`:
       ```typescript
       import { z } from 'zod';
       import { NombreParametroSchema } from './esquemas';

       export const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId');
       export const RolSchema = z.string().trim().min(1).max(60);

       export const CreateExpedienteSchema = z.object({
         nombre: z.string().min(1).max(200),
         parametros: z.record(NombreParametroSchema, z.unknown()).optional().default({}),
       }).strict();

       export const UpdateExpedienteSchema = CreateExpedienteSchema.partial().strict();

       export const QueryExpedienteSchema = z.object({
         search: z.string().optional(),
         contactoId: ObjectIdSchema.optional(),
         page: z.coerce.number().int().positive().default(1),
         limit: z.coerce.number().int().positive().max(100).default(20),
       }).strict();

       export const LinkContactoSchema = z.object({
         contactoId: ObjectIdSchema,
         rol: RolSchema,
       }).strict();

       export type CreateExpedienteInput = z.infer<typeof CreateExpedienteSchema>;
       export type UpdateExpedienteInput = z.infer<typeof UpdateExpedienteSchema>;
       export type QueryExpedienteInput = z.infer<typeof QueryExpedienteSchema>;
       export type LinkContactoInput = z.infer<typeof LinkContactoSchema>;
       ```
    2. Re-exportar desde `packages/shared-validation/src/index.ts`.
    3. Crear `packages/shared-types/src/expediente.ts`:
       ```typescript
       export interface ContactoVinculado { contactoId: string; rol: string; }
       export interface Expediente {
         _id: string; usuarioId: string; nombre: string;
         contactos: ContactoVinculado[];
         parametros: Record<string, unknown>;
         activo: boolean;
         fechaCreacion: string; fechaActualizacion: string;
       }
       export interface ExpedienteDetailResponse extends Expediente {
         documentos: unknown[];  // Phase 6 placeholder
         fechas: unknown[];      // Phase 7 placeholder
       }
       export interface ExpedienteListResponse {
         items: Expediente[]; total: number; page: number; limit: number;
       }
       ```
    4. Re-exportar desde `packages/shared-types/src/index.ts`.
    5. Compilar: `pnpm --filter @lexscribe/shared-validation build && pnpm --filter @lexscribe/shared-types build`.
  </action>
  <verify>
    <automated>cd packages/shared-validation &amp;&amp; pnpm build &amp;&amp; cd ../shared-types &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "LinkContactoSchema" packages/shared-validation/src/expedientes.ts` retorna match
    - `grep -n "export \\* from './expedientes'" packages/shared-validation/src/index.ts` retorna match
    - `grep -n "ContactoVinculado" packages/shared-types/src/expediente.ts` retorna match
    - Existe `packages/shared-validation/dist/expedientes.js`
    - `node -e "const v=require('./packages/shared-validation/dist'); console.log(typeof v.LinkContactoSchema.parse)"` imprime `function`
  </acceptance_criteria>
  <done>
    Zod schemas y types compartidos disponibles; ambos packages rebuildados.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ExpedientesModule completo — schema, repository (con findByContactoId, push/pullContacto), service (con link/unlink + eventos), controller, integración con EsquemasService</name>
  <read_first>
    - apps/backend/src/modules/contactos/schemas/contacto.schema.ts (softDelete pattern)
    - apps/backend/src/modules/contactos/contactos.repository.ts (patrón repo)
    - apps/backend/src/modules/contactos/contactos.service.ts (patrón service + EsquemasService integration)
    - apps/backend/src/modules/contactos/contactos.controller.ts (patrón controller + audit)
    - apps/backend/src/modules/contactos/contactos.module.ts (patrón module — imports EsquemasModule + AuditoriaModule + AuthModule)
    - apps/backend/src/modules/auditoria/listeners/audit.listener.ts (verificar wildcard `*.linked`)
    - apps/backend/src/app.module.ts (verificar EventEmitterModule.forRoot({wildcard:true}) — si no está, añadirlo)
    - docs/DATOS.md §4.1 (esquema + índices canónicos)
  </read_first>
  <behavior>
    - POST /expedientes crea expediente con `parametros` registrando cada uno en `esquemas/expediente` via `EsquemasService.addParametro` (idéntico patrón contactos)
    - GET /expedientes con `?search=foo` usa `$text`; con `?contactoId=...` filtra por `contactos.contactoId`
    - GET /expedientes/:id devuelve `{...expediente, documentos:[], fechas:[]}` (placeholders Phase 6/7)
    - POST /expedientes/:id/contactos con body `{contactoId, rol}` — valida contacto existe (404 si no), valida unicidad (409 si duplicado), $push, emite `expedientes.linked`
    - DELETE /expedientes/:id/contactos/:contactoId/:rol — desvincula, 404 si no existe el vínculo, emite `expedientes.unlinked`
    - PATCH /expedientes/:id actualiza nombre/parametros; registra parametros nuevos en esquemas
    - DELETE /expedientes/:id → soft-delete
    - Sin JWT → 401
    - `usuarioId` SIEMPRE de JWT
  </behavior>
  <action>
    1. **Schema** `apps/backend/src/modules/expedientes/schemas/expediente.schema.ts`:
       ```typescript
       import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
       import { HydratedDocument, Types } from 'mongoose';
       import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

       @Schema({ _id: false })
       export class ContactoVinculado {
         @Prop({ type: Types.ObjectId, ref: 'Contacto', required: true }) contactoId!: Types.ObjectId;
         @Prop({ type: String, required: true }) rol!: string;
       }
       export const ContactoVinculadoSchema = SchemaFactory.createForClass(ContactoVinculado);

       export type ExpedienteDocument = HydratedDocument<Expediente>;

       @Schema({
         collection: 'expedientes',
         timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
       })
       export class Expediente {
         @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
         usuarioId!: Types.ObjectId;
         @Prop({ required: true, type: String }) nombre!: string;
         @Prop({ type: [ContactoVinculadoSchema], default: [] }) contactos!: ContactoVinculado[];
         @Prop({ type: Object, default: {} }) parametros!: Record<string, unknown>;
       }

       export const ExpedienteSchema = SchemaFactory.createForClass(Expediente);
       ExpedienteSchema.plugin(softDeletePlugin);
       ExpedienteSchema.index({ nombre: 'text' }, { name: 'expediente_text_idx' });
       ExpedienteSchema.index({ 'contactos.contactoId': 1, activo: 1 });
       ExpedienteSchema.index({ usuarioId: 1, activo: 1, fechaCreacion: -1 });
       ```

    2. **DTOs**: `create-expediente.dto.ts`, `update-expediente.dto.ts`, `query-expediente.dto.ts`, `link-contacto.dto.ts` usando `createZodDto` del schema correspondiente.

    3. **Repository** `expedientes.repository.ts`:
       ```typescript
       async findAll(usuarioId, opts) {
         const filter: Record<string, unknown> = { usuarioId: this.toObjectId(usuarioId) };
         if (opts.contactoId) filter['contactos.contactoId'] = this.toObjectId(opts.contactoId);
         if (opts.search) filter.$text = { $search: opts.search };
         const sort = opts.search ? { score: { $meta: 'textScore' } } : { fechaCreacion: -1 };
         const projection = opts.search ? { score: { $meta: 'textScore' } } : undefined;
         const [items, total] = await Promise.all([
           this.model.find(filter, projection).sort(sort)
             .skip((opts.page-1)*opts.limit).limit(opts.limit).exec(),
           this.model.countDocuments(filter).exec(),
         ]);
         return { items, total };
       }

       async findById(usuarioId, id) { /* idéntico a contactos */ }
       async create(usuarioId, data) { /* idéntico a contactos */ }
       async update(usuarioId, id, data) { /* findOneAndUpdate con returnDocument:'after' */ }
       async softDelete(usuarioId, id) { /* setea activo:false, fechaInactivacion:new Date() */ }

       async findByContactoId(usuarioId: string, contactoId: string) {
         return this.model.find({
           usuarioId: this.toObjectId(usuarioId),
           'contactos.contactoId': this.toObjectId(contactoId),
         }).exec();
       }

       async pushContacto(usuarioId, expedienteId, vinculo: {contactoId: Types.ObjectId, rol: string}) {
         return this.model.findOneAndUpdate(
           { _id: this.toObjectId(expedienteId), usuarioId: this.toObjectId(usuarioId) },
           { $push: { contactos: vinculo } },
           { returnDocument: 'after' },
         ).exec();
       }

       async pullContacto(usuarioId, expedienteId, contactoId: string, rol: string) {
         return this.model.findOneAndUpdate(
           { _id: this.toObjectId(expedienteId), usuarioId: this.toObjectId(usuarioId) },
           { $pull: { contactos: { contactoId: this.toObjectId(contactoId), rol } } },
           { returnDocument: 'after' },
         ).exec();
       }
       ```

    4. **Service** `expedientes.service.ts`:
       - Constructor inyecta `repo: ExpedientesRepository`, `esquemasService: EsquemasService`, `contactosRepo: ContactosRepository`, `eventEmitter: EventEmitter2`.
       - `list`, `getById` (devuelve detalle con `documentos:[], fechas:[]` placeholders), `create` (registra parámetros antes), `update`, `remove`.
       - `linkContacto(uid, expId, dto)`:
         ```typescript
         const contacto = await this.contactosRepo.findById(uid, dto.contactoId);
         if (!contacto) throw new NotFoundError('contacto', dto.contactoId);
         const expediente = await this.repo.findById(uid, expId);
         if (!expediente) throw new NotFoundError('expediente', expId);
         const duplicate = expediente.contactos.some(
           (c) => c.contactoId.toString() === dto.contactoId && c.rol === dto.rol,
         );
         if (duplicate) throw new ConflictError(
           `Contacto ya vinculado con rol "${dto.rol}" a este expediente`,
         );
         const updated = await this.repo.pushContacto(uid, expId, {
           contactoId: new Types.ObjectId(dto.contactoId), rol: dto.rol,
         });
         this.eventEmitter.emit('expedientes.linked', {
           usuarioId: uid, recurso: 'expediente', recursoId: expId,
           contexto: { contactoId: dto.contactoId, rol: dto.rol },
         });
         return updated;
         ```
       - `unlinkContacto(uid, expId, contactoId, rol)`:
         ```typescript
         const before = await this.repo.findById(uid, expId);
         if (!before) throw new NotFoundError('expediente', expId);
         const exists = before.contactos.some(
           (c) => c.contactoId.toString() === contactoId && c.rol === rol,
         );
         if (!exists) throw new NotFoundError('vinculo', `${contactoId}/${rol}`);
         const updated = await this.repo.pullContacto(uid, expId, contactoId, rol);
         this.eventEmitter.emit('expedientes.unlinked', {
           usuarioId: uid, recurso: 'expediente', recursoId: expId,
           contexto: { contactoId, rol },
         });
         return updated;
         ```
       - `registerParametros` idéntico a `ContactosService.registerParametros` pero llamando a `addParametro(uid, 'expediente', ...)`.

    5. **Controller** `expedientes.controller.ts`:
       ```typescript
       @UseGuards(JwtAuthGuard)
       @UseInterceptors(AuditInterceptor)
       @Controller('expedientes')
       export class ExpedientesController {
         @Get() list(@CurrentUser('id') uid, @Query() q: QueryExpedienteDto)...
         @Get(':id') getById(@CurrentUser('id') uid, @Param('id', MongoIdPipe) id)...
         @Post() @Audited('expediente','create') create(@CurrentUser('id') uid, @Body() dto: CreateExpedienteDto)...
         @Patch(':id') @Audited('expediente','update') update(...)...
         @Delete(':id') @Audited('expediente','delete') remove(...)...

         @Post(':id/contactos')
         linkContacto(@CurrentUser('id') uid, @Param('id', MongoIdPipe) id, @Body() dto: LinkContactoDto)
         { return this.service.linkContacto(uid, id, dto); }

         @Delete(':id/contactos/:contactoId/:rol')
         unlinkContacto(@CurrentUser('id') uid, @Param('id', MongoIdPipe) id,
                        @Param('contactoId', MongoIdPipe) contactoId,
                        @Param('rol') rol: string)
         { return this.service.unlinkContacto(uid, id, contactoId, decodeURIComponent(rol)); }
       }
       ```
       NOTA: link/unlink NO usan `@Audited` — la auditoría viene del listener `*.linked`/`*.unlinked`.

    6. **Module** `expedientes.module.ts`:
       ```typescript
       @Module({
         imports: [
           MongooseModule.forFeature([{ name: Expediente.name, schema: ExpedienteSchema }]),
           EsquemasModule,
           AuditoriaModule,
           AuthModule,
           forwardRef(() => ContactosModule),  // para inyectar ContactosRepository
         ],
         controllers: [ExpedientesController],
         providers: [ExpedientesService, ExpedientesRepository],
         exports: [ExpedientesService, ExpedientesRepository],
       })
       export class ExpedientesModule {}
       ```

    7. **Cerrar CONT-05 en ContactosModule/Service**:
       - Editar `apps/backend/src/modules/contactos/contactos.module.ts`: añadir `forwardRef(() => ExpedientesModule)` a `imports`.
       - Editar `apps/backend/src/modules/contactos/contactos.service.ts`:
         ```typescript
         constructor(
           private readonly repo: ContactosRepository,
           private readonly esquemasService: EsquemasService,
           @Inject(forwardRef(() => ExpedientesRepository))
           private readonly expedientesRepo: ExpedientesRepository,
         ) {}

         async getById(usuarioId: string, id: string) {
           const contacto = await this.repo.findById(usuarioId, id);
           if (!contacto) throw new NotFoundError('contacto', id);
           const expedientes = await this.expedientesRepo.findByContactoId(usuarioId, id);
           return {
             ...contacto.toObject(),
             expedientesVinculados: expedientes.map((e) => ({
               _id: e._id.toString(),
               nombre: e.nombre,
               rol: e.contactos.find((c) => c.contactoId.toString() === id)?.rol ?? '',
             })),
           };
         }
         ```
       - Eliminar el comentario "// CONT-05: stub vacío hasta Phase 4" del service.

    8. **Registrar ExpedientesModule** en `apps/backend/src/app.module.ts` (en `imports`).

    9. **Verificar EventEmitter wildcards**: en `app.module.ts`, asegurar que `EventEmitterModule.forRoot({ wildcard: true })` está presente (verificar primero con grep; añadir si falta — STATE.md confirma listener `*.linked` ya existe en Phase 2).

    10. Lint + build: `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend lint &amp;&amp; pnpm --filter @lexscribe/backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "ContactoVinculadoSchema" apps/backend/src/modules/expedientes/schemas/expediente.schema.ts` retorna match
    - `grep -n "ExpedienteSchema.index" apps/backend/src/modules/expedientes/schemas/expediente.schema.ts` retorna ≥3 líneas (text + contactos.contactoId + usuarioId,activo,fecha)
    - `grep -n "findByContactoId" apps/backend/src/modules/expedientes/expedientes.repository.ts` retorna match
    - `grep -n "@Post(':id/contactos')" apps/backend/src/modules/expedientes/expedientes.controller.ts` retorna match
    - `grep -n "@Delete(':id/contactos/:contactoId/:rol')" apps/backend/src/modules/expedientes/expedientes.controller.ts` retorna match
    - `grep -n "expedientes.linked" apps/backend/src/modules/expedientes/expedientes.service.ts` retorna match
    - `grep -n "expedientes.unlinked" apps/backend/src/modules/expedientes/expedientes.service.ts` retorna match
    - `grep -n "forwardRef" apps/backend/src/modules/expedientes/expedientes.module.ts` retorna match
    - `grep -n "forwardRef" apps/backend/src/modules/contactos/contactos.module.ts` retorna match
    - `grep -n "expedientesRepo" apps/backend/src/modules/contactos/contactos.service.ts` retorna ≥2 matches (constructor + getById)
    - `grep -n "// CONT-05: stub" apps/backend/src/modules/contactos/contactos.service.ts` retorna 0 matches (comentario eliminado)
    - `grep -rn "usuarioId" apps/backend/src/modules/expedientes/dto/` retorna 0 matches
    - `grep -n "ExpedientesModule" apps/backend/src/app.module.ts` retorna match
    - `grep -n "wildcard" apps/backend/src/app.module.ts` retorna match (EventEmitter wildcard config)
    - `pnpm --filter @lexscribe/backend build` finaliza con exit code 0
  </acceptance_criteria>
  <done>
    ExpedientesModule compila; ContactosModule actualizado con forwardRef; backend arranca sin errores de DI circular; build verde.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Tests e2e Expedientes — EXPE-01..07 + auditoría link/unlink + ampliación contactos.e2e-spec para CONT-05 real</name>
  <read_first>
    - apps/backend/test/contactos/contactos.e2e-spec.ts (patrón e2e + test CONT-05 actual que asume stub vacío — debe actualizarse)
    - apps/backend/test/auditoria/audit.interceptor.e2e-spec.ts (cómo verificar audit entries)
    - apps/backend/test/setup-e2e.ts (MongoMemoryServer)
  </read_first>
  <behavior>
    Para `apps/backend/test/expedientes/expedientes.e2e-spec.ts`:
    - POST /expedientes con `{nombre, parametros:{honorariosBase:1500}}` → 201; verifica que `esquemas` ahora contiene parametro `honorariosBase` con `tipoDato:'numero'`
    - GET /expedientes con `?search=hipoteca` filtra por full-text
    - GET /expedientes con `?contactoId=<id>` solo devuelve expedientes que tienen ese contacto vinculado
    - GET /expedientes/:id devuelve `{... , documentos: [], fechas: []}` (placeholders)
    - POST /expedientes/:id/contactos con contactoId válido + rol "cliente" → 201; segundo POST con mismo par → 409 con mensaje legible que incluye "ya vinculado"
    - POST /expedientes/:id/contactos con contactoId inexistente → 404
    - DELETE /expedientes/:id/contactos/:cId/:rol → desvincula; segundo DELETE → 404
    - DELETE con rol con espacio (encodeURIComponent("Cliente Principal")) → desvincula correctamente
    - Tras link: existe entrada en `auditoria` con `{accion:'linked', recurso:'expediente', recursoId, contexto:{contactoId, rol}}`
    - Tras unlink: existe entrada en `auditoria` con `accion:'unlinked'`
    - DELETE /expedientes/:id soft-delete; GET subsiguiente no lo devuelve

    Para `apps/backend/test/contactos/contactos.e2e-spec.ts` (UPDATE del test existente):
    - Localizar el test que verifica `expedientesVinculados:[]` (stub Phase 3)
    - Reemplazar/ampliar con: crear expediente → linkear contacto → GET /contactos/:id devuelve `expedientesVinculados: [{_id, nombre, rol}]` con datos correctos
  </behavior>
  <action>
    1. Crear `apps/backend/test/expedientes/expedientes.e2e-spec.ts` siguiendo estructura de `contactos.e2e-spec.ts`:
       - `beforeAll`: bootstrap AppModule con DomainExceptionFilter + ZodValidationPipe globales
       - `beforeEach`: limpiar `expedientes`, `contactos`, `esquemas`, `auditoria`; crear usuario seed + obtener JWT
       - Helper `createContacto()` que hace POST /contactos y retorna `{id, ...}` (reutilizar patrón)
       - Helper `sleep(ms)` para esperar a que `setImmediate`+listener async escriban auditoría (50ms suficiente)
       - describe blocks:
         * `'POST /expedientes'`: create + esquema dinámico actualizado (verificar via `db.collection('esquemas').findOne({tipoObjeto:'expediente'})`)
         * `'GET /expedientes (list)'`: paginación, search full-text, filtro contactoId
         * `'GET /expedientes/:id'`: placeholders documentos/fechas presentes
         * `'PATCH /expedientes/:id'`: actualiza nombre y parametros (registra en esquema)
         * `'DELETE /expedientes/:id'`: soft-delete
         * `'POST /expedientes/:id/contactos'`: link OK, duplicado 409, contacto inexistente 404, audit `*.linked` escrita
         * `'DELETE /expedientes/:id/contactos/:contactoId/:rol'`: unlink OK, no existente 404, rol con espacio OK, audit `*.unlinked` escrita
       Mínimo 20 tests.

    2. Ampliar `apps/backend/test/contactos/contactos.e2e-spec.ts`:
       - Buscar el test existente que verifica `expedientesVinculados: []` (probablemente describe `'GET /contactos/:id'` o similar).
       - Añadir un nuevo test (NO eliminar el de array vacío cuando no hay vínculos):
         ```typescript
         it('CONT-05: devuelve expedientesVinculados con datos reales cuando el contacto está vinculado a expedientes', async () => {
           const contacto = await createContacto(token);
           const expRes = await request(app.getHttpServer())
             .post('/api/v1/expedientes')
             .set('Authorization', `Bearer ${token}`)
             .send({ nombre: 'Caso Demo' })
             .expect(201);
           await request(app.getHttpServer())
             .post(`/api/v1/expedientes/${expRes.body._id}/contactos`)
             .set('Authorization', `Bearer ${token}`)
             .send({ contactoId: contacto._id, rol: 'cliente' })
             .expect(201);
           const res = await request(app.getHttpServer())
             .get(`/api/v1/contactos/${contacto._id}`)
             .set('Authorization', `Bearer ${token}`)
             .expect(200);
           expect(res.body.expedientesVinculados).toHaveLength(1);
           expect(res.body.expedientesVinculados[0]).toMatchObject({
             _id: expRes.body._id, nombre: 'Caso Demo', rol: 'cliente',
           });
         });
         ```

    3. Ejecutar: `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern="(expedientes|contactos)"`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern="(expedientes|contactos)"</automated>
  </verify>
  <acceptance_criteria>
    - `apps/backend/test/expedientes/expedientes.e2e-spec.ts` existe con ≥300 líneas
    - `grep -c "it(" apps/backend/test/expedientes/expedientes.e2e-spec.ts` ≥20
    - `grep -n "409" apps/backend/test/expedientes/expedientes.e2e-spec.ts` retorna match (duplicate link 409)
    - `grep -n "expedientes.linked\\|accion.*linked" apps/backend/test/expedientes/expedientes.e2e-spec.ts` retorna match
    - `grep -n "documentos: \\[\\]\\|fechas: \\[\\]" apps/backend/test/expedientes/expedientes.e2e-spec.ts` retorna match (placeholders)
    - `grep -n "CONT-05" apps/backend/test/contactos/contactos.e2e-spec.ts` retorna match (test nuevo con vínculos reales)
    - `pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern="(expedientes|contactos)"` finaliza con `0 failed`
    - Toda la suite e2e completa pasa: `pnpm --filter @lexscribe/backend test:e2e` → 0 failed (sin regresiones en auth/auditoria/esquemas/clausulas)
  </acceptance_criteria>
  <done>
    Suite e2e expedientes verde cubriendo EXPE-01..07 + auditoría link/unlink + cierre CONT-05; no regresiones en suites previas.
  </done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build` → 0 errors
- `pnpm --filter @lexscribe/backend test:e2e` → all green
- Backend arranca con `pnpm --filter @lexscribe/backend start:dev` sin errores de DI circular
- CONT-05 funcional: GET /contactos/:id devuelve expedientesVinculados real
</verification>

<success_criteria>
- EXPE-01 a EXPE-07 cubiertos por endpoints + tests
- CONT-05 cerrado (vista inversa real, no stub)
- Eventos `expedientes.linked` / `expedientes.unlinked` capturados por AuditListener y escritos en `auditoria`
- Sin regresión en Phase 3 (contactos sigue verde)
- Sin DI circular: backend bootstrap correcto
</success_criteria>

<output>
Crear `.planning/phases/04-clausulas-y-expedientes/04-02-SUMMARY.md` con: archivos creados/modificados, decisiones (forwardRef, rol con encodeURIComponent), número de tests, confirmación cierre CONT-05.
</output>
