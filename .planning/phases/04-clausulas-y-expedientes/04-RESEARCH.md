# Phase 4: Cláusulas y Expedientes — Research

**Researched:** 2026-05-23
**Domain:** NestJS + Mongoose CRUD modules (clausulas, expedientes) + Next.js 14 frontend pages
**Confidence:** HIGH (replicates well-established Phase 3 patterns; only two new mechanics — text index + embedded M:N — and both are explicitly prescribed by `docs/DATOS.md`)

---

## Summary

Phase 4 implementa **dos módulos de dominio nuevos** (`clausulas` y `expedientes`) más sus interfaces frontend. La fase es **largamente repetitiva** respecto a Phase 3 (contactos): el 80% del trabajo es replicar el patrón Schema + softDeletePlugin + Repository + Service + Controller con JwtAuthGuard + AuditInterceptor, DTOs Zod en `@lexscribe/shared-validation`, types en `@lexscribe/shared-types`, integración con `EsquemasService.addParametro` para parámetros dinámicos.

**Lo nuevo** (no visto en Phase 3) son:
1. **Índice text Mongoose** para búsqueda full-text en cláusulas (`{ nombre: 'text', texto: 'text' }`).
2. **Relación embebida M:N** `expedientes.contactos[]` con rol contextual + endpoints `link`/`unlink` que emiten eventos `expedientes.contactoLinked` / `expedientes.contactoUnlinked` consumidos por `AuditListener` (patrón `*.linked` / `*.unlinked` ya existe).
3. **Vista inversa**: completar el stub `expedientesVinculados: []` que dejó CONT-05 en `ContactosService.getById`, ahora poblado mediante query sobre `expedientes.contactos.contactoId`.
4. **Detalle expediente con pestañas** (Contactos / Parámetros / Documentos placeholder / Fechas placeholder / Facturación placeholder).

**Primary recommendation:** clonar `modules/contactos` → `modules/clausulas` y `modules/expedientes`, ajustar schemas según `DATOS.md §4.1` y `§4.4`, y exponer dos endpoints adicionales en `ExpedientesController` para link/unlink contacto. Todo el stack de plumbing (auth, audit, soft-delete, validation pipe, exception filter) ya funciona — no reinventar nada.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No existe CONTEXT.md en `04-clausulas-y-expedientes/`.** Esta fase no pasó por `/gsd:discuss-phase` previo a esta investigación, por lo que **no hay decisiones locked**. Todas las decisiones técnicas de detalle quedan a discreción del planner siempre que respeten:

- **CLAUDE.md** del proyecto (sección siguiente).
- **`docs/DATOS.md` y `docs/FUNCIONAL.md`** como fuente de verdad (`DATOS > ARQUITECTURA`, `FUNCIONAL > DATOS` cuando hay conflicto).
- **REQUIREMENTS.md** — los IDs CLAU-01..03 y EXPE-01..07 son la lista exhaustiva de outcomes observables que esta fase debe entregar.

Si durante el planning aparece una decisión funcional no resuelta (p. ej. "¿cascada al borrar contacto?"), debe registrarse como **pregunta abierta** en `docs/FUNCIONAL.md §8` antes de implementarse, no asumirse.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Fuente de verdad documental:** `docs/FUNCIONAL.md`, `docs/DATOS.md`, `docs/ARQUITECTURA.md`. Cualquier decisión que no quede en código debe quedar en uno de ellos. Conflictos: `FUNCIONAL > DATOS > ARQUITECTURA`. **El planner debe referenciar `F-040..F-046` (cláusulas) y `F-001..F-008` (expedientes) en commits/PRs y al ubicar tareas.**
- **DDD por bounded context** — un módulo por contexto (`clausulas/`, `expedientes/`). Cada uno con `schemas/`, `dto/`, `*.repository.ts`, `*.service.ts`, `*.controller.ts`, `*.module.ts`. Files <500 líneas.
- **Soft-delete plugin per-schema only** — nunca `mongoose.plugin()` global. `auditoria` y `esquemas` quedan excluidos por DATOS §4.8.
- **NUNCA aceptar `usuarioId` en body** — siempre desde `@CurrentUser('id')` (AUTH-04).
- **Validación en aplicación, NO en Mongo JSON Schema** (DATOS §2.7) — Zod en `@lexscribe/shared-validation` + `ZodValidationPipe` global.
- **Auditoría asíncrona** — toda mutación pasa por `AuditInterceptor` (decorador `@Audited('recurso','accion')`) o por eventos `*.linked / *.unlinked / *.generated` recogidos por `AuditListener`.
- **Convención campos en español + camelCase** (DATOS §2.2). Colecciones plural minúsculas.
- **Tests** — ≥80% cobertura módulo (Success Criteria 5 of Phase 3 era 80%; replicar). `npm run lint` y `npm run build` deben pasar antes de commit.
- **Sin transacciones distribuidas** (DATOS §2.6) — operaciones que cruzan colecciones (link contacto: validar existencia + actualizar expediente) se hacen en orden seguro con compensación.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CLAU-01** | Crear/editar/borrar cláusulas desde sección dedicada (F-040, F-041) | Sección "Standard Stack" + "Cláusulas schema" abajo |
| **CLAU-02** | Cláusula admite múltiples labels libres (F-045) | Schema `labels: [String]`, índice `{usuarioId,activo,labels}` |
| **CLAU-03** | Búsqueda y filtro por label (F-046) | Índice text + endpoint `?search=…&label=…` |
| **EXPE-01** | Crear expediente con nombre + fecha auto (F-001, F-002) | Schema `expedientes` con `timestamps:{createdAt:'fechaCreacion'}` |
| **EXPE-02** | Asociar/desasociar contactos con rol libre (F-004, F-018, F-026) | Endpoints `POST /:id/contactos` y `DELETE /:id/contactos/:contactoId/:rol` + eventos linked/unlinked |
| **EXPE-03** | Pareja `contacto+rol` única dentro de expediente; error legible si duplicado | Validación en `service.linkContacto` con `ConflictError` (mapea a 409) — no `unique` en sub-array (Mongo no lo soporta nativo) |
| **EXPE-04** | Parámetros personalizados de expediente (F-003, F-091) | Reutilizar `EsquemasService.addParametro(usuarioId,'expediente',{…})` — idéntico a contactos |
| **EXPE-05** | Listar/filtrar/buscar expedientes (F-007) | Búsqueda por nombre (regex) + paginación + filtro `contactoId` |
| **EXPE-06** | Vista unificada de fechas (F-006) | **Placeholder** — array vacío hasta Phase 7 (CAL-01) |
| **EXPE-07** | Alberga todos sus documentos (F-005) | **Placeholder** — array vacío hasta Phase 6 (DOC-01) |

