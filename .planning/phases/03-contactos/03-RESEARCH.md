# Phase 3: Contactos — Research

**Researched:** 2026-05-03
**Domain:** NestJS module + Mongoose schema + Next.js CRUD UI + dynamic schema integration
**Confidence:** HIGH

---

## Summary

Phase 3 builds the `contactos` module end-to-end: a NestJS backend module (schema, DTOs, repository, service, controller) wired to the existing transversal infrastructure (softDeletePlugin, DomainExceptionFilter, ZodValidationPipe, AuditInterceptor, JwtAuthGuard, @CurrentUser), plus the first full frontend CRUD page in the Next.js app. It is the first domain module that actually applies `softDeletePlugin` to a business collection (deferred from Phase 2 by design).

The backend pattern is fully established in Phase 2 (`esquemas` module). The contactos module follows the identical layered structure: `schema.ts → repository.ts → service.ts → controller.ts → module.ts → e2e spec`. The only new concerns are: (a) the compound text index for search-by-name/NIF, (b) the `parametros` sub-document wiring to `EsquemasService.addParametro`, and (c) the frontend CRUD page using TanStack Query + React Hook Form + Zod that does not yet exist.

There is one important design nuance: `documentacionFiscal` and `documentoIdentidad` appear as plain strings in this phase — the AES encryption specified in REQUIREMENTS.md (SEC-01, SEC-02) is deferred to Phase 8 (Hardening). However, the partial unique index on `documentacionFiscal` and the hash field slot must be planned in the schema now so Phase 8 can add encryption without a schema migration.

**Primary recommendation:** Copy the `esquemas` module structure verbatim as scaffolding for `contactos`, apply `softDeletePlugin` exactly as documented in the plugin source, and wire dynamic-schema updates through the existing `EsquemasService` (already exported by `EsquemasModule`).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Create contacto (persona física / jurídica) with base fields: nombre, documentacionFiscal, documentoIdentidad, direccion, email, telefono | Mongoose schema §4.2 DATOS.md; CreateContactoDto with Zod |
| CONT-02 | Each contacto has tipologia: cliente / parte_contraria / interesado / otros | Enum field in schema; Zod enum in DTO; filter param in listado endpoint |
| CONT-03 | User can add custom parameters to a contacto; these register in the dynamic `contacto` schema | EsquemasService.addParametro already implemented; contacto.parametros sub-doc writable |
| CONT-04 | List, filter, search by nombre or documentacionFiscal, paginated | MongoDB text index on nombre + documentacionFiscal; ?search&tipologia&page&limit query params |
| CONT-05 | From a contacto detail, see linked expedientes (section populated in Phase 4) | Placeholder section in frontend; backend endpoint returns empty array until Phase 4 |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- Read `docs/FUNCIONAL.md`, `docs/DATOS.md`, `docs/ARQUITECTURA.md` before any implementation. Functional spec takes precedence over all other sources.
- All new functionality must be registered with an `F-XXX` reference. Phase 3 targets: F-050, F-051, F-051b, F-052, F-053, F-054, F-055.
- Commits must reference feature IDs.
- Do not add AES encryption in this phase — that is Phase 8 (SEC-01, SEC-02).
- `softDeletePlugin` is NEVER applied globally (`mongoose.plugin()`). Applied per schema only.
- `auditoria` and `esquemas` schemas intentionally excluded from `softDeletePlugin` (DATOS.md §4.8). All other business collections — including `contactos` — use it.
- `usuarioId` injected only from JWT via `@CurrentUser('id')`. Never accepted in request body.
- `ZodValidationPipe` and `DomainExceptionFilter` are global — no per-module registration.
- Error messages in English (ARQUITECTURA.md §14). UI layer translates to Spanish.
- Validation at application level only — no MongoDB JSON Schema validators.
- Keep files under 500 lines. One bounded context per module folder.
- Always run `pnpm test` and `pnpm build` after changes.

---

## Standard Stack

### Core — Already Installed (inherits from Phase 2)

