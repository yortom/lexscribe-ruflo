---
phase: 07-calendario-y-facturaci-n
plan: 04
type: execute
wave: 3
depends_on: ["07-02", "07-03"]
files_modified:
  - apps/frontend/lib/api/facturacion.ts
  - apps/frontend/components/expedientes/FacturacionTab.tsx
  - apps/frontend/components/expedientes/ExpedienteTabs.tsx
  - apps/frontend/components/expedientes/FacturacionTab.test.tsx
autonomous: false
requirements: [FAC-01, FAC-02, FAC-03, FAC-04, FAC-05]
must_haves:
  truths:
    - "Expediente Facturacion tab shows an inline editable table of entries"
    - "'Nueva entrada' adds a row with concepto/importe/fecha(default today)/numero/notas; save per row"
    - "Each row has an inline colored status dropdown (pendiente/facturado/cobrado)"
    - "Editing or deleting an entry recalculates the total + per-status breakdown shown in the header"
    - "Total and subtotals come from GET /facturas/totales/:expedienteId, formatted € es-ES"
  artifacts:
    - path: "apps/frontend/lib/api/facturacion.ts"
      provides: "listFacturas/createFactura/updateFactura/updateEstadoFactura/deleteFactura/getTotalesFactura"
      exports: ["listFacturas", "getTotalesFactura"]
    - path: "apps/frontend/components/expedientes/FacturacionTab.tsx"
      provides: "inline editable billing table + status dropdown + totals header"
      contains: "getTotalesFactura"
  key_links:
    - from: "apps/frontend/components/expedientes/FacturacionTab.tsx"
      to: "GET /facturas/totales/:expedienteId"
      via: "React Query, invalidated on every mutation"
      pattern: "totales"
    - from: "apps/frontend/components/expedientes/ExpedienteTabs.tsx"
      to: "FacturacionTab"
      via: "facturacion tab placeholder replacement"
      pattern: "FacturacionTab"
---

<objective>
Build the frontend Facturacion tab (D-12/D-13/D-14) against the FacturacionModule API from 07-02. Inline editable table, "Nueva entrada" row, inline colored status dropdown per row, and a header showing total general + per-status subtotals recalculated on every mutation.

Covers FAC-01 (tab from detail), FAC-02 (create entries), FAC-03 (status dropdown), FAC-04 (edit/delete inline), FAC-05 (total + breakdown display).

Purpose: Complete the billing feature UI. Shares only `ExpedienteTabs.tsx` with 07-03 (07-03 replaces the `fechas` placeholder line, this plan replaces the `facturacion` placeholder line). **Serialized after 07-03 (depends_on includes 07-03)** so the two placeholder replacements never race; this plan first confirms 07-03's `FechasTab` wiring survived before editing the `facturacion` line. Includes a human-verify checkpoint for status badge colors + total recalculation (FAC-03 visual per 07-VALIDATION.md).
Output: facturacion API client, FacturacionTab component, ExpedienteTabs wiring, FacturacionTab test.
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
@.planning/phases/07-calendario-y-facturaci-n/07-02-SUMMARY.md

<interfaces>
<!-- Contracts from 07-02 (already built). Use directly. -->
From @lexscribe/shared-types: `Factura`, `EstadoFactura` ('pendiente'|'facturado'|'cobrado'), `FacturaListResponse`, `FacturaTotales` ({ total, pendiente, facturado, cobrado }).
From @lexscribe/shared-validation: `CreateFacturaSchema`, `UpdateFacturaSchema`, `UpdateEstadoSchema`, `QueryFacturaSchema`.

Backend endpoints (07-02): POST /facturas, GET /facturas?expedienteId=:id, GET /facturas/totales/:expedienteId → FacturaTotales, PATCH /facturas/:id/estado, PATCH /facturas/:id, DELETE /facturas/:id.

Existing frontend API client pattern: apps/frontend/lib/api/documentos.ts (apiFetch<T>, ApiError, query string).
Existing tab wiring: apps/frontend/components/expedientes/ExpedienteTabs.tsx (`{active === 'facturacion' && <p>Disponible en Phase 7</p>}` at line ~57).