EXPE-06 y EXPE-07 son **stubs informativos** en Phase 4 — la UI muestra "Sin documentos / Sin fechas" pero el contrato JSON ya devuelve los campos vacíos para evitar romper la UI cuando lleguen Phases 6 y 7.

---

## Standard Stack

### Core (ya instalado en el monorepo — verificado en Phase 3)

| Library | Version (lockfile) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| `@nestjs/mongoose` | 11.x | Decorador `@Schema`, `@Prop`, `SchemaFactory.createForClass`, `MongooseModule.forFeature` | Patrón usado en `contactos`, `esquemas`, `auditoria` |
| `mongoose` | 9.x | ODM, queries, índices, hooks, populate, aggregate | DATOS.md prescribe MongoDB + Mongoose |
| `nestjs-zod` | 5.x | `createZodDto` para inyectar validación Zod en pipes globales | Usado en contactos DTOs |
| `zod` | 3.23.x | Schemas en `@lexscribe/shared-validation` reutilizables cliente/servidor | ARQUITECTURA §2 |
| `@nestjs/event-emitter` | 3.x | `EventEmitter2.emit(...)` para eventos de dominio recogidos por `AuditListener` | Patrón usado en `AuthService` (auth.login/logout) |
| `@hookform/resolvers` | 3.10.0 | Bridge React Hook Form ↔ Zod (frontend) | **PINNED** — v5 importa `zod/v4/core` y rompe (STATE.md decision) |
| `@tanstack/react-query` + `@tanstack/query-core` | 5.x | Cache cliente, mutaciones | `query-core` debe listarse **explícitamente** en frontend dep — pnpm isolated no la hoista (STATE.md decision) |
| `react-hook-form` | 7.x | Formularios cláusula y expediente | Patrón Phase 3 |
| `tailwindcss` + `shadcn/ui` | 3.x | UI tabs en detalle expediente | Frontend stack |

No hay paquetes nuevos a instalar — toda la fase consume dependencias ya en el monorepo.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mongoose `$text` index para cláusulas | Atlas Search / regex `$regex` sobre `texto` | `$text` es nativo y gratuito en Mongo self-hosted, pero solo permite **un** índice text por colección. Si más adelante alguien quiere indexar también `labels`, deberá rediseñar. Atlas Search no aplica (NAS self-hosted). `$regex` es lento sobre `texto` largo. **Mantener `$text` por DATOS §4.4.** |
| Embedded `expedientes.contactos[]` (M:N) | Colección separada `expediente_contactos` | DATOS §5 prescribe embebido: "Pocas decenas como mucho; necesitamos rol contextual". Para ≤100 contactos por expediente la opción embebida es óptima (un solo doc, sin lookup). **Respetar la decisión documental.** |
| Validar unicidad `(contactoId, rol)` con índice Mongo | Validar en aplicación | Mongo **no admite** unique en sub-documentos de un array sin pipeline `$elemMatch` complejo. Más simple: validar en `service.linkContacto` lanzando `ConflictError`. DATOS §4.1 nota lo dice explícitamente. |

### Installation

```bash
# Nada que instalar — todas las deps ya están en el monorepo (verificable en pnpm-lock.yaml de Phase 3)
```

### Version verification

Toda dependencia relevante ya está pineada por el lockfile generado en Phase 1–3. No hay version drift — confiar en lockfile del repo.

---

## Architecture Patterns

### Recommended Project Structure (replica Phase 3 contactos)

```
apps/backend/src/modules/
├── clausulas/
│   ├── __tests__/
│   │   ├── clausulas.repository.spec.ts
│   │   ├── clausulas.service.spec.ts
│   │   └── clausulas.controller.spec.ts
│   ├── dto/
│   │   ├── create-clausula.dto.ts
│   │   ├── update-clausula.dto.ts
│   │   └── query-clausula.dto.ts
│   ├── schemas/
│   │   └── clausula.schema.ts
│   ├── clausulas.controller.ts
│   ├── clausulas.repository.ts
│   ├── clausulas.service.ts
│   └── clausulas.module.ts
└── expedientes/
    ├── __tests__/…
    ├── dto/
    │   ├── create-expediente.dto.ts
    │   ├── update-expediente.dto.ts
    │   ├── query-expediente.dto.ts
    │   └── link-contacto.dto.ts        # { contactoId, rol }
    ├── schemas/
    │   └── expediente.schema.ts
    ├── expedientes.controller.ts
    ├── expedientes.repository.ts
    ├── expedientes.service.ts
    └── expedientes.module.ts

packages/shared-validation/src/
├── clausulas.ts                         # CreateClausulaSchema, UpdateClausulaSchema, QueryClausulaSchema
├── expedientes.ts                       # CreateExpedienteSchema, UpdateExpedienteSchema, QueryExpedienteSchema, LinkContactoSchema
└── index.ts                             # re-export

packages/shared-types/src/
├── clausula.ts                          # Clausula, ClausulaListResponse
└── expediente.ts                        # Expediente, ExpedienteListResponse, ExpedienteDetailResponse, ContactoVinculado

apps/frontend/
├── app/(app)/clausulas/
│   ├── page.tsx                         # listado + filtro labels + búsqueda
│   ├── nuevo/page.tsx
│   └── [id]/page.tsx                    # editar
├── app/(app)/expedientes/
│   ├── page.tsx                         # listado + búsqueda
│   ├── nuevo/page.tsx
│   └── [id]/page.tsx                    # detalle con tabs
├── components/clausulas/
│   ├── ClausulaForm.tsx
│   ├── ClausulaList.tsx
│   └── LabelsInput.tsx
└── components/expedientes/
    ├── ExpedienteForm.tsx
    ├── ExpedienteList.tsx
    ├── ExpedienteTabs.tsx               # contenedor de tabs
    ├── ContactosVinculadosTab.tsx       # add/remove contacto con rol
    └── ParametrosTab.tsx                # reutilizar ParametrosEditor de Phase 3 si lo permite el shape
```