| Library | Version (verified in repo) | Purpose | Notes |
|---------|---------------------------|---------|-------|
| NestJS | 11.x | Backend framework | Module/controller/service/DI |
| Mongoose | 7.x / NestJS wrapper | MongoDB ODM | Schema, plugins, queries |
| `nestjs-zod` | present | ZodValidationPipe + createZodDto | Global pipe already wired in main.ts |
| `zod` | 3.x | Schema validation | Shared between FE and BE |
| `@lexscribe/shared-validation` | workspace | Shared Zod schemas | Extend with `contactos.ts` |
| `@lexscribe/shared-types` | workspace | Shared TS interfaces | Extend with `Contacto` interface |
| `mongodb-memory-server` | present | In-memory Mongo for e2e | Already used in setup-e2e.ts |
| Next.js | 14+ App Router | Frontend | No new install |
| TanStack Query (`@tanstack/react-query`) | check package.json | Client data fetching | To be verified / installed if missing |
| React Hook Form | check package.json | Form state | To be verified / installed if missing |
| shadcn/ui + Tailwind | present | Component library | Already installed |

### Frontend Libraries — Verify Before Planning

The frontend currently only has an auth page. Before planning the frontend task, confirm whether `@tanstack/react-query`, `react-hook-form`, and `@hookform/resolvers` are in `apps/frontend/package.json`. If missing, Plan 03-02 Wave 0 must install them.

**Installation (if missing):**
```bash
pnpm --filter frontend add @tanstack/react-query react-hook-form @hookform/resolvers
```

### New Shared-Validation Entry

Add `packages/shared-validation/src/contactos.ts` and re-export from `index.ts`, following the exact pattern in `esquemas.ts`.

---

## Architecture Patterns

### Recommended Backend Module Structure

```
apps/backend/src/modules/contactos/
├── contactos.module.ts
├── contactos.controller.ts    # GET list, POST, PATCH :id, DELETE :id, GET :id
├── contactos.service.ts       # business logic + EsquemasService call
├── contactos.repository.ts    # Mongoose queries, soft-delete, text search
├── dto/
│   ├── create-contacto.dto.ts      # createZodDto(CreateContactoSchema)
│   ├── update-contacto.dto.ts      # createZodDto(UpdateContactoSchema)
│   └── query-contacto.dto.ts       # createZodDto(QueryContactoSchema) — page, limit, search, tipologia
└── schemas/
    └── contacto.schema.ts           # Mongoose schema + softDeletePlugin + text index
```

### Pattern 1: Mongoose Schema with softDeletePlugin

**What:** Apply `softDeletePlugin` to the `ContactoSchema`, exactly as described in `apps/backend/src/common/plugins/soft-delete.plugin.ts`.

**When to use:** Every business collection except `auditoria` and `esquemas`.

```typescript
// Source: apps/backend/src/common/plugins/soft-delete.plugin.ts
import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export const ContactoSchema = SchemaFactory.createForClass(Contacto);
ContactoSchema.plugin(softDeletePlugin);
ContactoSchema.index({ nombre: 'text', documentacionFiscal: 'text' }); // F-055
ContactoSchema.index({ documentacionFiscal: 1 }, {          // partial unique (DATOS.md §4.2)
  unique: true,
  sparse: true, // allows multiple null values
  partialFilterExpression: { documentacionFiscal: { $exists: true, $ne: null, $ne: '' } },
});
ContactoSchema.index({ usuarioId: 1, activo: 1, tipologia: 1 }); // listado con filtro tipología
```

**Phase 8 preparation:** The schema should include `documentacionFiscalHash: { type: String, default: null }` as a placeholder now. Phase 8 will populate it. Adding it in Phase 3 avoids a migration.

### Pattern 2: Repository — Soft Delete + Text Search

