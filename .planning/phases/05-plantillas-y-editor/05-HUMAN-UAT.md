---
status: partial
phase: 05-plantillas-y-editor
source: [05-VERIFICATION.md, 05-03-frontend-editor-PLAN.md]
started: 2026-05-31T21:45:01Z
updated: 2026-05-31T21:45:01Z
---

## Current Test

[awaiting human testing — requires live stack: backend + frontend (`pnpm dev`), MongoDB + MinIO up, logged in]

## Tests

### 1. FL-2 — Create plantilla + variable detection + highlight
expected: At /plantillas → "Nueva plantilla", paste `En Madrid, a {{expediente.fechaCreacion}}, comparecen {{contacto.vendedor.nombre}} con NIF {{contacto.vendedor.nif}}.` → variables highlighted blue; panel groups "expediente" (fechaCreacion) and "contacto" (vendedor.nombre, vendedor.nif). Save → redirected to editor with version 1.
result: [pending]

### 2. F-030b — Unknown-type block
expected: Add line `{{contrato.algo}}` → it highlights RED and Guardar is blocked with a message naming "contrato" and the line; remove it → save works.
result: [pending]

### 3. PLAN-04 — Declare variable (+ Pitfall 4 non-declarable)
expected: Add `{{expediente.honorariosBase}}` → "Declarar variables" → tipoDato "numero" → Declarar → no error (GET /api/v1/esquemas/expediente shows honorariosBase, or modal no longer lists it). `{{fecha.hoy}}` shows as NOT declarable in the modal.
result: [pending]

### 4. FL-7 — Insert cláusula + renumber
expected: In a template with `CLÁUSULA PRIMERA.- Objeto` / `CLÁUSULA SEGUNDA.- Precio`, place cursor after PRIMERA, "Insertar cláusula", filter by label, pick one → inserted as "CLÁUSULA SEGUNDA.-" and the old SEGUNDA becomes "CLÁUSULA TERCERA.-".
result: [pending]

### 5. PLAN-06 — Versioning
expected: Edit contenido + Guardar → version increments (v2); GET /plantillas/:id/versions shows v1 (inactive) + v2 (active); the list page shows only the active version.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