### Pattern 1: Cláusula schema (DATOS §4.4 verbatim)

**What:** Schema simple sin PII, con índice text + array `labels` para filtrado eficiente.
**When to use:** CLAU-01, CLAU-02, CLAU-03.
**Example:**

```typescript
// apps/backend/src/modules/clausulas/schemas/clausula.schema.ts
// Source: docs/DATOS.md §4.4
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

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ required: true, type: String })
  texto!: string;

  @Prop({ type: [String], default: [] })
  labels!: string[];
}

export const ClausulaSchema = SchemaFactory.createForClass(Clausula);
ClausulaSchema.plugin(softDeletePlugin);

// Filtrado por label + soft-delete + propietario (DATOS §4.4)
ClausulaSchema.index({ usuarioId: 1, activo: 1, labels: 1 });

// Full-text search nombre/texto (DATOS §4.4)
// Mongoose 9 syntax: usar `weights` opcional si se prioriza nombre sobre texto.
ClausulaSchema.index(
  { nombre: 'text', texto: 'text' },
  { weights: { nombre: 5, texto: 1 }, name: 'clausula_text_idx' },
);
```

**Búsqueda en repository:**

```typescript
// Si `opts.search` viene presente, usar $text; si no, queries normales.
const filter: Record<string, unknown> = {
  usuarioId: this.toObjectId(usuarioId),
};
if (opts.label) filter.labels = opts.label;
if (opts.search) {
  // $text es case/diacritic-insensitive por defecto en Mongoose 9
  filter.$text = { $search: opts.search };
}
const items = await this.model
  .find(filter, opts.search ? { score: { $meta: 'textScore' } } : undefined)
  .sort(opts.search ? { score: { $meta: 'textScore' } } : { fechaCreacion: -1 })
  .skip(...).limit(...);
```

### Pattern 2: Expediente schema con array embebido `contactos[]`

```typescript
// apps/backend/src/modules/expedientes/schemas/expediente.schema.ts
// Source: docs/DATOS.md §4.1
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

@Schema({ _id: false })
export class ContactoVinculado {
  @Prop({ type: Types.ObjectId, ref: 'Contacto', required: true })
  contactoId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  rol!: string;
}
export const ContactoVinculadoSchema = SchemaFactory.createForClass(ContactoVinculado);

@Schema({
  collection: 'expedientes',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Expediente {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ type: [ContactoVinculadoSchema], default: [] })
  contactos!: ContactoVinculado[];

  @Prop({ type: Object, default: {} })
  parametros!: Record<string, unknown>;
}

export const ExpedienteSchema = SchemaFactory.createForClass(Expediente);
ExpedienteSchema.plugin(softDeletePlugin);

// DATOS §4.1
ExpedienteSchema.index({ nombre: 'text' }, { name: 'expediente_text_idx' });
ExpedienteSchema.index({ 'contactos.contactoId': 1, activo: 1 });
ExpedienteSchema.index({ usuarioId: 1, activo: 1, fechaCreacion: -1 });
```

### Pattern 3: Link/Unlink contacto a expediente

**What:** Operación que añade `{contactoId, rol}` al array `contactos[]` validando unicidad y existencia del contacto, emitiendo evento auditable.
**When to use:** EXPE-02, EXPE-03.

```typescript
// expedientes.service.ts
async linkContacto(usuarioId: string, expedienteId: string, dto: LinkContactoInput) {
  // 1. Verificar que el contacto existe y pertenece al usuario (sin transacción — DATOS §2.6)
  const contacto = await this.contactosRepo.findById(usuarioId, dto.contactoId);
  if (!contacto) throw new NotFoundError('contacto', dto.contactoId);

  // 2. Verificar unicidad (contactoId, rol) en aplicación (EXPE-03)
  const expediente = await this.repo.findById(usuarioId, expedienteId);
  if (!expediente) throw new NotFoundError('expediente', expedienteId);
  const duplicate = expediente.contactos.some(
    (c) => c.contactoId.toString() === dto.contactoId && c.rol === dto.rol,
  );
  if (duplicate) {
    throw new ConflictError(
      `Contacto ya vinculado con rol "${dto.rol}" a este expediente`,
    );
  }

  // 3. $push idempotente (la unicidad ya está validada arriba)
  const updated = await this.repo.pushContacto(usuarioId, expedienteId, {
    contactoId: this.toObjectId(dto.contactoId),
    rol: dto.rol,
  });

  // 4. Emitir evento para AuditListener (patrón ya existente '*.linked')
  this.eventEmitter.emit('expedientes.contactoLinked', {
    usuarioId,
    recurso: 'expediente',
    recursoId: expedienteId,
    contexto: { contactoId: dto.contactoId, rol: dto.rol },
  } satisfies AuditEventPayload);

  return updated;
}

async unlinkContacto(usuarioId: string, expedienteId: string, contactoId: string, rol: string) {
  const updated = await this.repo.pullContacto(usuarioId, expedienteId, contactoId, rol);
  if (!updated) throw new NotFoundError('vinculo contacto-expediente', `${contactoId}/${rol}`);
  this.eventEmitter.emit('expedientes.contactoUnlinked', {
    usuarioId, recurso: 'expediente', recursoId: expedienteId,
    contexto: { contactoId, rol },
  });
  return updated;
}
```