```typescript
// Source pattern: apps/backend/src/modules/esquemas/esquemas.repository.ts
@Injectable()
export class ContactosRepository {
  constructor(@InjectModel(Contacto.name) private model: Model<ContactoDocument>) {}

  async findAll(
    usuarioId: Types.ObjectId,
    opts: { search?: string; tipologia?: string; page: number; limit: number }
  ): Promise<{ items: ContactoDocument[]; total: number }> {
    const filter: FilterQuery<ContactoDocument> = { usuarioId };
    if (opts.tipologia) filter.tipologia = opts.tipologia;
    if (opts.search) filter.$text = { $search: opts.search };
    const [items, total] = await Promise.all([
      this.model.find(filter).skip((opts.page - 1) * opts.limit).limit(opts.limit),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findById(usuarioId: Types.ObjectId, id: Types.ObjectId) {
    return this.model.findOne({ _id: id, usuarioId });
  }

  async create(usuarioId: Types.ObjectId, data: CreateContactoInput) {
    return this.model.create({ ...data, usuarioId });
  }

  async update(usuarioId: Types.ObjectId, id: Types.ObjectId, data: UpdateContactoInput) {
    return this.model.findOneAndUpdate({ _id: id, usuarioId }, { $set: data }, { new: true });
  }

  async softDelete(usuarioId: Types.ObjectId, id: Types.ObjectId) {
    // Use findOneAndUpdate not schema.statics.softDelete to scope to usuarioId
    return this.model.findOneAndUpdate(
      { _id: id, usuarioId },
      { $set: { activo: false, fechaInactivacion: new Date() } },
      { new: true }
    );
  }
}
```

**Important:** `softDeletePlugin` injects the `activo: true` filter automatically on all `find*` and `count*` operations. You do NOT need to add `{ activo: true }` explicitly to findAll queries — the plugin handles it.

### Pattern 3: Service — Dynamic Parameters (CONT-03)

The service must call `EsquemasService.addParametro` when the request body includes a `parametros` sub-object entry that isn't yet registered in the contacto schema. This is FL-13 Punto de Entrada A.

```typescript
// EsquemasModule already exports EsquemasService — import EsquemasModule in ContactosModule
async createContacto(usuarioId: string, dto: CreateContactoInput) {
  const contacto = await this.repo.create(toObjectId(usuarioId), dto);
  // Register any new parametros keys into the dynamic schema
  for (const [nombre, valor] of Object.entries(dto.parametros ?? {})) {
    await this.esquemasService.addParametro(usuarioId, 'contacto', {
      nombre,
      tipoDato: 'texto', // default; Phase 5 will refine
      obligatorio: false,
    });
    // The value is already stored inside contacto.parametros via the create call
  }
  return contacto;
}
```

**Key constraint:** `EsquemasService.addParametro` is idempotent (uses `$addToSet` logic). Calling it for an existing parameter with the same `tipoDato` is safe and returns the existing schema.

### Pattern 4: Controller Shape

```typescript
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('contactos')
export class ContactosController {
  @Get()          // CONT-04: list + search + filter + pagination
  @Post()         @Audited('contacto', 'create')   // CONT-01, CONT-02, CONT-03
  @Get(':id')     // CONT-05: detail + linked expedientes placeholder
  @Patch(':id')   @Audited('contacto', 'update')
  @Delete(':id')  @Audited('contacto', 'delete')
}
```

Pagination response shape (ARQUITECTURA.md §6.1):
```json
{ "items": [...], "total": 123, "page": 1, "limit": 20 }
```

### Pattern 5: Frontend Page Structure

```
apps/frontend/app/(app)/contactos/
├── page.tsx              # list + search + filter UI (TanStack Query)
├── [id]/
│   └── page.tsx          # detail + edit form + expedientes vinculados (placeholder)
└── components/
    ├── ContactoForm.tsx   # React Hook Form + Zod, shared by create + edit
    ├── ContactoTable.tsx  # table with search bar and tipología filter
    └── ParametrosEditor.tsx # add dynamic parameter key-value rows
```

**Authenticated API calls pattern** (established in `lib/api/auth.ts`):
```typescript
// lib/api/contactos.ts
const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

async function apiFetch(path: string, init?: RequestInit, token?: string) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'API error');
  return res.json();
}
```

### Pattern 6: Mongoose Schema — Exact Field Shape

From DATOS.md §4.2:

