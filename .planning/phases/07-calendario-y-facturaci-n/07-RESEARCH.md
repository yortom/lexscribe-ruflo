# Phase 7: Calendario y Facturación — Research

**Researched:** 2026-06-06
**Domain:** NestJS modules (eventos, facturacion) + Next.js 14 App Router calendar view + MongoDB aggregation + multi-collection write compensation
**Confidence:** HIGH (all findings verified against live codebase and official sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Each event has `mostrarEnCalendario: Boolean` flag. Default `true`. Events always visible in Fechas tab; only `mostrarEnCalendario: true` events appear in global `/calendario` view. This field is NOT currently in `docs/DATOS.md §4.6` — planner MUST add it to the schema and register it in the DATOS.md changelog.
- **D-02:** Use `react-calendar` (npm, v6.0.1 — latest confirmed 2026-06-06) for the monthly grid + event list panel. Add to `apps/frontend/package.json`. No FullCalendar, no hand-rolled calendar.
- **D-03:** New global page `/calendario` (Next.js App Router under `(app)`) with react-calendar + filters by expediente and date range. Shows only `mostrarEnCalendario: true` events.
- **D-04:** Expediente "Fechas" tab (placeholder already in `ExpedienteTabs.tsx`) shows ALL events for that expediente (auto + manual), including non-visible-in-calendar ones, with visibility toggle.
- **D-05:** No document detail page. FL-8 implemented via "Añadir fecha" modal launched from per-row action in `DocumentosList.tsx`. Reuse `RolFaltanteModal` pattern.
- **D-06:** The modal captures: fechaInicio, descripcion, subtipo (`fecha_limite | aviso | recordatorio`), `mostrarEnCalendario` toggle. Creates event with `origen: "documento"`, `documentoId`, `expedienteId` (inherited from document).
- **D-07:** One document can have multiple dates (F-033); each is an independent event (F-034). All dates for a document visible in Fechas tab.
- **D-08:** (+) button in calendar view opens modal for `origen: "manual"` event — titulo, fechaInicio, fechaFin (optional), descripcion, subtipo, color, `expedienteId` (optional).
- **D-09:** Color = preset palette (~6-8 colors, not a free picker).
- **D-10:** When deleting a document with associated events, frontend shows a confirmation modal with two choices: Conservar eventos / Eliminar eventos. Replaces current direct `deleteMut` in `DocumentosList.tsx`.
- **D-11:** Document delete endpoint accepts `eventosAction: "conservar" | "eliminar"`. Backend soft-deletes or keeps events accordingly. Safe ordering + compensation (DATOS §6). No distributed transactions.
- **D-12:** Facturacion tab implemented as inline editable table. "Nueva entrada" adds a row; fields editable inline; save per row.
- **D-13:** Status (`pendiente | facturado | cobrado`) changed via inline colored dropdown/badge per row. Default `pendiente` on create.
- **D-14:** Tab shows total general (sum of active entries for expediente) + breakdown by status. Calculated on the fly via `$sum` aggregate by `expedienteId`. Not denormalized.

### Claude's Discretion

- Exact default for `mostrarEnCalendario` (recommended: `true` for both manual and documento events; expose toggle in "Añadir fecha" modal with default `true`).
- Exact color palette (6-8 hex colors).
- Exact field name (`mostrarEnCalendario`) — already chosen, register in DATOS.md.
- Backend module structure: `EventosModule` and `FacturacionModule` following schema + repository + service + controller + DTOs (Zod), `@Audited` on write endpoints.
- `forwardRef` if circular dependency between `DocumentosModule` and `EventosModule`.
- Exact compensation order for multi-collection operations.
- Importe formatting: € with 2 decimals, `es-ES` locale.
- Pagination/order of facturas: by `fecha` descending.
- Grouping/order of events in Fechas tab: by `fechaInicio` ascending.

### Deferred Ideas (OUT OF SCOPE)

- Automatic date calculation by rules (F-031, post-MVP).
- Consolidated billing view across expedientes (F-075, post-MVP).
- Document editing/regeneration (F-080, post-MVP).
- Integration with external calendars (Out of Scope).
- PDF billing output / full accounting module (Out of Scope).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | User can manually add dates to a document (fecha_limite, aviso, recordatorio); each creates a unique calendar event associated to the expediente. | FL-8 modal from DocumentosList row; EventosModule POST /eventos endpoint; shared-types evento.ts + Zod schema |
| CAL-02 | User can create manual events with title, start date, end date, description and type, without a document. | D-08 modal; EventosModule supports `origen: "manual"` with optional `expedienteId` and optional `documentoId: null` |
| CAL-03 | Calendar view shows all events (auto + manual) with filters by expediente and date range. | D-03 global /calendario page; react-calendar v6 with tileContent for dots; React Query filter params |
| CAL-04 | User can customize the color of an event. | D-09 preset palette; `color` field already in DATOS §4.6 schema; PATCH /eventos/:id |
| CAL-05 | When deleting a document with associated events, system asks whether to keep or delete events. | D-10/D-11; modified documentos.service.ts remove() method; EventosRepository.softDeleteByDocumentoId |
| FAC-01 | Each expediente has a billing tab accessible from its detail. | D-12; ExpedienteTabs.tsx `facturacion` placeholder → replace with FacturacionTab component |
| FAC-02 | User can register entries with concepto, importe, fecha (default today), optional numero, optional notas. | D-12; FacturacionModule POST /facturas; Zod schema; shared-types factura.ts |
| FAC-03 | Each entry has estado pendiente/facturado/cobrado, updatable manually; default pendiente. | D-13 inline dropdown; PATCH /facturas/:id/estado |
| FAC-04 | User can edit and delete entries at any time. | D-12; PATCH /facturas/:id + DELETE /facturas/:id; inline editing in table |
| FAC-05 | Tab shows total accumulated cost of expediente (sum of active entries), recalculated automatically. | D-14; MongoDB $group $sum aggregate by expedienteId; GET /facturas/totales/:expedienteId |

</phase_requirements>

---

## Summary

Phase 7 adds two capabilities onto the expediente: a calendar module (`eventos` collection) and a billing module (`facturas` collection). Both are greenfield NestJS modules following the established schema + repository + service + controller + DTOs pattern used in phases 2-6. The most critical technical challenge is the FL-9 delete-with-events flow, which requires modifying the existing `documentos.service.ts` delete method and establishing a unidirectional dependency from `DocumentosModule` to `EventosModule` (one-way, so no circular dep is needed). The second challenge is the MongoDB billing aggregate, which requires a single two-stage pipeline producing the global total and per-status subtotals in one query.

On the frontend, `react-calendar` v6.0.1 (latest, confirmed) is compatible with React 18 and Next.js 14. It must be wrapped in a `'use client'` component since it manipulates DOM/browser state. Its `tileContent` prop accepts `({ date, view }) => ReactNode` and is the correct mechanism for rendering event dots. The calendar CSS file must be imported inside the client component.

The `mostrarEnCalendario` field is new and not yet in `docs/DATOS.md §4.6`. The planner's Wave 0 task MUST include updating DATOS.md §4.6 + §9 changelog before any code is written.

**Primary recommendation:** Build EventosModule first (backend), then FacturacionModule (backend), then modify documentos.service.ts for FL-9, then wire the frontend tabs and the global /calendario page last. This ordering keeps dependencies clean and allows each backend module to be tested in isolation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/mongoose` | ^11.0.4 (already installed) | NestJS Mongoose integration | Project standard, all modules use it |
| `mongoose` | ^8.8.0 (already installed) | MongoDB ODM | Project standard |
| `nestjs-zod` | ^4.3.1 (already installed) | Zod + NestJS DTO bridge | Project standard (createZodDto pattern) |
| `zod` | (via nestjs-zod + shared-validation) | Schema validation | Project standard |
| `react-calendar` | 6.0.1 | Monthly calendar grid component | D-02 locked decision; compatible with React 18, Next.js 14 |
| `@tanstack/react-query` | ^5.100.9 (already installed) | Server state, cache, mutations | Project standard for all frontend data fetching |
| `react-hook-form` | ^7.75.0 (already installed) | Form management | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `softDeletePlugin` | local (`src/common/plugins/soft-delete.plugin.ts`) | Adds `activo` + `fechaInactivacion` | Apply to both `EventoSchema` and `FacturaSchema` exactly as in `DocumentoSchema` |
| `AuditInterceptor` + `@Audited` | local (`src/modules/auditoria/`) | Write audit trail | All POST/PATCH/DELETE endpoints in eventos and facturacion |
| `@CurrentUser` | local decorator | Inject `usuarioId` from JWT | All controllers — never put usuarioId in body |
| `MongoIdPipe` | local (`src/common/pipes/mongo-id.pipe.ts`) | Validate :id params | All :id route params |
| `DomainError` hierarchy | local (`src/common/errors`) | `NotFoundError`, `ValidationError`, `ConflictError` | Throw in service layer |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-calendar` | FullCalendar | FullCalendar is overkill for MVP mono-user; licensed features needed for week/day views; react-calendar is ~10KB vs ~300KB |
| `react-calendar` | Custom grid | Months/edge-cases (leap years, locale, keyboard nav) are deceptively complex — D-02 locks react-calendar |
| MongoDB `$group` aggregate | Denormalized total on `expedientes` | Denormalized total goes stale on concurrent edits; aggregate is always correct, acceptable for single-user MVP |

**Installation (only new dep):**

```bash
# From monorepo root
pnpm --filter @lexscribe/frontend add react-calendar@6.0.1
```

react-calendar v6.0.1 peer deps: `react ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0` — compatible with current `react@^18.3.1`.

**Version verification:** `react-calendar` latest is `6.0.1` (confirmed 2026-06-06 via `npm view react-calendar dist-tags`). No other new npm dependencies needed.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/backend/src/modules/
├── eventos/
│   ├── eventos.module.ts
│   ├── eventos.controller.ts
│   ├── eventos.service.ts
│   ├── eventos.repository.ts
│   ├── schemas/evento.schema.ts
│   ├── dto/create-evento.dto.ts
│   ├── dto/update-evento.dto.ts
│   ├── dto/query-evento.dto.ts
│   └── tests/
│       ├── eventos.service.spec.ts
│       └── eventos.repository.spec.ts
├── facturacion/
│   ├── facturacion.module.ts
│   ├── facturacion.controller.ts
│   ├── facturacion.service.ts
│   ├── facturacion.repository.ts
│   ├── schemas/factura.schema.ts
│   ├── dto/create-factura.dto.ts
│   ├── dto/update-factura.dto.ts
│   ├── dto/query-factura.dto.ts
│   └── tests/
│       ├── facturacion.service.spec.ts
│       └── facturacion.repository.spec.ts

apps/frontend/
├── app/(app)/calendario/page.tsx          # D-03 global calendar page
├── components/calendario/
│   ├── CalendarioView.tsx                 # 'use client' — mounts react-calendar
│   ├── EventosList.tsx                    # list panel for selected day/range
│   └── EventoModal.tsx                    # D-08 manual event creation modal
├── components/expedientes/
│   ├── FechasTab.tsx                      # D-04 all events for expediente
│   └── FacturacionTab.tsx                 # D-12 inline editable billing table
├── components/documentos/
│   ├── AnadirFechaModal.tsx               # D-05/D-06 FL-8 modal
│   └── BorrarDocumentoModal.tsx           # D-10 FL-9 conservar/eliminar modal
├── lib/api/
│   ├── eventos.ts                         # API client for eventos
│   └── facturacion.ts                     # API client for facturacion

packages/shared-types/src/
├── evento.ts
├── factura.ts
└── index.ts                               # add exports

packages/shared-validation/src/
├── eventos.ts
├── facturacion.ts
└── index.ts                               # add exports
```

### Pattern 1: NestJS Module — Eventos (mirrors documentos module exactly)

**What:** Schema + Repository + Service + Controller + DTOs. Registered in AppModule.
**When to use:** All new business modules in this project.

```typescript
// apps/backend/src/modules/eventos/schemas/evento.schema.ts
// Source: mirrors apps/backend/src/modules/documentos/schemas/documento.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type EventoDocument = HydratedDocument<Evento>;

@Schema({
  collection: 'eventos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Evento {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: String, enum: ['documento', 'manual'], required: true })
  origen!: 'documento' | 'manual';

  @Prop({ type: Types.ObjectId, ref: 'Expediente', default: null })
  expedienteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Documento', default: null })
  documentoId!: Types.ObjectId | null;

  @Prop({ type: String, enum: ['fecha_limite', 'aviso', 'recordatorio'], default: null })
  subtipo!: 'fecha_limite' | 'aviso' | 'recordatorio' | null;

  @Prop({ required: true, type: String })
  titulo!: string;

  @Prop({ type: String, default: null })
  descripcion!: string | null;

  @Prop({ required: true, type: Date })
  fechaInicio!: Date;

  @Prop({ type: Date, default: null })
  fechaFin!: Date | null;

  @Prop({ type: String, default: null })
  color!: string | null;

  // D-01: NEW FIELD — not in DATOS.md §4.6 yet; planner must add to schema + changelog
  @Prop({ type: Boolean, default: true, index: true })
  mostrarEnCalendario!: boolean;
}

export const EventoSchema = SchemaFactory.createForClass(Evento);
EventoSchema.plugin(softDeletePlugin);

// Indexes from DATOS §4.6
EventoSchema.index({ fechaInicio: 1 });
EventoSchema.index({ expedienteId: 1, fechaInicio: 1 });
EventoSchema.index({ documentoId: 1 });
// Additional for global calendar filter (D-03)
EventoSchema.index({ usuarioId: 1, mostrarEnCalendario: 1, fechaInicio: 1 });
```

### Pattern 2: FL-9 Delete-with-Events — Safe Ordering (no distributed transactions)

**What:** Document delete consults eventos, then soft-deletes documento, then optionally soft-deletes eventos. DATOS §6 "orden seguro + compensación".
**When to use:** Any multi-collection write where partial failure must be recoverable.

The key insight from the existing codebase: `documentos.service.ts` already has a `TODO Phase 7 FL-9` comment in the `remove()` method. The planner needs to modify this method and inject `EventosService` (or `EventosRepository`) into `DocumentosService`.

**Dependency direction:** DocumentosModule imports EventosModule (one-way). No forwardRef needed because EventosModule does NOT import DocumentosModule. The existing `DocumentosModule ↔ ExpedientesModule` forwardRef pattern confirms the project handles this correctly.

```typescript
// Modified apps/backend/src/modules/documentos/documentos.service.ts remove()
// Source: existing pattern in this file + DATOS §6
async remove(
  usuarioId: string,
  id: string,
  eventosAction: 'conservar' | 'eliminar' = 'conservar',
) {
  // Step 1: Verify document exists (early fail — nothing mutated yet)
  const doc = await this.repo.findById(usuarioId, id);
  if (!doc) throw new NotFoundError('documento', id);

  // Step 2: Soft-delete the document (primary operation)
  await this.repo.softDelete(usuarioId, id);

  // Step 3: Conditionally soft-delete events (compensation if this fails is
  // acceptable — events without their document are orphaned but not corrupt;
  // a future admin job can clean them up per DATOS §6)
  if (eventosAction === 'eliminar') {
    await this.eventosRepo.softDeleteByDocumentoId(usuarioId, id);
  }

  return doc;
}
```

**Compensation note (DATOS §6):** If step 3 throws (e.g., MongoDB transient error), the document is already inactivated but events remain active. This is the accepted "safe" state — events reference a soft-deleted document. The frontend filters events by `activo: true` anyway, so orphaned events are invisible if their parent document is gone and they get cleaned. In a future admin sweep they can be purged. Document this in the service.

### Pattern 3: MongoDB Billing Aggregate — Total + Per-Status Subtotals

**What:** Single aggregation pipeline returning grand total and subtotals by `estado` for one expediente.
**When to use:** FAC-05, D-14.

```typescript
// apps/backend/src/modules/facturacion/facturacion.repository.ts
// Source: DATOS §4.7 note + MongoDB $group documentation
async getTotales(usuarioId: string, expedienteId: string): Promise<{
  total: number;
  pendiente: number;
  facturado: number;
  cobrado: number;
}> {
  const oid = new Types.ObjectId(expedienteId);
  const uid = new Types.ObjectId(usuarioId);

  const result = await this.model.aggregate([
    {
      $match: {
        usuarioId: uid,
        expedienteId: oid,
        activo: true,           // soft-delete filter — softDeletePlugin pre-hook
                                // does NOT apply to .aggregate() — must filter manually
      },
    },
    {
      $group: {
        _id: '$estado',
        subtotal: { $sum: '$importe' },
      },
    },
  ]).exec();

  const map: Record<string, number> = {};
  for (const row of result) {
    map[row._id as string] = row.subtotal as number;
  }
  return {
    total: (map['pendiente'] ?? 0) + (map['facturado'] ?? 0) + (map['cobrado'] ?? 0),
    pendiente: map['pendiente'] ?? 0,
    facturado: map['facturado'] ?? 0,
    cobrado: map['cobrado'] ?? 0,
  };
}
```

**Critical pitfall:** Mongoose's `softDeletePlugin` pre-hooks apply to `find`, `findOne`, `countDocuments`, etc., but NOT to `.aggregate()`. Always add `activo: true` explicitly in the `$match` stage of aggregation pipelines.

### Pattern 4: react-calendar in Next.js 14 App Router

**What:** Client component wrapping react-calendar with event dot indicators.
**When to use:** D-02, D-03 — the global `/calendario` page.

```tsx
// apps/frontend/components/calendario/CalendarioView.tsx
'use client';
// CSS must be imported inside client component to avoid SSR mismatch
import 'react-calendar/dist/Calendar.css';
import Calendar from 'react-calendar';
import type { TileContentFunc } from 'react-calendar';
import type { Evento } from '@lexscribe/shared-types';

interface CalendarioViewProps {
  eventos: Evento[];
  onDayClick: (date: Date) => void;
  value: Date;
  onChange: (date: Date) => void;
}

export function CalendarioView({ eventos, onDayClick, value, onChange }: CalendarioViewProps) {
  // Build a Set of date strings for O(1) lookup
  const eventDates = new Set(
    eventos.map((e) => new Date(e.fechaInicio).toDateString())
  );

  const tileContent: TileContentFunc = ({ date, view }) => {
    if (view !== 'month') return null;
    if (eventDates.has(date.toDateString())) {
      return <span className="block w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />;
    }
    return null;
  };

  return (
    <Calendar
      onChange={(v) => onChange(v as Date)}
      value={value}
      onClickDay={onDayClick}
      tileContent={tileContent}
      locale="es-ES"
    />
  );
}
```

**SSR caveat:** react-calendar v6 no longer requires `'use client'` in the parent, but the file that imports `'react-calendar/dist/Calendar.css'` MUST be a client component. Using `dynamic()` with `ssr: false` is an alternative if CSS import causes build warnings:

```tsx
// Alternative for page.tsx (server component):
const CalendarioView = dynamic(
  () => import('@/components/calendario/CalendarioView'),
  { ssr: false }
);
```

### Pattern 5: Zod DTO for eventos (shared-validation)

```typescript
// packages/shared-validation/src/eventos.ts
import { z } from 'zod';

export const CreateEventoSchema = z.object({
  origen: z.enum(['documento', 'manual']),
  expedienteId: z.string().length(24).nullable().optional(),
  documentoId: z.string().length(24).nullable().optional(),
  subtipo: z.enum(['fecha_limite', 'aviso', 'recordatorio']).nullable().optional(),
  titulo: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  fechaInicio: z.string().datetime(),   // ISODate string from frontend
  fechaFin: z.string().datetime().nullable().optional(),
  color: z.string().nullable().optional(),
  mostrarEnCalendario: z.boolean().default(true),  // D-01
});
export type CreateEventoInput = z.infer<typeof CreateEventoSchema>;

export const UpdateEventoSchema = CreateEventoSchema.partial().omit({ origen: true });
export type UpdateEventoInput = z.infer<typeof UpdateEventoSchema>;

export const QueryEventoSchema = z.object({
  expedienteId: z.string().length(24).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  soloCalendario: z.coerce.boolean().optional(),   // filter mostrarEnCalendario: true
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type QueryEventoInput = z.infer<typeof QueryEventoSchema>;
```

### Pattern 6: Delete Document Endpoint Change for FL-9

The current `DELETE /documentos/:id` in `documentos.controller.ts` calls `service.remove(uid, id)` with no extra params. For FL-9 the frontend must pass the user's choice. The cleanest approach (no body on DELETE) is a **query parameter**:

```
DELETE /documentos/:id?eventosAction=conservar
DELETE /documentos/:id?eventosAction=eliminar
```

Controller change:
```typescript
@Delete(':id')
@Audited('documento', 'delete')
remove(
  @CurrentUser('id') uid: string,
  @Param('id', MongoIdPipe) id: string,
  @Query('eventosAction') eventosAction: 'conservar' | 'eliminar' = 'conservar',
) {
  return this.service.remove(uid, id, eventosAction);
}
```

Frontend `deleteDocumento` API client must be updated to accept `eventosAction`:
```typescript
export function deleteDocumento(
  id: string,
  eventosAction: 'conservar' | 'eliminar' = 'conservar',
): Promise<void> {
  return apiFetch<void>(`/documentos/${id}?eventosAction=${eventosAction}`, { method: 'DELETE' });
}
```

### Anti-Patterns to Avoid

- **Do not use `.aggregate()` without `activo: true` in `$match`** — the softDeletePlugin does NOT intercept Mongoose aggregation pipelines. Always add the filter manually.
- **Do not import `react-calendar/dist/Calendar.css` in server components** — will cause a build error or hydration mismatch in Next.js App Router. Import only inside a `'use client'` file.
- **Do not omit `forwardRef` if EventosModule imports DocumentosModule** — but the correct design is one-way: DocumentosModule imports EventosModule (for FL-9), and EventosModule does NOT import DocumentosModule. This avoids any circular dependency entirely.
- **Do not add `usuarioId` to request body DTOs** — inject from `@CurrentUser('id')` only, as established by AUTH-04 throughout phases 2-6.
- **Do not denormalize billing totals into `expedientes`** — D-14 and DATOS §4.7 explicitly mandate on-the-fly aggregation to avoid inconsistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar month grid | Custom grid with CSS Grid | `react-calendar` v6.0.1 | Locale, keyboard nav, leap-year edge cases are already solved |
| Soft-delete filtering | Custom `activo: true` queries everywhere | `softDeletePlugin` (local) | Already tested plugin handles all read ops; just `EventoSchema.plugin(softDeletePlugin)` |
| JWT extraction from request | Manual header parsing | `@CurrentUser('id')` decorator (local) | Established pattern, already used in all 6 prior modules |
| DTO validation | Manual `typeof` checks in service | `createZodDto(Schema)` + `ZodValidationPipe` global | Already registered globally in `AppModule`; just create the DTO class |
| Audit trail | Custom log writes | `@Audited` + `AuditInterceptor` (local) | Declared on controller method — zero overhead in service |
| ObjectId validation | Manual `mongoose.isValidObjectId()` checks | `MongoIdPipe` (local) | Already used in all controllers; auto-throws 400 on invalid format |

**Key insight:** Phase 7 is additive, not exploratory. Every cross-cutting concern (auth, audit, soft-delete, validation, error handling) is already solved by infrastructure built in phases 2-4. New modules just plug in.

---

## Runtime State Inventory

This is a greenfield phase — no renames, refactors, or migrations. There are no runtime state items to audit.

**Stored data:** None — `eventos` and `facturas` collections do not exist yet; they will be created on first insert.
**Live service config:** None.
**OS-registered state:** None.
**Secrets/env vars:** None — no new environment variables required. Uses existing `MONGO_URI`.
**Build artifacts:** None.

---

## Common Pitfalls

### Pitfall 1: Mongoose `.aggregate()` Ignores softDeletePlugin Hooks

**What goes wrong:** Developer queries billing totals or calendar events via `.aggregate()` and gets results including soft-deleted records, because the `softDeletePlugin` pre-hooks intercept `find`/`findOne`/`countDocuments` but NOT the aggregation framework.

**Why it happens:** Mongoose middleware (pre-hooks) runs for query-based operations. Aggregation pipelines are a separate execution path and bypass query middleware.

**How to avoid:** Always add `{ activo: true }` as the first condition in the `$match` stage of any aggregation on collections that use `softDeletePlugin`.

**Warning signs:** Billing totals include deleted entries; deleted events appear in calendar view.

### Pitfall 2: `react-calendar/dist/Calendar.css` in Server Component

**What goes wrong:** Build fails or hydration mismatch at runtime because CSS is imported in a Next.js server component (App Router default).

**Why it happens:** Next.js App Router treats all `page.tsx` files as server components unless they have `'use client'`. CSS imports in server components may not be processed by the Tailwind/PostCSS pipeline correctly.

**How to avoid:** Only import `'react-calendar/dist/Calendar.css'` inside a file that starts with `'use client'`. If the calendar page is a server component for data fetching, extract `CalendarioView` as a separate client component file that handles the CSS import.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'Calendar')` or style not applied.

### Pitfall 3: FL-9 — Document Has Events But Check Is Skipped

**What goes wrong:** Frontend deletes a document with events without showing the conservar/eliminar modal, silently leaving orphaned active events in `eventos` collection.

**Why it happens:** The current `DocumentosList.tsx` uses `deleteMut.mutate(doc._id)` directly with no pre-check. The frontend must first query `GET /eventos?documentoId=:id` (or a dedicated `GET /documentos/:id/eventos-count` endpoint) to determine if the document has events before deciding which delete flow to show.

**How to avoid:** Add a pre-delete check. Two options:
- Backend: `GET /documentos/:id/eventos` returns count of active events for that document.
- Frontend: query `listEventos({ documentoId: id })` before delete, check `total > 0`.

The simplest approach is a dedicated `GET /eventos/count?documentoId=:id` endpoint that returns `{ total: number }` so the frontend can decide whether to show the modal.

**Warning signs:** Users delete documents without being prompted about events.

### Pitfall 4: Circular Dependency if EventosModule Imports DocumentosModule

**What goes wrong:** If `EventosService` imports `DocumentosRepository` to validate `documentoId`, and `DocumentosModule` imports `EventosModule` for FL-9, a circular dependency forms that requires `forwardRef` on both sides.

**Why it happens:** Bidirectional module dependencies in NestJS trigger the DI container deadlock guard.

**How to avoid:** Keep the dependency **one-way**: `DocumentosModule` imports `EventosModule` (for FL-9 cleanup). `EventosModule` does NOT import `DocumentosModule`. If `EventosService` needs to validate that a `documentoId` exists, it can accept the documentoId as-is from the request (validated as a valid ObjectId by `MongoIdPipe`) without looking it up in the `documentos` collection. The FK integrity constraint is enforced at the application level at creation time.

**Warning signs:** NestJS startup warning `A circular dependency has been detected (EventosModule -> DocumentosModule -> EventosModule)`.

### Pitfall 5: `mostrarEnCalendario` Field Missing from DATOS.md

**What goes wrong:** The schema is implemented in code but DATOS.md §4.6 and §9 changelog are not updated, violating CLAUDE.md rule 4 (changelog discipline) and breaking the project's documentation-first contract.

**How to avoid:** Wave 0 of the plan MUST include a task to add `mostrarEnCalendario: Boolean` to DATOS.md §4.6 schema definition and an entry in §9 changelog dated 2026-06-06.

### Pitfall 6: Billing Importe Floating-Point Errors

**What goes wrong:** `$sum` on `importe: Number` accumulates IEEE 754 floating-point errors when summing many decimal values (e.g., 1.10 + 2.20 = 3.3000000000000003).

**How to avoid:** Format the total with `Number.toFixed(2)` before returning from the API, or store importes as integers (cents). The simplest fix is rounding in the repository layer: `total: Math.round(raw.total * 100) / 100`.

---

## Code Examples

Verified patterns from existing codebase:

### Existing @Audited usage (from documentos.controller.ts)

```typescript
@Delete(':id')
@Audited('documento', 'delete')
remove(
  @CurrentUser('id') uid: string,
  @Param('id', MongoIdPipe) id: string,
) {
  return this.service.remove(uid, id);
}
```

### Existing softDeletePlugin application (from documento.schema.ts)

```typescript
export const DocumentoSchema = SchemaFactory.createForClass(Documento);
DocumentoSchema.plugin(softDeletePlugin);
DocumentoSchema.index({ expedienteId: 1, fechaCreacion: -1 });
```

### Existing forwardRef in DocumentosModule (template for EventosModule import)

```typescript
// DocumentosModule already imports ExpedientesModule with forwardRef
// When EventosModule is added, import it WITHOUT forwardRef (one-way dep)
forwardRef(() => ExpedientesModule),   // existing — circular dep
EventosModule,                          // new — no circular dep, no forwardRef needed
```

### React Query + mutation pattern (from DocumentosList.tsx — to replicate for facturas)

```typescript
const deleteMut = useMutation({
  mutationFn: (id: string) => deleteDocumento(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['documentos', expedienteId] });
  },
});
```

### Shared-types interface pattern (from packages/shared-types/src/documento.ts)

```typescript
// New: packages/shared-types/src/evento.ts
export interface Evento {
  _id: string;
  usuarioId: string;
  origen: 'documento' | 'manual';
  expedienteId: string | null;
  documentoId: string | null;
  subtipo: 'fecha_limite' | 'aviso' | 'recordatorio' | null;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;  // ISO string
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
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `DocumentosList.tsx` direct `deleteMut.mutate(id)` | Must show FL-9 modal first | Phase 7 | Replace `onClick` handler with pre-check + modal flow |
| `documentos.service.ts remove()` — simple soft-delete | Must accept `eventosAction` param and conditionally soft-delete eventos | Phase 7 | Modify signature + inject `EventosRepository` |
| `ExpedienteTabs.tsx` fechas/facturacion = placeholder text | Replace placeholders with `FechasTab` and `FacturacionTab` components | Phase 7 | Fill in `{active === 'fechas' && ...}` and `{active === 'facturacion' && ...}` |
| `expedientes.service.ts getById()` returns `fechas: []` placeholder | Should return real events from `EventosRepository` | Phase 7 | Update `getById()` or leave placeholder (FechasTab fetches directly) |
| `AppModule` — no EventosModule or FacturacionModule | Add both to `imports[]` | Phase 7 | Add to `app.module.ts` |
| Nav in `layout.tsx` — 4 links | Add "Calendario" link to `/calendario` | Phase 7 | Edit `apps/frontend/app/(app)/layout.tsx` |

**Deprecated/outdated:**
- The `fechas: []` placeholder in `expedientes.service.ts getById()` is technical debt — Phase 7 should either remove it or populate it. Recommended: remove it since `FechasTab` will fetch events directly from `GET /eventos?expedienteId=:id`.

---

## Open Questions

1. **Counts before delete for FL-9: dedicated endpoint or reuse list?**
   - What we know: frontend needs to know if a document has any active events before showing the modal.
   - What's unclear: is a dedicated `GET /eventos/count?documentoId=:id` endpoint better, or can the frontend call `GET /eventos?documentoId=:id&limit=1` and check `total`?
   - Recommendation: add `GET /eventos/count?documentoId=:id` returning `{ total: number }` — cheaper network payload, avoids returning event objects when only the count is needed.

2. **Event modal color palette — exact 6-8 colors**
   - What we know: D-09 specifies a preset palette, not a free picker.
   - What's unclear: exact colors not specified.
   - Recommendation (Claude's Discretion): Use `['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280']` (Tailwind 500 spectrum — 8 distinct colors, accessible contrast, already used in Tailwind classes in the project).

3. **FechasTab grouping: by document or by date?**
   - What we know: D-07 says dates are grouped/filterable by document in the Fechas tab.
   - What's unclear: exact UI — flat list sorted by `fechaInicio`? Or grouped by `documentoId`?
   - Recommendation (Claude's Discretion): flat list sorted by `fechaInicio` ascending, with a `documentoNombre` label on each row derived from a lookup. Grouping by document adds complexity for minimal benefit in a single-user MVP.

---

## Environment Availability

Step 2.6: This phase is purely additive code + npm install. No new external services required beyond already-running MongoDB, MinIO, and Next.js dev server. No new environment variables.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MongoDB | eventos + facturas collections | ✓ | 8.x (ARQUITECTURA §15) | — |
| `react-calendar` | D-02 calendar view | ✗ (not yet installed) | 6.0.1 | — (locked decision) |
| Node.js | backend build | ✓ | 22 LTS (ARQUITECTURA §15) | — |
| pnpm | monorepo install | ✓ | (existing) | — |

**Missing dependencies with no fallback:**
- `react-calendar@6.0.1` must be installed with `pnpm --filter @lexscribe/frontend add react-calendar@6.0.1`.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` (only has `_auto_chain_active: false`) — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest 29 + ts-jest |
| Backend config file | `apps/backend/jest.config.ts` |
| Backend quick run | `pnpm --filter @lexscribe/backend test` |
| Backend full suite | `pnpm --filter @lexscribe/backend test --coverage` |
| Frontend framework | Vitest 2 + Testing Library |
| Frontend config file | `apps/frontend/vitest.config.ts` |
| Frontend quick run | `pnpm --filter @lexscribe/frontend test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-01 | POST /eventos creates evento with origen=documento, documentoId, expedienteId | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.service.spec` | ❌ Wave 0 |
| CAL-01 | AnadirFechaModal submits correct payload; invalidates React Query | unit | `pnpm --filter @lexscribe/frontend test -- AnadirFechaModal` | ❌ Wave 0 |
| CAL-02 | POST /eventos creates evento with origen=manual, expedienteId optional | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.service.spec` | ❌ Wave 0 |
| CAL-03 | GET /eventos?soloCalendario=true filters mostrarEnCalendario=true | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.repository.spec` | ❌ Wave 0 |
| CAL-03 | CalendarioView renders event dots on correct days | unit | `pnpm --filter @lexscribe/frontend test -- CalendarioView` | ❌ Wave 0 |
| CAL-04 | PATCH /eventos/:id updates color field | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=eventos.service.spec` | ❌ Wave 0 |
| CAL-05 | remove(uid, id, 'eliminar') soft-deletes document + calls eventosRepo.softDeleteByDocumentoId | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=documentos.service.spec` | ✅ (extend existing file) |
| CAL-05 | remove(uid, id, 'conservar') soft-deletes document + does NOT call eventosRepo.softDeleteByDocumentoId | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=documentos.service.spec` | ✅ (extend existing file) |
| CAL-05 | BorrarDocumentoModal shows conservar/eliminar options when doc has events | unit | `pnpm --filter @lexscribe/frontend test -- BorrarDocumentoModal` | ❌ Wave 0 |
| FAC-01 | GET /facturas?expedienteId=:id returns entries for expediente | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.service.spec` | ❌ Wave 0 |
| FAC-02 | POST /facturas creates factura with default estado=pendiente, default fecha=today | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.service.spec` | ❌ Wave 0 |
| FAC-03 | PATCH /facturas/:id/estado accepts pendiente/facturado/cobrado | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.service.spec` | ❌ Wave 0 |
| FAC-04 | DELETE /facturas/:id soft-deletes and recalculates total | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.service.spec` | ❌ Wave 0 |
| FAC-05 | getTotales() aggregate returns correct total + subtotals; activo:false records excluded | unit | `pnpm --filter @lexscribe/backend test -- --testPathPattern=facturacion.repository.spec` | ❌ Wave 0 |
| FAC-05 | FacturacionTab displays total and subtotals after mutation | unit | `pnpm --filter @lexscribe/frontend test -- FacturacionTab` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @lexscribe/backend test --passWithNoTests` (backend unit suite, ~5s)
- **Per wave merge:** `pnpm --filter @lexscribe/backend test --coverage && pnpm --filter @lexscribe/frontend test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/modules/eventos/tests/eventos.service.spec.ts` — covers CAL-01, CAL-02, CAL-04
- [ ] `apps/backend/src/modules/eventos/tests/eventos.repository.spec.ts` — covers CAL-03 (soloCalendario filter)
- [ ] `apps/backend/src/modules/facturacion/tests/facturacion.service.spec.ts` — covers FAC-01, FAC-02, FAC-03, FAC-04
- [ ] `apps/backend/src/modules/facturacion/tests/facturacion.repository.spec.ts` — covers FAC-05 (aggregate, activo filter)
- [ ] `apps/frontend/components/documentos/AnadirFechaModal.test.tsx` — covers CAL-01 frontend
- [ ] `apps/frontend/components/documentos/BorrarDocumentoModal.test.tsx` — covers CAL-05 frontend
- [ ] `apps/frontend/components/calendario/CalendarioView.test.tsx` — covers CAL-03 frontend dots
- [ ] `apps/frontend/components/expedientes/FacturacionTab.test.tsx` — covers FAC-05 frontend display
- [ ] Extend `apps/backend/src/modules/documentos/tests/documentos.service.spec.ts` — add CAL-05 tests for `eventosAction` param

Coverage threshold: No new threshold entry needed in `jest.config.ts` for eventos/facturacion at Wave 0 — add one targeting `./src/modules/eventos/` and `./src/modules/facturacion/` at lines/functions ≥ 80% as part of the final plan task (mirrors the `documentos` threshold already defined).

---

## Sources

### Primary (HIGH confidence)

- Live codebase — `apps/backend/src/modules/documentos/` (complete module structure, softDeletePlugin, @Audited, forwardRef pattern)
- Live codebase — `apps/backend/src/modules/expedientes/` (forwardRef, EventEmitter, DomainError, registerParametros pattern)
- Live codebase — `apps/frontend/components/documentos/DocumentosList.tsx` (exact current delete flow to modify for FL-9)
- Live codebase — `apps/frontend/components/expedientes/ExpedienteTabs.tsx` (exact placeholder text to replace)
- Live codebase — `apps/backend/src/common/plugins/soft-delete.plugin.ts` (confirmed: does NOT intercept `.aggregate()`)
- Live codebase — `apps/backend/jest.config.ts`, `apps/frontend/vitest.config.ts` (test commands and coverage thresholds)
- `docs/DATOS.md §4.6` (eventos schema — confirmed `mostrarEnCalendario` is absent)
- `docs/DATOS.md §4.7` (facturas schema — confirmed `$sum` aggregate approach)
- `docs/DATOS.md §2.3, §6` (soft-delete exception for documentos, no distributed transactions)
- `npm view react-calendar dist-tags` — confirmed latest 6.0.1, peer deps React 18 compatible

### Secondary (MEDIUM confidence)

- react-calendar GitHub README (via WebFetch) — confirmed `tileContent: ({ date, view }) => ReactNode` signature, CSS import requirement, `TileContentFunc` type export
- NestJS official docs on circular dependency + forwardRef (via WebSearch — multiple authoritative sources agree on the pattern; aligns with existing codebase usage)
- MongoDB `$group` + `$sum` aggregation (via WebSearch — aligns with MongoDB official docs; pattern is well-established)

### Tertiary (LOW confidence)

- react-calendar `locale="es-ES"` prop behavior — not verified against v6 changelog specifically, but is a long-standing prop that has not changed across versions.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified against live package.json files and npm registry
- Architecture: HIGH — all patterns derived from existing codebase; no speculation
- FL-9 compensation ordering: HIGH — derived from DATOS §6 and existing softDeletePlugin behavior
- MongoDB billing aggregate: HIGH — standard MongoDB $group/$sum; pitfall (aggregate vs pre-hook) verified from softDeletePlugin source
- react-calendar API: MEDIUM — confirmed version and peer deps; tileContent signature from README; CSS import requirement from documentation
- Pitfalls: HIGH — all derived from reading actual code (softDeletePlugin source, existing service patterns)

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 (react-calendar is stable; NestJS 11 is stable; MongoDB 8 is stable)