Repository:

```typescript
pushContacto(usuarioId, expedienteId, vinculo) {
  return this.model.findOneAndUpdate(
    { _id: toObjectId(expedienteId), usuarioId: toObjectId(usuarioId) },
    { $push: { contactos: vinculo } },
    { returnDocument: 'after' },
  ).exec();
}

pullContacto(usuarioId, expedienteId, contactoId, rol) {
  return this.model.findOneAndUpdate(
    { _id: toObjectId(expedienteId), usuarioId: toObjectId(usuarioId) },
    { $pull: { contactos: { contactoId: toObjectId(contactoId), rol } } },
    { returnDocument: 'after' },
  ).exec();
}
```

### Pattern 4: Completar CONT-05 stub en ContactosService

Phase 3 dejó `expedientesVinculados: []` hardcoded en `ContactosService.getById` (línea 30 del archivo, con comentario "stub vacío hasta Phase 4"). En Phase 4 hay que **modificar ese servicio** (no crear duplicado) para inyectar `ExpedientesRepository` y devolver la lista real:

```typescript
// contactos.service.ts (modificación)
constructor(
  private readonly repo: ContactosRepository,
  private readonly esquemasService: EsquemasService,
  private readonly expedientesRepo: ExpedientesRepository,  // NEW
) {}

async getById(usuarioId: string, id: string) {
  const contacto = await this.repo.findById(usuarioId, id);
  if (!contacto) throw new NotFoundError('contacto', id);
  // CONT-05 / F-054: lookup expedientes donde aparece este contacto
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

**Cuidado con dependencia circular:** `ContactosModule` ya importa `EsquemasModule` y `AuditoriaModule`. Ahora necesita `ExpedientesModule` y `ExpedientesModule` necesita `ContactosModule` (para validar existencia de contacto en `linkContacto`). **Solución:** usar `forwardRef(() => ExpedientesModule)` en `ContactosModule` y exportar `ExpedientesRepository` para que sea inyectable cross-module. O — más limpio — extraer `ContactosRepository` como `exports:[]` (ya lo hace según `contactos.module.ts:20`) y consumirlo desde `ExpedientesModule` sin import circular en sentido inverso, lo cual evita el `forwardRef`.

**Recomendación:** `ExpedientesModule` importa `ContactosModule` (para inyectar `ContactosRepository`); `ContactosModule` importa `ExpedientesModule` con `forwardRef`. Probar Nest: si falla el bootstrap por circular DI, plan B es mover el método `findByContactoId` a un servicio compartido pequeño.

### Anti-Patterns to Avoid

- **No crear `expediente_contactos` como colección separada** — DATOS §5 lo descarta explícitamente.
- **No intentar `unique:true` en `contactos.contactoId`+`contactos.rol`** — Mongo no soporta unique en sub-array sin acrobacias. La validación es en aplicación.
- **No usar `setOnInsert` ni transacciones para link/unlink** — el patrón es secuencial: validar contacto → validar duplicado → $push.
- **No emitir el evento `*.linked` ANTES de que la BD confirme** — solo después de un `findOneAndUpdate` que devuelve doc no-null.
- **No populate `contactos.contactoId` por defecto** en `findAll` de expedientes — multiplica queries. Sólo en detalle si la UI lo pide.
- **No exponer `usuarioId` en DTOs** — viene del JWT.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Búsqueda full-text en cláusulas | Tokenizer + scoring manual sobre `texto` | Índice `$text` de Mongo (DATOS §4.4) | Gratis, indexado, case/diacritic-insensitive |
| Auditoría de link/unlink contacto | Llamar a `AuditoriaService.writeAsync` directo en cada handler | `eventEmitter.emit('expedientes.contactoLinked', payload)` — `AuditListener` ya escucha `*.linked` | Patrón establecido (STATE.md), evita acoplar módulos a auditoría |
| Soft-delete en clausulas y expedientes | Repetir lógica `activo:true` en queries | `softDeletePlugin` ya existe en `common/plugins/` | Plugin probado, query interceptor automático |
| Validación de tipos en parámetros dinámicos | Validar string/number/date a mano en service | `EsquemasService.addParametro` ya hace `$addToSet` idempotente y devuelve `ConflictError` si el tipo cambia | Lógica ya implementada y testeada en Phase 2-3 |
| Manejo de errores HTTP | Lanzar `HttpException` con código a mano | Lanzar `NotFoundError`/`ConflictError`/`ValidationError` — `DomainExceptionFilter` global los mapea | Ya configurado en Phase 2 |
| DTO + validación cliente/servidor | Definir interfaces TS y class-validator separados | Zod schema en `@lexscribe/shared-validation` + `createZodDto` en backend + `zodResolver` en frontend | Patrón Phase 3, una sola fuente de verdad |

**Key insight:** Phase 4 es casi 100% _composición_ de mecanismos ya construidos en Phases 2-3. Resistir la tentación de "mejorar" patrones existentes.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Esquemas dinámicos**: existe entrada `tipoObjeto:"expediente"` creada por `pnpm seed` en Phase 2-04 (verificar antes de empezar). Cláusulas y expedientes son colecciones **nuevas** — no hay datos legacy. | Verificar idempotencia del seed antes de la fase: `db.esquemas.find({tipoObjeto:'expediente'})` debe devolver un doc con `parametros: []`. Si no existe, ejecutar `pnpm seed`. |
| Live service config | None — no hay servicios externos (Datadog, Cloudflare, n8n) que tengan strings de "clausulas" o "expedientes". | None |
| OS-registered state | None — sin tareas scheduled, sin pm2, sin systemd referenciando estos nombres | None |
| Secrets/env vars | None — no se introducen secrets nuevos. JWT_SECRET, PII_ENCRYPTION_KEY, MONGO_URI ya existen | None |
| Build artifacts | `apps/backend/dist/` y `apps/frontend/.next/` se regeneran. **`packages/shared-validation` y `packages/shared-types` deben recompilarse** tras añadir `clausulas.ts` y `expedientes.ts` para que backend (CJS) los resuelva — patrón documentado en ARQUITECTURA §3.1. | El planner debe incluir `pnpm --filter @lexscribe/shared-validation build` y `…/shared-types build` como step previo a arrancar el backend |

**El canonical question:** *Después de cada commit, ¿qué estado runtime persiste?* → solo la colección `esquemas` (que ya tiene el doc `expediente` desde seed). Los datos de cláusulas y expedientes se crean al uso normal y son volátiles.

---

## Common Pitfalls

### Pitfall 1: Índice `$text` requiere `$search` syntax — no es regex

**What goes wrong:** Devs intentan `find({ texto: { $text: '...' } })` o mezclan `$text` con `$regex` en el mismo query → silently devuelve resultados raros o 0.
**Why it happens:** `$text` es operador a nivel **query top-level**, no a nivel campo.
**How to avoid:** `find({ $text: { $search: 'término' }, usuarioId, activo:true })`. Combinar con otros filtros funciona siempre que `$text` viva en el root del filter.
**Warning signs:** Tests devolviendo arrays vacíos para queries que sí deberían matchear.

### Pitfall 2: Unicidad `(contactoId, rol)` en sub-array — Mongo no la fuerza nativa

**What goes wrong:** Dev crea `ExpedienteSchema.index({'contactos.contactoId':1, 'contactos.rol':1}, {unique:true})` — el índice se crea pero no impide duplicados dentro del mismo doc (sólo entre docs distintos).
**Why it happens:** El `unique` en arrays de Mongo aplica al **par documento+entrada**, no a entradas del mismo doc.
**How to avoid:** Validar en `service.linkContacto` con `expediente.contactos.some(...)` y lanzar `ConflictError`. Test e2e: intentar linkar contacto+rol duplicado → 409 con mensaje legible.
**Warning signs:** Duplicados aparecen en producción a pesar de tener el "unique index".

### Pitfall 3: Soft-delete cascade ambiguo al borrar contacto

**What goes wrong:** Usuario borra (soft-delete) un contacto que está vinculado a 3 expedientes. ¿Los vínculos quedan apuntando a un contacto inactivo? ¿La UI los muestra?
**Why it happens:** DATOS no especifica el comportamiento; FUNCIONAL §F-053 dice "Un contacto puede estar presente en múltiples expedientes" pero no cubre el flujo de borrado.
**How to avoid:** **Decisión a registrar en FUNCIONAL.md §8 (preguntas abiertas)** antes de implementar. Recomendación: **no cascadear** — el vínculo persiste y la UI muestra el contacto con badge "inactivo" (consistente con el principio de soft-delete: la información histórica se preserva). Implementar: cuando `ExpedientesService.list` hace populate/lookup de contactos, hacerlo con `{withInactive:true}` para que aparezcan los inactivos también, marcando `activo:false` en la respuesta.
**Warning signs:** Tests donde borrar contacto rompe la vista de expediente.

### Pitfall 4: Dependencia circular ContactosModule ↔ ExpedientesModule

**What goes wrong:** `ExpedientesModule` importa `ContactosModule` (para validar contacto existe en link), `ContactosModule` importa `ExpedientesModule` (para resolver CONT-05). Nest falla al bootstrap con "Circular dependency".
**Why it happens:** Ambos módulos exportan repositories que el otro consume.
**How to avoid:** Usar `forwardRef(() => OtroModulo)` en al menos un lado. Verificar con test e2e que el server arranca correctamente. Más limpio: convertir `ContactosService.getById` en un decorator/hook que se llama desde una capa más alta (controller), pero esto rompe simetría con Phase 3.
**Warning signs:** Backend no arranca; error críptico tipo "Nest can't resolve dependencies of …".

### Pitfall 5: Evento `*.linked` no se audita si el wildcard no incluye el namespace

**What goes wrong:** Dev emite `eventEmitter.emit('expediente.contactoLinked', ...)` (singular) en lugar de `'expedientes.contactoLinked'`. El listener `*.linked` recoge ambos (el `*` matchea cualquier prefijo terminado en `.linked`).
**Why it happens:** El listener usa `*.linked` no `*.linked*`. Cualquier evento que termine en `.linked` se captura.
**Verificación:** STATE.md confirma listener es `@OnEvent('*.linked', { async: true })`. El nombre del evento solo tiene que terminar exactamente en `.linked` (no `.contactoLinked`).
**How to avoid:** Emitir como **dos eventos** o, mejor, **renombrar al estándar** `'expedientes.linked'` con `contexto:{contactoId, rol}`. Esto es lo que hace el resto del sistema y lo que captura el listener.
**Warning signs:** No aparecen registros en `auditoria` tras link de contacto en tests e2e.

### Pitfall 6: Re-build de packages compartidos olvidado

**What goes wrong:** Dev añade `clausulas.ts` a `packages/shared-validation/src/`, corre el backend, falla con "Cannot find module … CreateClausulaSchema".
**Why it happens:** ARQUITECTURA §3.1 — los packages se consumen desde `dist/` (CJS), no de TS source.
**How to avoid:** Plan debe incluir `pnpm --filter @lexscribe/shared-validation build` (y idem types) tras editar fuentes. Idealmente automatizar via `pnpm dev` que lanza `tsc -w` en los packages.
**Warning signs:** Builds CI verdes (porque CI compila todo) pero local rompe.

### Pitfall 7: `withInactive` escape hatch al popular contactos en expediente

**What goes wrong:** El detalle de expediente muestra contactos vinculados haciendo `populate('contactos.contactoId')` — pero Mongoose ejecuta una query `findOne` sobre `contactos` y el `softDeletePlugin` filtra `activo:true` por defecto, **excluyendo silenciosamente** contactos borrados (que sí deberían mostrarse para preservar historia, Pitfall 3).
**Why it happens:** El plugin pre-hooks aplican a queries de populate también.
**How to avoid:** Si se elige no cascadear (recomendación Pitfall 3), usar `populate({path:'contactos.contactoId', options:{withInactive:true}})` o reemplazar populate por aggregate con `$lookup` controlado.

---

## Code Examples

### Listar expedientes vinculados a un contacto (CONT-05 / F-054)

```typescript
// expedientes.repository.ts
async findByContactoId(usuarioId: string, contactoId: string): Promise<ExpedienteDocument[]> {
  return this.model.find({
    usuarioId: this.toObjectId(usuarioId),
    'contactos.contactoId': this.toObjectId(contactoId),
  }).exec();
  // softDeletePlugin inyecta automáticamente activo:true
}
```

### Endpoint controller — link/unlink

```typescript
// expedientes.controller.ts
@Post(':id/contactos')
@Audited('expediente', 'link')        // backup audit por si el evento falla
linkContacto(
  @CurrentUser('id') uid: string,
  @Param('id', MongoIdPipe) id: string,
  @Body() dto: LinkContactoDto,
) {
  return this.service.linkContacto(uid, id, dto);
}