```typescript
@Schema({
  collection: 'contactos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' }
})
export class Contacto {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true }) usuarioId: Types.ObjectId;
  @Prop({ required: true, enum: ['fisica', 'juridica'] })          tipo: string;
  @Prop({ required: true, enum: ['cliente','parte_contraria','interesado','otros'] }) tipologia: string;
  // Base attributes (F-051)
  @Prop() nombre: string;
  @Prop() documentacionFiscal: string;    // Phase 8: encrypted
  @Prop() documentoIdentidad: string;     // Phase 8: encrypted
  @Prop() documentacionFiscalHash: string; // Phase 8: deterministic hash; placeholder for now
  @Prop() direccion: string;
  @Prop() email: string;
  @Prop() telefono: string;
  // Dynamic schema (F-051b)
  @Prop({ type: Object, default: {} }) parametros: Record<string, unknown>;
  // soft-delete fields added by plugin (activo, fechaInactivacion)
}
```

### Anti-Patterns to Avoid

- **Applying softDeletePlugin globally:** `mongoose.plugin(softDeletePlugin)` — NEVER do this. Apply only with `ContactoSchema.plugin(softDeletePlugin)`.
- **Accepting usuarioId in request body:** All usuarioId values come from `@CurrentUser('id')`. Any DTO containing `usuarioId` must be rejected.
- **Building custom pagination:** Use the `{ items, total, page, limit }` envelope already specified in ARQUITECTURA.md §6.1. Don't invent a different shape.
- **Registering ZodValidationPipe or DomainExceptionFilter per module:** Both are already global in `main.ts`. Per-module registration will cause double-application.
- **Duplicating EsquemasService logic in ContactosService:** Call `EsquemasService` from the service; never re-implement `$addToSet` logic in contactos.
- **Adding `{ activo: true }` to findAll queries manually:** The softDeletePlugin pre-hook does this automatically. Adding it manually causes a redundant filter and can conflict with the `withInactive` escape hatch.
- **Text index and regular filter in same compound index:** MongoDB text indexes cannot be part of compound regular indexes. The `$text` search and `tipologia` filter work with separate indexes (the optimizer combines them via index intersection when selectivity warrants it).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Soft delete filtering | Custom `activo: true` in every query | `softDeletePlugin` (already built) | Plugin handles all read ops atomically; escape hatch included |
| Dynamic parameter registration | Custom `$addToSet` in contactos service | `EsquemasService.addParametro` (already built) | Idempotent, conflict-checked, audit-tracked |
| HTTP error mapping | `if (err instanceof X) res.status(...)` | `DomainExceptionFilter` (global) | Centralized, consistent error body `{code, message}` |
| DTO validation | Manual `if (!body.nombre)` | `createZodDto(Schema)` + ZodValidationPipe (global) | Automatic 400 with field-level error details |
| Pagination | Custom skip/limit wiring in controller | Repository method returning `{ items, total }` + controller envelope | Consistent response shape across all modules |
| ObjectId coercion | `new Types.ObjectId(string)` everywhere | `toObjectId()` helper (decision from Phase 2 STATE.md) | Mongoose 9 does not auto-coerce in all query paths |

---

## Common Pitfalls

### Pitfall 1: softDeletePlugin + text index query interference

**What goes wrong:** `$text` search and `{ activo: true }` filter on the same collection. Mongo can use the text index for `$text` and a separate index for `activo`. But if the text index is created BEFORE the soft-delete fields are added (i.e., if the schema definition order matters), the text index won't include `activo` as a compound key.

**Why it happens:** Index creation order in the schema definition. The plugin adds `activo` after `SchemaFactory.createForClass`, so any compound index including `activo + text` would need to be defined after `ContactoSchema.plugin(softDeletePlugin)`.

**How to avoid:** Define all `ContactoSchema.index(...)` calls AFTER `ContactoSchema.plugin(softDeletePlugin)`. The text-search index should be a standalone `{ nombre: 'text', documentacionFiscal: 'text' }` — do NOT compound it with `activo`.

**Warning signs:** Index not used; `explain()` shows `COLLSCAN` on text queries.

### Pitfall 2: Partial unique index on documentacionFiscal

**What goes wrong:** Simple `{ documentacionFiscal: 1, unique: true }` causes all `null` / empty-string values to conflict with each other (only one contacto can have no NIF).

**Why it happens:** MongoDB unique index treats all null values as colliding unless you use a sparse or partial index.

**How to avoid:** Use `{ unique: true, sparse: true }` OR `partialFilterExpression: { documentacionFiscal: { $exists: true, $ne: '' } }`. Prefer `sparse: true` for simplicity in the MVP.