Importe formatting (D, RESEARCH): `new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)`.
Status badge colors (D-13): pendiente=amber, facturado=blue, cobrado=green (Tailwind bg-*-100 text-*-700).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: facturacion API client</name>
  <read_first>
    - apps/frontend/lib/api/documentos.ts (apiFetch<T>, ApiError, query-string + method patterns)
    - apps/frontend/lib/api/expedientes.ts (another client to match conventions)
    - .planning/phases/07-calendario-y-facturaci-n/07-02-SUMMARY.md (confirm exact endpoint paths)
  </read_first>
  <action>
    Create apps/frontend/lib/api/facturacion.ts mirroring documentos.ts (reuse/replicate apiFetch + ApiError). Functions, typed via @lexscribe/shared-types + @lexscribe/shared-validation:
    - `listFacturas(expedienteId: string, page = 1, limit = 100): Promise<FacturaListResponse>` → GET `/facturas?expedienteId=${expedienteId}&page=${page}&limit=${limit}`.
    - `getTotalesFactura(expedienteId: string): Promise<FacturaTotales>` → GET `/facturas/totales/${expedienteId}`.
    - `createFactura(input: CreateFacturaInput): Promise<Factura>` → POST /facturas.
    - `updateFactura(id: string, patch: UpdateFacturaInput): Promise<Factura>` → PATCH /facturas/:id.
    - `updateEstadoFactura(id: string, estado: EstadoFactura): Promise<Factura>` → PATCH /facturas/:id/estado with body `{ estado }`.
    - `deleteFactura(id: string): Promise<void>` → DELETE /facturas/:id.
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm --filter @lexscribe/frontend build</automated>
  </verify>
  <acceptance_criteria>
    - `apps/frontend/lib/api/facturacion.ts` exists
    - `grep "getTotalesFactura" apps/frontend/lib/api/facturacion.ts` and `grep "updateEstadoFactura" apps/frontend/lib/api/facturacion.ts` match
    - `grep "/facturas/totales/" apps/frontend/lib/api/facturacion.ts` matches
    - frontend build exits 0 (types resolve from shared packages)
  </acceptance_criteria>
  <done>facturacion API client exposes list/totales/create/update/updateEstado/delete with correct endpoint paths; types resolve.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: FacturacionTab component + ExpedienteTabs wiring + test</name>
  <read_first>
    - apps/frontend/components/documentos/DocumentosList.tsx (useQuery/useMutation/invalidateQueries/inline form patterns to mirror)
    - apps/frontend/components/expedientes/ExpedienteTabs.tsx (facturacion placeholder at line ~57; TabKey)
    - apps/frontend/lib/api/facturacion.ts (from Task 1)
    - .planning/phases/07-calendario-y-facturaci-n/07-CONTEXT.md (D-12 inline table, D-13 status dropdown, D-14 total + breakdown)
    - .planning/phases/07-calendario-y-facturaci-n/07-RESEARCH.md (Intl.NumberFormat es-ES EUR)
  </read_first>
  <behavior>
    - FacturacionTab.test.tsx: renders rows from a mocked listFacturas; header shows total + subtotals from mocked getTotalesFactura formatted as € es-ES; changing a row's estado calls updateEstadoFactura(id, newEstado) and invalidates the totales query.
    - FacturacionTab.test.tsx (W7 — API client URL assertions): with global.fetch stubbed, assert getTotalesFactura(id) requests /facturas/totales/{id}, listFacturas(id) requests /facturas?expedienteId={id}, createFactura POSTs /facturas, updateEstadoFactura(id, estado) PATCHes /facturas/{id}/estado with body { estado }, and deleteFactura(id) DELETEs /facturas/{id}.
  </behavior>
  <action>
    1. Create apps/frontend/components/expedientes/FacturacionTab.tsx: 'use client'; props `{ expedienteId: string }`.
       - useQuery `['facturas', expedienteId]` → listFacturas(expedienteId).
       - useQuery `['facturas','totales', expedienteId]` → getTotalesFactura(expedienteId).
       - Header (D-14): show `Total: {fmt(totales.total)}` plus three subtotal badges `Pendiente {fmt(totales.pendiente)} · Facturado {fmt(totales.facturado)} · Cobrado {fmt(totales.cobrado)}` using `const fmt = (v:number) => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v)`.
       - Table (D-12): columns concepto, importe, fecha, numero, notas, estado, acciones. Each existing row is inline-editable (controlled inputs); a "Guardar" per-row button calls updateFactura(id, patch); a "Eliminar" button calls deleteFactura(id).
       - "Nueva entrada" button adds a draft row (concepto/importe/fecha[default `new Date().toISOString()` → today]/numero/notas); its save calls createFactura({ expedienteId, ... }) — estado defaults pendiente server-side.
       - Status column (D-13): inline `<select>` styled as a colored badge (pendiente=amber, facturado=blue, cobrado=green) whose onChange calls updateEstadoFactura(id, value).
       - On every mutation success: invalidate both `['facturas', expedienteId]` and `['facturas','totales', expedienteId]` so the totals recalc (FAC-05).
    2. ExpedienteTabs.tsx: FIRST confirm 07-03's `FechasTab` wiring is present (the `fechas` line already replaced) — do NOT overwrite it. Then replace `{active === 'facturacion' && <p>Disponible en Phase 7</p>}` with `{active === 'facturacion' && <FacturacionTab expedienteId={expediente._id} />}`. Import FacturacionTab. Both `FechasTab` and `FacturacionTab` imports + tab branches must coexist after this edit.
    3. Create FacturacionTab.test.tsx (vitest) per <behavior>: (a) mock the facturacion api client, render within a QueryClientProvider, assert rows + formatted totals render and estado change triggers updateEstadoFactura; (b) add a describe('api client') block that stubs global.fetch and asserts each client function hits the correct /facturas... URL + method + body (W7).
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm --filter @lexscribe/frontend test -- FacturacionTab && pnpm --filter @lexscribe/frontend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep "getTotalesFactura" apps/frontend/components/expedientes/FacturacionTab.tsx` matches
    - `grep "updateEstadoFactura" apps/frontend/components/expedientes/FacturacionTab.tsx` matches
    - `grep "Intl.NumberFormat('es-ES'" apps/frontend/components/expedientes/FacturacionTab.tsx` matches
    - `grep "facturas','totales'" apps/frontend/components/expedientes/FacturacionTab.tsx` matches (totales query invalidated on mutation)
    - `grep "FacturacionTab" apps/frontend/components/expedientes/ExpedienteTabs.tsx` matches (placeholder replaced)
    - `grep "FechasTab" apps/frontend/components/expedientes/ExpedienteTabs.tsx` matches (07-03 wiring preserved — no overwrite, W5)
    - `grep "/facturas/totales/" apps/frontend/components/expedientes/FacturacionTab.test.tsx` matches (W7 API client URL assertion)
    - FacturacionTab test exits 0; frontend build exits 0
  </acceptance_criteria>
  <done>FacturacionTab renders an inline editable table with per-row status dropdown and a total + per-status breakdown header formatted in € es-ES; mutations invalidate the totals query so they recalc; tab wired into ExpedienteTabs; test green.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of billing tab</name>
  <what-built>
    Expediente Facturacion tab: inline editable entries table, "Nueva entrada" row, inline colored status dropdown per row, and a header with total general + per-status subtotals (€ es-ES) that recalculates on every change.
  </what-built>
  <action>Pause for human verification. The executor has already built and tested the Facturacion tab in Tasks 1-2; this checkpoint is a manual visual check of the status badge colors and live total recalculation (07-VALIDATION.md manual-only items). Follow the steps in how-to-verify and wait for the user.</action>
  <verify><automated>echo "Manual checkpoint — human verifies billing table, status badges, and total recalculation per how-to-verify"</automated></verify>
  <done>User types approved after confirming entry creation, default today fecha, status badge color change, inline edit, delete, and live total + subtotal recalculation.</done>
  <how-to-verify>
    1. Run the app (`pnpm dev`), log in, open an expediente → Facturacion tab.
    2. Click "Nueva entrada"; fill concepto + importe (e.g. 100.50); confirm fecha defaults to today; save. Confirm the row appears and the total updates to 100,50 €.
    3. Add a second entry (e.g. 50.00). Confirm total = 150,50 € and the "Pendiente" subtotal = 150,50 €.
    4. Change the first row's estado to "facturado" via the dropdown; confirm the badge color changes and the subtotals update (Pendiente 50,00 € · Facturado 100,50 €) while total stays 150,50 €.
    5. Edit the second entry's importe inline and save; confirm total recalculates.
    6. Delete an entry; confirm it disappears and the total + subtotals drop accordingly.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues (e.g., total not recalculating, badge colors wrong, € formatting off).</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/frontend test` green (FacturacionTab)
- `pnpm --filter @lexscribe/frontend build` succeeds
- Human checkpoint approved (billing table + status badges + total recalculation)
</verification>

<success_criteria>
- FAC-01: Facturacion tab accessible from expediente detail.
- FAC-02: "Nueva entrada" creates an entry with default today fecha + default pendiente estado.
- FAC-03: inline status dropdown changes estado with colored badge.
- FAC-04: inline edit + delete work at any time.
- FAC-05: total + per-status subtotals shown (€ es-ES) and recalculate on every mutation via the totales query.
</success_criteria>

<output>
After completion, create `.planning/phases/07-calendario-y-facturaci-n/07-04-SUMMARY.md`
</output>