@Delete(':id/contactos/:contactoId/:rol')
@Audited('expediente', 'unlink')
unlinkContacto(
  @CurrentUser('id') uid: string,
  @Param('id', MongoIdPipe) id: string,
  @Param('contactoId', MongoIdPipe) contactoId: string,
  @Param('rol') rol: string,
) {
  return this.service.unlinkContacto(uid, id, contactoId, rol);
}
```

**Nota:** el `rol` como path param admite "cliente", "vendedor"… que son strings cortos seguros. Si quisiéramos permitir roles con caracteres especiales/espacios, mejor pasarlo como query `?rol=...` o body en DELETE (Nest 11 soporta body en DELETE).

### Zod schemas

```typescript
// packages/shared-validation/src/clausulas.ts
import { z } from 'zod';

export const CreateClausulaSchema = z.object({
  nombre: z.string().min(1),
  texto: z.string().min(1),
  labels: z.array(z.string().min(1)).default([]),
}).strict();

export const UpdateClausulaSchema = CreateClausulaSchema.partial().strict();

export const QueryClausulaSchema = z.object({
  search: z.string().optional(),
  label: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export type CreateClausulaInput = z.infer<typeof CreateClausulaSchema>;
export type UpdateClausulaInput = z.infer<typeof UpdateClausulaSchema>;
export type QueryClausulaInput = z.infer<typeof QueryClausulaSchema>;
```

```typescript
// packages/shared-validation/src/expedientes.ts
import { z } from 'zod';
import { NombreParametroSchema } from './esquemas';

export const RolSchema = z.string().min(1).max(60);   // rol libre, límite razonable
export const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

export const CreateExpedienteSchema = z.object({
  nombre: z.string().min(1),
  parametros: z.record(NombreParametroSchema, z.unknown()).optional().default({}),
}).strict();

export const UpdateExpedienteSchema = CreateExpedienteSchema.partial().strict();

export const QueryExpedienteSchema = z.object({
  search: z.string().optional(),
  contactoId: ObjectIdSchema.optional(),       // EXPE-05 filtro
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const LinkContactoSchema = z.object({
  contactoId: ObjectIdSchema,
  rol: RolSchema,
}).strict();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `{new:true}` en findOneAndUpdate | `returnDocument:'after'` | Mongoose 9 (Phase 3 STATE.md) | Aplicar en repositories nuevos |
| `FilterQuery<T>` type | `Record<string,unknown>` o `QueryFilter<T>` | Mongoose 9 | Replicar pattern Phase 3 |
| `useNewUrlParser` etc | Eliminados | Mongoose 9 default | N/A para esta fase |
| HttpException directa | `DomainError` subclases + filter global | Phase 2-02 | Usar `NotFoundError` / `ConflictError` siempre |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend | ✓ | 20.x (Phase 1) | — |
| pnpm | Workspaces | ✓ | 9.x | — |
| MongoDB | Persistencia | ✓ | 7+ (docker-compose) | — |
| MongoMemoryServer | Tests e2e | ✓ (instalado Phase 2) | — | — |
| Jest | Tests backend | ✓ | 29.x | — |
| Vitest | Tests frontend | ✓ | 1.x | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

Fase 100% code/config — no introduce dependencias nuevas.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework backend | Jest 29 + Supertest |
| Framework frontend | Vitest 1 + Testing Library |
| Config file backend | `apps/backend/jest.config.ts` (unit, *.spec.ts), `apps/backend/test/jest-e2e.config.ts` (e2e con MongoMemoryServer) |
| Quick run command | `pnpm --filter @lexscribe/backend test` (unit, <30s) |
| Full suite command | `pnpm --filter @lexscribe/backend test && pnpm --filter @lexscribe/backend test:e2e && pnpm --filter @lexscribe/frontend test` |
| Coverage threshold | `coverageThreshold` global ≥80% line + 80% function (Phase 3 jest.config.ts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CLAU-01 | Crear cláusula con texto y nombre | unit (service) | `jest clausulas.service.spec.ts -t "create"` | ❌ Wave 0 |
| CLAU-01 | PATCH cláusula actualiza campos | unit (repo) | `jest clausulas.repository.spec.ts -t "update"` | ❌ Wave 0 |
| CLAU-01 | DELETE cláusula → soft-delete | unit (repo) | `jest clausulas.repository.spec.ts -t "softDelete"` | ❌ Wave 0 |
| CLAU-02 | Cláusula admite múltiples labels | unit (service) | `jest clausulas.service.spec.ts -t "labels array"` | ❌ Wave 0 |
| CLAU-03 | Búsqueda full-text usa $text | integration (e2e) | `jest --config jest-e2e clausulas -t "search"` | ❌ Wave 0 |
| CLAU-03 | Filtro por label devuelve subset | integration | `jest --config jest-e2e clausulas -t "label filter"` | ❌ Wave 0 |
| EXPE-01 | POST /expedientes crea con fecha auto | integration | `jest --config jest-e2e expedientes -t "create"` | ❌ Wave 0 |
| EXPE-02 | POST /:id/contactos vincula | integration | `jest --config jest-e2e expedientes -t "link contacto"` | ❌ Wave 0 |
| EXPE-02 | DELETE /:id/contactos/:cId/:rol desvincula | integration | `jest --config jest-e2e expedientes -t "unlink contacto"` | ❌ Wave 0 |
| EXPE-03 | Duplicar (contactoId,rol) → 409 con mensaje | integration | `jest --config jest-e2e expedientes -t "duplicate link"` | ❌ Wave 0 |
| EXPE-04 | Crear con parametros registra esquema | integration | `jest --config jest-e2e expedientes -t "parametros"` | ❌ Wave 0 |
| EXPE-05 | GET /expedientes con search filtra | integration | `jest --config jest-e2e expedientes -t "list search"` | ❌ Wave 0 |
| EXPE-06 | Detalle devuelve `fechas:[]` placeholder | unit | `jest expedientes.service.spec.ts -t "detail placeholders"` | ❌ Wave 0 |
| EXPE-07 | Detalle devuelve `documentos:[]` placeholder | unit | `jest expedientes.service.spec.ts -t "detail placeholders"` | ❌ Wave 0 |
| CONT-05 (re-test) | GET /contactos/:id devuelve expedientesVinculados real | integration | `jest --config jest-e2e contactos -t "expedientes vinculados"` | ✅ existe stub, ampliar |
| Audit | Linkar emite `expedientes.linked` + escribe auditoría | integration | `jest --config jest-e2e expedientes -t "audit link"` | ❌ Wave 0 |
| Frontend | Form crear cláusula con labels | unit (Vitest) | `vitest run clausulas/ClausulaForm` | ❌ Wave 0 |
| Frontend | Form crear expediente con parámetros | unit | `vitest run expedientes/ExpedienteForm` | ❌ Wave 0 |
| Frontend | Tab Contactos del detalle expediente | unit | `vitest run expedientes/ContactosVinculadosTab` | ❌ Wave 0 |
| Frontend | Búsqueda full-text con debounce | unit | `vitest run clausulas/ClausulaList -t "search debounce"` | ❌ Wave 0 |

**Cobertura mínima esperada:** ≥80% line + 80% function en `apps/backend/src/modules/clausulas/` y `apps/backend/src/modules/expedientes/`, replicando Phase 3 (lograron 87.31% line, 96.15% function).

### Sampling Rate
- **Per task commit:** `pnpm --filter @lexscribe/backend test --findRelatedTests <archivos modificados>` (lint + unit del módulo afectado, <15s).
- **Per wave merge:** `pnpm --filter @lexscribe/backend test && pnpm --filter @lexscribe/backend test:e2e -- --testPathPattern="(clausulas|expedientes|contactos)"`.
- **Phase gate:** Full suite verde (backend unit + backend e2e + frontend unit) antes de `/gsd:verify-work` y antes de marcar `Phase 04 Complete` en STATE.md.

### Casos edge a cubrir explícitamente

- **Cláusula sin labels** (`labels: []`) — listable, editable, NO aparece al filtrar por ningún label.
- **Cláusula con labels mixtos** (`["garantia","Compraventa"]`) — el filtro `?label=garantia` debe ser case-sensitive (decisión a registrar) o case-insensitive (más útil — recomendado, usar `$regex /^garantia$/i` o normalizar a lowercase al guardar).
- **Expediente sin contactos** — listable, detalle devuelve `contactos: []`.
- **Expediente sin parámetros** — listable, detalle devuelve `parametros: {}`.
- **Parámetros con tipos mixtos** (número en una instancia, string en otra del mismo nombre) → `EsquemasService.addParametro` ya lanza `ConflictError` (probado en Phase 3 unit tests). Replicar test para tipo `expediente`.
- **Link con `rol` con tilde / espacio** — decisión: ¿se permite "Cliente Principal"? Recomendado: sí, pero el path param debe encodearse en frontend.
- **Concurrent link** del mismo contacto+rol desde dos clientes → segundo recibe 409 (test con `Promise.all`).
- **Search query vacío o muy corto** (<2 chars) → 400 ó 200 con todos los resultados (decisión: bypassar `$text` si `search.length < 2`).

### Wave 0 Gaps
- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts` — Wave 0 backend
- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts` — Wave 0 backend
- [ ] `apps/backend/src/modules/clausulas/__tests__/clausulas.controller.spec.ts` — Wave 0 backend
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.repository.spec.ts` — Wave 0 backend
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` — Wave 0 backend
- [ ] `apps/backend/src/modules/expedientes/__tests__/expedientes.controller.spec.ts` — Wave 0 backend
- [ ] `apps/backend/test/clausulas/clausulas.e2e-spec.ts` — Wave 0 e2e
- [ ] `apps/backend/test/expedientes/expedientes.e2e-spec.ts` — Wave 0 e2e
- [ ] `apps/frontend/__tests__/clausulas/*.test.tsx` — Wave 0 frontend
- [ ] `apps/frontend/__tests__/expedientes/*.test.tsx` — Wave 0 frontend
- [ ] Compilación previa `packages/shared-validation` y `packages/shared-types` antes de cualquier test (`pnpm -r build` o filter granular).

---

## Suggested Wave Structure

Replica la estructura de Phase 3 (4 plans según ROADMAP.md):

| Wave / Plan | Scope | Outputs | Depends on |
|-------------|-------|---------|------------|
| **04-01 backend-clausulas** | Schema + Repo + Service + Controller + Module + DTOs + Zod schemas en `@lexscribe/shared-validation` + unit tests + e2e CLAU-01..03 | Módulo cláusulas operativo, ≥80% cobertura | — (independiente de expedientes) |
| **04-02 backend-expedientes** | Schema + Repo + Service + Controller + Module + DTOs + Zod schemas + endpoints link/unlink + eventos audit + completar CONT-05 stub + tests unit + e2e EXPE-01..07 | Módulo expedientes operativo, CONT-05 cerrado | 04-01 puede ir en paralelo |
| **04-03 frontend-clausulas-y-expedientes** | Páginas Next.js para ambos módulos: `(app)/clausulas`, `(app)/expedientes` con listado, formularios, detalle con tabs, búsqueda con debounce, label filter | UAT scenarios definidos y aprobados | 04-01 + 04-02 (endpoints disponibles) |
| **04-04 tests-cobertura-final** | Completar coverage gaps ≥80%, edge cases, integración audit, fix lint, verificar build verde | Phase 4 Success Criteria satisfechos | 04-01 + 04-02 + 04-03 |

**Variante alternativa (más paralela):** 04-01 y 04-02 en wave A simultáneos, 04-03 en wave B, 04-04 en wave C. Adoptar lo que el planner crea más eficiente para la carga del swarm — la fase no tiene dependencias rígidas internas salvo 04-03 → necesita endpoints de 04-01 y 04-02.

---

## Open Questions

1. **Cascade de soft-delete contacto → vínculos en expedientes**
   - What we know: DATOS §2.3 dice que las queries por defecto filtran `activo:true`. FUNCIONAL no especifica el comportamiento del vínculo cuando el contacto se inactiva.
   - What's unclear: ¿La UI del expediente debe seguir mostrando el contacto inactivo con badge "borrado"? ¿O debe ocultar el vínculo?
   - Recommendation: **Registrar en `docs/FUNCIONAL.md §8` como pregunta abierta** y proponer: vínculo persiste, UI muestra contacto inactivo con visual diferenciado (preserva historia + es consistente con el principio de soft-delete). Si el usuario confirma, implementar `populate({withInactive:true})` en detalle expediente.

2. **Búsqueda de labels: case-sensitive o no**
   - What we know: `labels: [String]` sin normalización.
   - What's unclear: ¿`?label=Garantia` y `?label=garantia` deben dar el mismo resultado?
   - Recommendation: normalizar a lowercase al persistir (`pre('save')` hook) y filtrar también en lowercase. Documentar en plan 04-01.

3. **`rol` con caracteres especiales en path param**
   - What we know: rol es texto libre.
   - What's unclear: ¿Aceptamos "Cliente Principal" (con espacio) en `DELETE /:id/contactos/:contactoId/:rol`?
   - Recommendation: aceptar; frontend hace `encodeURIComponent(rol)`. Tests deben cubrirlo.

4. **Longitud máxima de `texto` en cláusula**
   - What we know: no hay límite definido en DATOS.
   - What's unclear: ¿Permitir cláusulas de >100KB?
   - Recommendation: Zod `.max(50_000)` razonable, registrar en FUNCIONAL §8 si surge feedback.

5. **¿Persistir `fechaCreacion` manualmente o vía timestamps?**
   - What we know: Phase 3 usa `timestamps:{createdAt:'fechaCreacion',updatedAt:'fechaActualizacion'}`. F-002 requiere fecha auto.
   - Recommendation: replicar — el patrón Phase 3 ya cumple F-002.

---

## Sources

### Primary (HIGH confidence)
- `docs/DATOS.md §4.1 (expedientes), §4.4 (clausulas), §5 (relaciones)` — modelo de datos canónico
- `docs/FUNCIONAL.md §F-001..F-008, §F-040..F-046, §F-053, §F-054, §FL-4, §FL-5, §FL-12` — comportamiento de usuario
- `docs/ARQUITECTURA.md §2 (stack), §3.1 (compilación packages), §9 (auth), §18 (auditoría)` — restricciones de stack
- `.planning/STATE.md` — decisiones técnicas Phase 2 + Phase 3 (returnDocument:'after', forwardRef circular DI, jest config, etc.)
- `apps/backend/src/modules/contactos/*` — pattern de referencia
- `apps/backend/src/modules/esquemas/esquemas.service.ts` — `addParametro` API
- `apps/backend/src/modules/auditoria/listeners/audit.listener.ts` — wildcard `*.linked` `*.unlinked` confirmed
- `apps/backend/src/common/plugins/soft-delete.plugin.ts` — softDeletePlugin spec

### Secondary (MEDIUM confidence)
- Mongoose 9 release notes — confirmación de `returnDocument:'after'` y deprecación de `{new:true}` (verificado por uso en Phase 3 ya green)
- `@nestjs/event-emitter` 3.x — wildcards `*.linked` requieren `EventEmitterModule.forRoot({ wildcard: true })` (verificar en `app.module.ts`)

### Tertiary (LOW confidence)
- Ninguna. Toda decisión técnica de la fase está respaldada por código existente, docs internos o STATE.md.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas las deps ya en uso en Phase 3, sin novedades
- Architecture: HIGH — replica patrón existente, dos mecanismos nuevos (text index + array embebido M:N) prescritos explícitamente por DATOS
- Pitfalls: HIGH — los 7 pitfalls vienen de la experiencia Phase 2-3 (eventos, soft-delete, packages compartidos, circular DI) ya documentada en STATE.md
- Validation: HIGH — replica jest.config.ts de Phase 3 con coverageThreshold 80%

**Research date:** 2026-05-23
**Valid until:** 2026-06-22 (30 días — fase estable, sin dependencias externas en movimiento)

**Verdict:** Phase 4 es **bajo riesgo, alta repetitividad**. Recomendación al planner: estructurar 4 plans (uno backend cláusulas, uno backend expedientes + completar CONT-05, uno frontend, uno cobertura+verificación), permitir paralelo entre 04-01 y 04-02. El único punto técnico que merece atención fuera del patrón Phase 3 es la **dependencia circular ContactosModule ↔ ExpedientesModule** — resolverla con `forwardRef` en el plan 04-02.