**Warning signs:** `MongoServerError: E11000 duplicate key` on create when documentacionFiscal is null/empty.

### Pitfall 3: ObjectId coercion in findById

**What goes wrong:** `this.model.findOne({ _id: idString })` returns null even when the document exists.

**Why it happens:** Mongoose 9 does not auto-coerce strings to ObjectId in all paths (KEY DECISION from Phase 2 STATE.md: "Explicit Types.ObjectId in EsquemasRepository").

**How to avoid:** Always wrap string IDs: `new Types.ObjectId(id)` or use the `toObjectId()` helper used in EsquemasRepository.

**Warning signs:** findById returns null for valid IDs, or TypeScript throws on the ObjectId type mismatch.

### Pitfall 4: EsquemasService import — circular or missing module

**What goes wrong:** ContactosModule imports EsquemasModule to call EsquemasService. If EsquemasModule doesn't export EsquemasService, the DI container throws.

**Why it happens:** EsquemasModule must explicitly export `EsquemasService` (and `EsquemasRepository` if the seed uses it) — this is already done as of Phase 2 (`exports: [AuditoriaService, AuditInterceptor]` pattern from AuditoriaModule).

**How to avoid:** Confirm `EsquemasModule` exports `EsquemasService` (it does — check `esquemas.module.ts`). Import `EsquemasModule` in `ContactosModule` imports array.

**Warning signs:** NestJS DI exception: "Nest can't resolve dependencies of the ContactosService".

### Pitfall 5: Frontend — missing TanStack Query provider

**What goes wrong:** `useQuery` / `useMutation` hooks throw "No QueryClient set" at runtime.

**Why it happens:** The root layout doesn't have `<QueryClientProvider>` yet (only the auth flow is implemented in the current frontend).

**How to avoid:** Add `QueryClientProvider` to `apps/frontend/app/layout.tsx` (or a `(app)/layout.tsx` if one exists for protected routes) as part of Wave 0 of Plan 03-02.

**Warning signs:** React error at runtime: "No QueryClient set, use QueryClientProvider to set one".

### Pitfall 6: Dynamic parameter keys — schema validation

**What goes wrong:** The `parametros` field is `Record<string, unknown>` — no Zod validation on parameter key names. A user (or test) can send `{"mi campo con espacios": "val"}` which violates the naming rules in FUNCIONAL.md §5.2.

**Why it happens:** Zod `z.record(z.unknown())` doesn't validate key names by default.

**How to avoid:** In the Zod schema for CreateContactoDto, use `z.record(NombreParametroSchema, z.unknown())` where `NombreParametroSchema` is already defined in `packages/shared-validation/src/esquemas.ts`. Import and reuse it.

**Warning signs:** Parameter with invalid name saved successfully; later fails when used as template variable.

---

## Code Examples

### Contacto Zod Schema (shared-validation)

```typescript
// Source: packages/shared-validation/src/contactos.ts (to be created)
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

### E2E Test Setup Pattern (follow esquemas.e2e-spec.ts)

```typescript
// apps/backend/test/contactos/contactos.e2e-spec.ts
// Source pattern: apps/backend/test/esquemas/esquemas.e2e-spec.ts

