---
phase: 07-calendario-y-facturaci-n
plan: 03
type: execute
wave: 2
depends_on: ["07-01"]
files_modified:
  - apps/backend/src/modules/documentos/documentos.service.ts
  - apps/backend/src/modules/documentos/documentos.controller.ts
  - apps/backend/src/modules/documentos/documentos.module.ts
  - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts
  - apps/frontend/package.json
  - apps/frontend/lib/api/eventos.ts
  - apps/frontend/components/calendario/CalendarioView.tsx
  - apps/frontend/components/calendario/EventosList.tsx
  - apps/frontend/components/calendario/EventoModal.tsx
  - apps/frontend/app/(app)/calendario/page.tsx
  - apps/frontend/app/(app)/layout.tsx
  - apps/frontend/components/expedientes/FechasTab.tsx
  - apps/frontend/components/expedientes/ExpedienteTabs.tsx
  - apps/frontend/components/documentos/AnadirFechaModal.tsx
  - apps/frontend/components/documentos/BorrarDocumentoModal.tsx
  - apps/frontend/components/documentos/DocumentosList.tsx
  - apps/frontend/lib/api/documentos.ts
  - apps/frontend/components/documentos/AnadirFechaModal.test.tsx
  - apps/frontend/components/documentos/BorrarDocumentoModal.test.tsx
  - apps/frontend/components/calendario/CalendarioView.test.tsx
autonomous: false
requirements: [CAL-01, CAL-03, CAL-04, CAL-05]
must_haves:
  truths:
    - "DELETE /documentos/:id?eventosAction=eliminar soft-deletes the document AND its events; conservar keeps events"
    - "DocumentosList shows an 'Añadir fecha' action per row that opens a modal creating an evento (origen documento)"
    - "Deleting a document with events shows a Conservar/Eliminar modal before deleting"
    - "Global /calendario page renders react-calendar with event dots, filters by expediente + date range, shows only mostrarEnCalendario=true"
    - "Expediente Fechas tab lists ALL events (incl. non-visible) with a visibility toggle"
    - "A 'Calendario' nav link exists in the app layout"
  artifacts:
    - path: "apps/backend/src/modules/documentos/documentos.service.ts"
      provides: "remove(uid, id, eventosAction) wired to eventosRepo.softDeleteByDocumentoId"
      contains: "eventosAction"
    - path: "apps/frontend/components/calendario/CalendarioView.tsx"
      provides: "'use client' react-calendar wrapper with tileContent dots"
      contains: "react-calendar"
    - path: "apps/frontend/components/documentos/BorrarDocumentoModal.tsx"
      provides: "FL-9 conservar/eliminar confirmation modal"
      contains: "Conservar"
    - path: "apps/frontend/lib/api/eventos.ts"
      provides: "createEvento/listEventos/updateEvento/deleteEvento/countEventosByDocumento clients"
      exports: ["createEvento", "listEventos"]
  key_links:
    - from: "apps/frontend/components/documentos/DocumentosList.tsx"
      to: "BorrarDocumentoModal + countEventosByDocumento"
      via: "pre-delete event count check then modal"
      pattern: "countEventos|BorrarDocumentoModal"
    - from: "apps/backend/src/modules/documentos/documentos.module.ts"
      to: "EventosModule"
      via: "imports[] one-way (no forwardRef)"
      pattern: "EventosModule"
    - from: "apps/frontend/app/(app)/calendario/page.tsx"
      to: "GET /eventos?soloCalendario=true"
      via: "listEventos with soloCalendario filter"
      pattern: "soloCalendario"
---

<objective>
Wire the calendar end to end: (1) modify the backend `documentos.service.remove()` for FL-9 (D-11) to accept `eventosAction` and import EventosModule one-way; (2) build the frontend — global `/calendario` page (D-03), Fechas tab (D-04), "Añadir fecha" modal (FL-8/D-05/D-06), FL-9 delete-with-events modal (D-10), and nav link.

