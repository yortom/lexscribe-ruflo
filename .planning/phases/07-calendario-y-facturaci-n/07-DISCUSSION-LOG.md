# Phase 7: Calendario y Facturación - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 07-calendario-y-facturaci-n
**Areas discussed:** Date visibility in calendar, Calendar library & view style, Adding dates to a document (FL-8), Calendar location & navigation, Billing tab interaction, Status UI, Total display

---

## Area selection

User selected ALL offered gray areas and added a custom concern via free text:
"pick up dates of the expediente that will be used to show them in the calendar (not all dates should be shown)" — folded in as the **Date visibility** area.

---

## Date visibility in calendar

| Option | Description | Selected |
|--------|-------------|----------|
| Per-event 'show in calendar' toggle | Visibility flag per event; always in Fechas tab, only flagged in global calendar | ✓ |
| Filter-only (all events show) | All events shown; narrow via expediente + range filters | |
| By subtype default | Certain subtypes always show; others opt-in | |

**User's choice:** Per-event 'show in calendar' toggle
**Notes:** Requires a new field on the `eventos` schema (not in DATOS.md §4.6) → data-model change to register in changelog.

---

## Calendar library & view style

| Option | Description | Selected |
|--------|-------------|----------|
| react-calendar (month grid) + event list | Lightweight month grid + list panel, Tailwind-fit, small bundle | ✓ |
| FullCalendar | Rich month/week/day, heavier bundle | |
| Custom view (no dependency) | Tailwind-only month grid + list, zero deps, more code | |

**User's choice:** react-calendar (month grid) + event list
**Notes:** Adds `react-calendar` as the only new frontend UI dependency.

---

## Adding dates to a document (FL-8)

| Option | Description | Selected |
|--------|-------------|----------|
| Modal from the document list | 'Añadir fecha' per-row action opening a modal; reuses RolFaltanteModal pattern | ✓ |
| New document detail page | /expedientes/[id]/documentos/[docId] with Fechas section | |
| Inline expand row | Expand list row to reveal dates editor | |

**User's choice:** Modal from the document list
**Notes:** No document detail view exists today; modal avoids building a new route.

---

## Calendar location & navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Global page + expediente Fechas tab | /calendario (filters) AND per-expediente Fechas tab | ✓ |
| Global page only | Only /calendario | |
| Expediente tab only | No global page | |

**User's choice:** Global page + expediente Fechas tab
**Notes:** Satisfies F-060 (global) and F-006 (per-expediente).

---

## Billing tab interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Inline editable table | Rows editable in place; 'Nueva entrada' adds a row | ✓ |
| Modal form | List + modal for create/edit | |
| Row expand | Rows expand to edit form | |

**User's choice:** Inline editable table

---

## Status UI (pendiente / facturado / cobrado)

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdown on each row | Colored select/badge per row, no edit form | ✓ |
| Only in the edit form | Status changed by editing the entry | |

**User's choice:** Inline dropdown on each row

---

## Total display

| Option | Description | Selected |
|--------|-------------|----------|
| Single total + breakdown by status | Grand total + subtotals per status | ✓ |
| Single total only | One number (sum of active entries) | |

**User's choice:** Single total + breakdown by status

---

## Claude's Discretion

- Event color implementation → preset palette (~6-8 colors), not free color-picker (CAL-04).
- Manual event creation via `(+)` button/form on the calendar (CAL-02).
- Exact backend compensation order for multi-collection writes (DATOS §6).
- Default value of the visibility field; exact field name.
- Backend module structure (EventosModule / FacturacionModule), forwardRef for FL-9.
- Amount formatting (€, es-ES), pagination/order of billing entries.

## Deferred Ideas

- Automatic date calculation by rules (F-031) — post-MVP.
- Consolidated cross-expediente billing view (F-075) — post-MVP.
- External calendar integrations — out of scope.