describe('CONT-01..05 contactos', () => {
  let app: INestApplication;
  let contactoModel: Model<any>;
  let usuarioModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let bearerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new DomainExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    // seed user, seed esquema contacto, login → bearerToken
  });
  // ... tests
});
```

**Important:** The `esquema` for `tipoObjeto: 'contacto'` must be seeded in `beforeAll` (same as `expediente` in esquemas test), because `EsquemasService.addParametro` throws `NotFoundError` if the esquema record doesn't exist.

### Soft-delete in Action — Verify with e2e

```typescript
// Verify soft-delete in contactos e2e:
it('DELETE soft-deletes the contacto', async () => {
  // create, then delete
  const deleteRes = await request(app.getHttpServer())
    .delete(`/api/v1/contactos/${id}`)
    .set('Authorization', `Bearer ${bearerToken}`);
  expect(deleteRes.status).toBe(200); // or 204

  // list should not return deleted contacto
  const listRes = await request(app.getHttpServer())
    .get('/api/v1/contactos')
    .set('Authorization', `Bearer ${bearerToken}`);
  expect(listRes.body.items.find((c: any) => c._id === id)).toBeUndefined();
});
```

---

## Environment Availability

Step 2.6: This phase is code-only with no new external dependencies. All required runtime dependencies (MongoDB, NestJS, Mongoose, Node 22, pnpm) are already established in Phase 1-2. The frontend dependencies (TanStack Query, React Hook Form) need to be verified in `apps/frontend/package.json`.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| MongoDB | Backend persistence | Yes (docker-compose) | Phase 1 |
| softDeletePlugin | contacto schema | Yes (built Phase 2) | `apps/backend/src/common/plugins/` |
| EsquemasService | CONT-03 dynamic params | Yes (built Phase 2) | Exported from EsquemasModule |
| AuditInterceptor | Audit trail | Yes (built Phase 2) | Exported from AuditoriaModule |
| JwtAuthGuard | All endpoints | Yes (built Phase 2) | `apps/backend/src/modules/auth/guards/` |
| @tanstack/react-query | Frontend CONT-04 | VERIFY | Check `apps/frontend/package.json` |
| react-hook-form | Frontend forms | VERIFY | Check `apps/frontend/package.json` |
| @hookform/resolvers | Zod ↔ RHF bridge | VERIFY | Check `apps/frontend/package.json` |

**Missing dependencies with no fallback:**
- None that block backend plans.

**Missing dependencies with fallback:**
- If `@tanstack/react-query` / `react-hook-form` are missing → Wave 0 of Plan 03-02 installs them.

---

## Validation Architecture

Config check: `workflow.nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (backend unit: `*.spec.ts`) + Jest (backend e2e: `*.e2e-spec.ts`) + Vitest (frontend) |
| Unit config | `apps/backend/jest.config.ts` (testRegex: `.*\\.spec\\.ts$`) |
| E2E config | `apps/backend/jest.e2e.config.ts` (testRegex: `.*\\.e2e-spec\\.ts$`, setup: `test/setup-e2e.ts`) |
| Quick run command | `pnpm --filter backend test -- contactos` |
| E2E run command | `pnpm --filter backend test:e2e -- contactos` |
| Full suite | `pnpm --filter backend test && pnpm --filter backend test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | POST /contactos creates física/jurídica with base fields | e2e | `pnpm --filter backend test:e2e -- contactos` | No — Wave 0 |
| CONT-02 | tipologia field validated; invalid tipologia → 400 | e2e | same | No — Wave 0 |
| CONT-03 | POST with parametros.X → registers X in esquema contacto | e2e | same | No — Wave 0 |
| CONT-04 | GET /contactos?search=&tipologia=&page=&limit= returns paginated results | e2e | same | No — Wave 0 |
| CONT-05 | GET /contactos/:id returns section expedientesVinculados (empty array) | e2e | same | No — Wave 0 |
| All | softDeletePlugin: DELETE → activo=false; list excludes deleted | e2e | same | No — Wave 0 |
| All | No Bearer → 401 on all endpoints | e2e | same | No — Wave 0 |
| All | Unit: service calls EsquemasService.addParametro for new param keys | unit | `pnpm --filter backend test -- contactos.service` | No — Wave 0 |
| CONT-05 | Coverage ≥ 80% backend module | coverage | `pnpm --filter backend test -- --coverage` | N/A |

### Sampling Rate

- **Per task commit:** `pnpm --filter backend test:e2e -- contactos`
- **Per wave merge:** `pnpm --filter backend test && pnpm --filter backend test:e2e`
- **Phase gate:** Full suite green + coverage check before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/test/contactos/contactos.e2e-spec.ts` — covers CONT-01..05 + soft-delete + audit
- [ ] `apps/backend/src/modules/contactos/` directory and module files (scaffold)
- [ ] `packages/shared-validation/src/contactos.ts` — Zod schemas
- [ ] Verify `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers` in frontend package.json; install if missing

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mongoose global plugin | Per-schema plugin application | Phase 2 decision | Prevents accidental soft-delete on auditoria/esquemas |
| HTTP exceptions in service layer | DomainError hierarchy + ExceptionFilter | Phase 2 | Clean error propagation; HTTP codes centralized |
| Manual usuarioId in request body | JWT extraction via @CurrentUser | Phase 2 | Security: no user impersonation |
| ZodError leaking from handler | TipoObjetoSchema.parse() wrapped in try/catch → ValidationError | Phase 2 (esquemas) | Consistent error body shape |