Covers CAL-01 (frontend add-date), CAL-03 (calendar view + Fechas tab), CAL-04 (color preset via modal), CAL-05 (FL-9 delete flow, backend + frontend).

Purpose: Complete the calendar feature against the EventosModule API from 07-01. Includes a human-verify checkpoint for react-calendar visual rendering (CAL-03/CAL-04 visual polish is manual per 07-VALIDATION.md).
Output: Modified documentos service/controller/module, eventos API client, calendar components, /calendario page, Fechas tab, FL-8 + FL-9 modals, nav link, frontend tests.
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
@.planning/phases/07-calendario-y-facturaci-n/07-01-SUMMARY.md

<interfaces>
<!-- Contracts from 07-01 (already built). Use directly. -->
From @lexscribe/shared-types: `Evento`, `EventoListResponse`, `EventoCountResponse`.
From @lexscribe/shared-validation: `CreateEventoSchema`, `UpdateEventoSchema`, `QueryEventoSchema`.

Backend endpoints (07-01): POST /eventos, GET /eventos (filters: expedienteId, documentoId, fechaDesde, fechaHasta, soloCalendario, page, limit), GET /eventos/count?documentoId=:id → {total}, GET /eventos/:id, PATCH /eventos/:id, DELETE /eventos/:id.
EventosRepository exports `softDeleteByDocumentoId(usuarioId, documentoId)` and `countByDocumentoId(...)`. EventosModule exports EventosService + EventosRepository.

Existing frontend API client pattern: apps/frontend/lib/api/documentos.ts (`apiFetch<T>`, `ApiError`). Replicate for eventos.ts.