**Deprecated/outdated for this project:**
- Using `throw new NotFoundException()` (NestJS built-in) in service layer: replaced by `throw new NotFoundError(resource, id)` from `common/errors`.
- Adding `{ activo: true }` manually to queries: the plugin handles this.

---

## Open Questions

1. **Frontend protected route layout**
   - What we know: `apps/frontend/app/(app)/` exists as the intended protected route group (per ARQUITECTURA.md §4.1), but only `(auth)/login/` has a page currently. No `(app)` layout file has been created.
   - What's unclear: Does a `(app)/layout.tsx` with auth guard + QueryClientProvider already exist, or does Plan 03-02 need to create it?
   - Recommendation: Plan 03-02 Wave 0 must create `(app)/layout.tsx` if it doesn't exist, adding auth redirect logic and QueryClientProvider.

2. **Text search on documentacionFiscal before Phase 8 encryption**
   - What we know: Phase 8 will encrypt `documentacionFiscal`. After encryption, `$text` search will not work on the ciphertext. SEC-02 specifies a `documentacionFiscalHash` for exact-match search.
   - What's unclear: Should the text index include `documentacionFiscal` now if it will break in Phase 8?
   - Recommendation: Include `documentacionFiscal` in the text index for Phase 3 (enables full search now). Document clearly that Phase 8 will drop this field from the text index and replace with `documentacionFiscalHash` for exact-only search. The text index will be modified in Phase 8 — this is an acceptable two-step approach.

3. **CONT-05 — expedientes vinculados query**
   - What we know: The backend endpoint for "expedientes of a contacto" queries `expedientes` by `contactos.contactoId` (DATOS.md §4.1 index: `{ "contactos.contactoId": 1, activo: 1 }`). However, the `expedientes` module does not exist yet (Phase 4).
   - What's unclear: Should Plan 03-01 expose a `/contactos/:id/expedientes` endpoint that returns `[]` as a stub, or leave CONT-05 as pure frontend UI only?
   - Recommendation: Implement `/contactos/:id/expedientes` as a stub returning `[]` (with a `// TODO Phase 4` comment). This matches the success criterion "section visible in UI (populated after Phase 4)" and gives Phase 4 a clear contract to implement.

---

## Sources

### Primary (HIGH confidence)

- `docs/FUNCIONAL.md` — Module 4.4 (F-050..F-055), FL-3, FL-13 Punto A — specification source for all contacto fields and flows
- `docs/DATOS.md` §4.2 — complete contactos collection schema, indexes, notes on referential integrity
- `docs/ARQUITECTURA.md` §5.2, §6.1, §17.3 — module pattern, pagination envelope, AES encryption deferral plan
- `apps/backend/src/common/plugins/soft-delete.plugin.ts` — verified softDeletePlugin implementation to apply
- `apps/backend/src/modules/esquemas/` — verified module pattern and EsquemasService API to reuse
- `apps/backend/src/modules/auditoria/` — verified AuditInterceptor and @Audited decorator contract
- `apps/backend/test/esquemas/esquemas.e2e-spec.ts` — verified e2e test setup pattern to follow
- `apps/backend/test/setup-e2e.ts` — verified MongoMemoryServer global setup

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` Key Decisions — "Explicit Types.ObjectId in EsquemasRepository", "TipoObjetoSchema.parse() in handler, not pipe" — established conventions to replicate
- `packages/shared-validation/src/esquemas.ts` — `NombreParametroSchema` for parameter key validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; patterns verified in codebase
- Architecture: HIGH — module structure directly cloned from established esquemas/auditoria patterns
- Pitfalls: HIGH — derived from DATOS.md constraints + Phase 2 key decisions documented in STATE.md
- Frontend patterns: MEDIUM — TanStack Query / RHF presence unverified (needs Wave 0 check)

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack; only stale risk is if NestJS/Mongoose minor versions change)