Color palette (D-09, RESEARCH Open Q2): ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#f97316','#6b7280'].
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: FL-9 backend — modify documentos.service.remove + controller + module + tests</name>
  <read_first>
    - apps/backend/src/modules/documentos/documentos.service.ts (current remove() with TODO Phase 7 FL-9 at line ~140; constructor DI)
    - apps/backend/src/modules/documentos/documentos.controller.ts (current DELETE :id at line ~109)
    - apps/backend/src/modules/documentos/documentos.module.ts (imports[] — add EventosModule one-way, NO forwardRef)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (mock factories; add EventosRepository mock)
    - apps/backend/src/modules/eventos/eventos.repository.ts (softDeleteByDocumentoId signature, from 07-01)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 2 safe ordering, Pattern 6 endpoint change, Pitfall 4 one-way dep)
    - docs/DATOS.md §2.3 (documentos soft-delete exception) and §6 (compensation, no distributed tx)
  </read_first>
  <behavior>
    - documentos.service.spec.ts (extend existing): remove(uid, id, 'eliminar') → softDelete(document) THEN eventosRepo.softDeleteByDocumentoId(uid, id) called once.
    - remove(uid, id, 'conservar') → softDelete(document) called; eventosRepo.softDeleteByDocumentoId NOT called.
    - remove(uid, id) with missing doc (repo.softDelete returns null) → throws NotFoundError; eventosRepo.softDeleteByDocumentoId NOT called.
  </behavior>
  <action>
    1. documentos.service.ts: inject `EventosRepository` via constructor (import from `../eventos/eventos.repository`; one-way, no forwardRef). Modify `remove(usuarioId, id, eventosAction: 'conservar' | 'eliminar' = 'conservar')` per RESEARCH Pattern 2: (a) `const del = await this.repo.softDelete(usuarioId, id); if (!del) throw new NotFoundError('documento', id);` (primary op, fail-safe ordering); (b) `if (eventosAction === 'eliminar') { await this.eventosRepo.softDeleteByDocumentoId(usuarioId, id); }`; (c) add a JSDoc note on compensation per DATOS §6: if step (b) throws, document is already inactive and events remain active (accepted safe state, future admin sweep cleans). Return `del`. Remove the `TODO Phase 7 FL-9` comment.
    2. documentos.controller.ts: change `@Delete(':id')` to also accept `@Query('eventosAction') eventosAction: 'conservar' | 'eliminar' = 'conservar'` and pass to `this.service.remove(uid, id, eventosAction)`. Keep `@Audited('documento','delete')`.
    3. documentos.module.ts: add `EventosModule` to imports[] (import from `../eventos/eventos.module`). NOT forwardRef — one-way dependency (EventosModule does NOT import DocumentosModule). Keep existing forwardRef imports unchanged.
    4. Extend documentos.service.spec.ts: add an EventosRepository mock factory (`{ softDeleteByDocumentoId: jest.fn() }`), pass it into the DocumentosService constructor, and add the 3 tests in <behavior>.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm --filter @lexscribe/backend test -- --testPathPattern=documentos.service.spec && pnpm --filter @lexscribe/backend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "eventosAction" apps/backend/src/modules/documentos/documentos.service.ts` matches
    - `grep "softDeleteByDocumentoId" apps/backend/src/modules/documentos/documentos.service.ts` matches
    - `grep "EventosModule" apps/backend/src/modules/documentos/documentos.module.ts` matches and is NOT wrapped in forwardRef
    - `grep "eventosAction" apps/backend/src/modules/documentos/documentos.controller.ts` matches
    - documentos.service.spec exits 0; backend build exits 0 (no circular dependency warning)
  </acceptance_criteria>
  <done>remove() conditionally soft-deletes events based on eventosAction; controller reads it from query; DocumentosModule imports EventosModule one-way; backend boots without circular-dep warning; service spec covers conservar/eliminar/not-found.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Install react-calendar + eventos API client + calendar components + /calendario page + Fechas tab + nav</name>
  <read_first>
    - apps/frontend/lib/api/documentos.ts (apiFetch<T>, ApiError, query-string pattern)
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx (fechas tab placeholder at line ~55; TabKey)
    - apps/frontend/app/(app)/layout.tsx (nav <a> links at lines ~18-21)
    - apps/frontend/components/documentos/RolFaltanteModal.tsx (inline modal pattern to mirror — read full file)
    - apps/frontend/components/documentos/DocumentosList.tsx (useQuery/useMutation/invalidateQueries pattern)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 4 react-calendar 'use client' + tileContent + CSS import, Pitfall 2, Open Q2 palette, Open Q3 FechasTab flat list)
  </read_first>
  <behavior>
    - CalendarioView.test.tsx: given eventos with fechaInicio on specific days, tileContent renders a dot (span) on those days in month view and nothing on event-less days.
  </behavior>
  <action>
    1. Install dep: `pnpm --filter @lexscribe/frontend add react-calendar@6.0.1` (adds to apps/frontend/package.json).
    2. Create apps/frontend/lib/api/eventos.ts mirroring documentos.ts (reuse the same apiFetch/ApiError approach — either import the shared helper if exported, or replicate the local apiFetch). Functions:
       - `createEvento(input: CreateEventoInput): Promise<Evento>` → POST /eventos.
       - `listEventos(params: { expedienteId?; documentoId?; fechaDesde?; fechaHasta?; soloCalendario?; page?; limit? }): Promise<EventoListResponse>` → GET /eventos with query string.
       - `updateEvento(id, patch: UpdateEventoInput): Promise<Evento>` → PATCH /eventos/:id.
       - `deleteEvento(id): Promise<void>` → DELETE /eventos/:id.
       - `countEventosByDocumento(documentoId): Promise<EventoCountResponse>` → GET /eventos/count?documentoId=:id.
       Types from @lexscribe/shared-types and @lexscribe/shared-validation.
    3. Create apps/frontend/components/calendario/CalendarioView.tsx EXACTLY per RESEARCH Pattern 4: `'use client'`, `import 'react-calendar/dist/Calendar.css'`, `import Calendar from 'react-calendar'`, build `eventDates` Set, `tileContent` rendering a `<span className="block w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />` on event days (view==='month' only), `locale="es-ES"`. Props: `{ eventos: Evento[]; value: Date; onChange: (d: Date) => void; onDayClick: (d: Date) => void }`.
    4. Create apps/frontend/components/calendario/EventosList.tsx: 'use client'; renders the list panel of events for the selected day/range — each row shows titulo, fechaInicio (toLocaleDateString es-ES), subtipo/origen badge, and a color swatch (using evento.color). Props `{ eventos: Evento[] }`.
    5. Create apps/frontend/components/calendario/EventoModal.tsx (D-08 manual event): inline modal (RolFaltanteModal pattern) capturing titulo, fechaInicio, fechaFin (optional), descripcion, subtipo, color (preset palette buttons from the 8 hex colors), expedienteId (optional). On submit calls createEvento with `origen: 'manual'` and `mostrarEnCalendario: true`. Props include `onClose` and `onCreated`.
    6. Create apps/frontend/app/(app)/calendario/page.tsx (D-03): 'use client' page. State: selected Date, expediente filter (text/select of expediente id), date range (fechaDesde/fechaHasta). useQuery `['eventos','calendario',filters]` → `listEventos({ soloCalendario: true, expedienteId, fechaDesde, fechaHasta })`. Render CalendarioView + EventosList + a `(+)` button opening EventoModal. To avoid SSR CSS issues (Pitfall 2), either keep this file `'use client'` or load CalendarioView via `dynamic(() => import(...), { ssr: false })`.
    7. apps/frontend/app/(app)/layout.tsx: add `<a href="/calendario">Calendario</a>` to the nav (after Plantillas).
    8. Create apps/frontend/components/expedientes/FechasTab.tsx (D-04): 'use client'; props `{ expedienteId: string }`. useQuery `['eventos','expediente',expedienteId]` → `listEventos({ expedienteId })` (NO soloCalendario — shows ALL). Render a flat list sorted by fechaInicio asc (RESEARCH Open Q3), each row with titulo, fecha, origen/subtipo, and a visibility toggle (checkbox/switch) that calls `updateEvento(id, { mostrarEnCalendario: !current })` via useMutation + invalidateQueries.
    9. ExpedienteTabs.tsx: replace `{active === 'fechas' && <p>Disponible en Phase 7</p>}` with `{active === 'fechas' && <FechasTab expedienteId={expediente._id} />}`.
    10. Create apps/frontend/components/calendario/CalendarioView.test.tsx (vitest + Testing Library) per <behavior>: render with 1-2 eventos, assert dots appear on the correct day tiles.
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm --filter @lexscribe/frontend test -- CalendarioView && pnpm --filter @lexscribe/frontend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "react-calendar" apps/frontend/package.json` matches
    - `grep "react-calendar/dist/Calendar.css" apps/frontend/components/calendario/CalendarioView.tsx` matches and the file starts with 'use client'
    - `grep "soloCalendario" apps/frontend/app/(app)/calendario/page.tsx` matches
    - `grep "createEvento" apps/frontend/lib/api/eventos.ts` and `grep "countEventosByDocumento" apps/frontend/lib/api/eventos.ts` match
    - `grep "Calendario" apps/frontend/app/(app)/layout.tsx` matches (nav link)
    - `grep "FechasTab" apps/frontend/components/expedientes/ExpedienteTabs.tsx` matches (placeholder replaced)
    - `grep "mostrarEnCalendario" apps/frontend/components/expedientes/FechasTab.tsx` matches (visibility toggle)
    - CalendarioView test exits 0; frontend build exits 0
  </acceptance_criteria>
  <done>react-calendar installed; eventos API client complete; CalendarioView/EventosList/EventoModal built; /calendario page filters by expediente+range showing only visible events; Fechas tab shows all events with visibility toggle; nav link added; CalendarioView test green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: FL-8 Añadir fecha modal + FL-9 delete-with-events modal in DocumentosList</name>
  <read_first>
    - apps/frontend/components/documentos/DocumentosList.tsx (current deleteMut at line ~33 + Eliminar button at line ~118; per-row layout)
    - apps/frontend/lib/api/documentos.ts (deleteDocumento at line ~140 — must accept eventosAction)
    - apps/frontend/lib/api/eventos.ts (createEvento, countEventosByDocumento — from Task 2)
    - apps/frontend/components/documentos/RolFaltanteModal.tsx (inline modal pattern)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Pattern 6 deleteDocumento change, Pitfall 3 pre-delete count, D-06 modal fields, D-10 modal copy)
  </read_first>
  <behavior>
    - AnadirFechaModal.test.tsx: submitting the modal calls createEvento with origen:'documento', the given documentoId + expedienteId, subtipo, fechaInicio, and mostrarEnCalendario from the toggle.
    - BorrarDocumentoModal.test.tsx: renders the event count message; clicking "Conservar eventos" calls onConfirm('conservar'); "Eliminar eventos" calls onConfirm('eliminar').
  </behavior>
  <action>
    1. apps/frontend/lib/api/documentos.ts: change `deleteDocumento(id, eventosAction: 'conservar' | 'eliminar' = 'conservar')` to call `DELETE /documentos/${id}?eventosAction=${eventosAction}` (RESEARCH Pattern 6).
    2. Create apps/frontend/components/documentos/AnadirFechaModal.tsx (FL-8/D-06): inline modal (RolFaltanteModal pattern). Props `{ documentoId: string; expedienteId: string; onClose: () => void; onCreated: () => void }`. Fields: fechaInicio (date input), descripcion (text), subtipo (select: fecha_limite | aviso | recordatorio), `mostrarEnCalendario` (checkbox, default true). On submit: `createEvento({ origen: 'documento', documentoId, expedienteId, subtipo, titulo: descripcion || subtipo, fechaInicio: <ISO>, mostrarEnCalendario })`, then onCreated() + onClose(). titulo falls back to subtipo if descripcion empty.
    3. Create apps/frontend/components/documentos/BorrarDocumentoModal.tsx (FL-9/D-10): inline modal. Props `{ count: number; onConfirm: (action: 'conservar' | 'eliminar') => void; onClose: () => void }`. Copy: `Este documento tiene {count} evento(s) asociado(s). ¿Conservar o eliminar los eventos del expediente?`. Two buttons: "Conservar eventos" → onConfirm('conservar'); "Eliminar eventos" → onConfirm('eliminar'); plus Cancelar → onClose.
    4. DocumentosList.tsx:
       - Add per-row "Añadir fecha" button that sets state `{ addDateFor: doc._id }` and renders AnadirFechaModal (onCreated invalidates `['eventos','expediente',expedienteId]` and any calendar query).
       - Replace the direct `deleteMut.mutate(doc._id)` flow: on "Eliminar" click, first call `countEventosByDocumento(doc._id)`. If `total > 0`, open BorrarDocumentoModal with that count; on confirm call `deleteDocumento(doc._id, action)`. If `total === 0`, call `deleteDocumento(doc._id, 'conservar')` directly. Update `deleteMut` to `mutationFn: ({ id, action }) => deleteDocumento(id, action)` and invalidate `['documentos', expedienteId]` on success.
    5. Create AnadirFechaModal.test.tsx and BorrarDocumentoModal.test.tsx (vitest) per <behavior> (mock the eventos/documentos api clients).
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm --filter @lexscribe/frontend test -- AnadirFechaModal BorrarDocumentoModal && pnpm --filter @lexscribe/frontend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "eventosAction" apps/frontend/lib/api/documentos.ts` matches
    - `grep "origen: 'documento'" apps/frontend/components/documentos/AnadirFechaModal.tsx` matches
    - `grep "Conservar" apps/frontend/components/documentos/BorrarDocumentoModal.tsx` and `grep "Eliminar eventos" apps/frontend/components/documentos/BorrarDocumentoModal.tsx` match
    - `grep "countEventosByDocumento" apps/frontend/components/documentos/DocumentosList.tsx` matches (pre-delete check, Pitfall 3)
    - `grep "AnadirFechaModal" apps/frontend/components/documentos/DocumentosList.tsx` matches
    - AnadirFechaModal + BorrarDocumentoModal tests exit 0; frontend build exits 0
  </acceptance_criteria>
  <done>FL-8 modal creates a documento-origin event from a document row; FL-9 delete pre-checks event count and shows conservar/eliminar modal that drives the eventosAction query param; both modal tests green; frontend builds.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Visual verification of calendar + FL-8/FL-9 flows</name>
  <what-built>
    Global /calendario page (react-calendar grid with event dots + day list + (+) manual event modal), expediente Fechas tab (all events + visibility toggle), FL-8 "Añadir fecha" modal from a document row, FL-9 delete-with-events modal, and the "Calendario" nav link. Backend remove() honors eventosAction.
  </what-built>
  <action>Pause for human verification. The executor has already built and tested the calendar feature in Tasks 1-3; this checkpoint is a manual visual check of react-calendar rendering and the FL-8/FL-9 flows (07-VALIDATION.md manual-only items) that unit tests cannot fully assert. Follow the steps in how-to-verify and wait for the user.</action>
  <verify><automated>echo "Manual checkpoint — human verifies calendar visuals + FL-8/FL-9 flows per how-to-verify"</automated></verify>
  <done>User types approved after confirming calendar dots, visibility filter, manual-event color, and FL-9 conservar/eliminar flow all work.</done>
  <how-to-verify>
    1. Run the app (`pnpm dev`) and log in. Confirm "Calendario" appears in the top nav and `/calendario` loads with a month grid (no console error about react-calendar / CSS — Pitfall 2).
    2. Open an expediente → Documentos tab → click "Añadir fecha" on a document; set subtipo + fecha + leave "mostrar en calendario" checked; save.
    3. Go to the expediente Fechas tab: the new event appears. Toggle its visibility off.
    4. Go to /calendario: the event with visibility ON appears as a dot on its day; the toggled-off one does NOT appear. Apply the expediente filter and a date range and confirm the list narrows.
    5. Click (+) on /calendario, create a manual event with a distinct color preset; confirm it shows with a different color than the first event.
    6. Back in Documentos, click "Eliminar" on the document that has events → confirm the modal shows the event count and offers Conservar/Eliminar. Choose "Eliminar"; confirm the document and its events disappear from the Fechas tab and calendar.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues (e.g., dots not rendering, visibility filter wrong, modal copy off).</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend test` green (documentos.service.spec incl. eventosAction cases) + backend build (no circular-dep warning)
- `pnpm --filter @lexscribe/frontend test` green (CalendarioView, AnadirFechaModal, BorrarDocumentoModal)
- `pnpm --filter @lexscribe/frontend build` succeeds
- Human checkpoint approved (visual calendar + FL-8/FL-9 flows)
</verification>

<success_criteria>
- CAL-01 (frontend): "Añadir fecha" modal creates a documento-origin event.
- CAL-03: /calendario shows only mostrarEnCalendario=true events with expediente+range filters; Fechas tab shows all with toggle.
- CAL-04: manual events get a preset color visible in the calendar/list.
- CAL-05: deleting a document with events prompts conservar/eliminar and applies the choice (backend remove honors eventosAction).
</success_criteria>

<output>
After completion, create `.planning/phases/07-calendario-y-facturaci-n/07-03-SUMMARY.md`
</output>
