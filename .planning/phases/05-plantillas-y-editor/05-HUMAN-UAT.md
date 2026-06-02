---
status: complete
phase: 05-plantillas-y-editor
source: [05-VERIFICATION.md, 05-03-frontend-editor-PLAN.md]
started: 2026-05-31T21:45:01Z
updated: 2026-06-02T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. FL-2 — Create plantilla + variable detection + highlight
expected: At /plantillas → "Nueva plantilla", paste `En Madrid, a {{expediente.fechaCreacion}}, comparecen {{contacto.vendedor.nombre}} con NIF {{contacto.vendedor.nif}}.` → variables highlighted blue; panel groups "expediente" (fechaCreacion) and "contacto" (vendedor.nombre, vendedor.nif). Save → redirected to editor with version 1.
result: pass
note: "Menu/route initially missing because dev server ran from parent repo (no Phase 5 code); resolved by restarting stack from worktree. Not a code defect."

### 2. F-030b — Unknown-type block
expected: Add line `{{contrato.algo}}` → it highlights RED and Guardar is blocked with a message naming "contrato" and the line; remove it → save works.
result: pass

### 3. PLAN-04 — Declare variable (+ Pitfall 4 non-declarable)
expected: Add `{{expediente.honorariosBase}}` → "Declarar variables" → tipoDato "numero" → Declarar → no error (GET /api/v1/esquemas/expediente shows honorariosBase, or modal no longer lists it). `{{fecha.hoy}}` shows as NOT declarable in the modal.
result: pass
note: "Two bugs found and fixed during UAT (declaration itself always persisted — DB confirmed). (1) 404 'plantilla not found' when declaring after a save: stale version id; fixed in 58e9927 (backend tolerates inactive version id + frontend navigates to new version). (2) declared variable did not disappear from modal: page never consulted the esquema; fixed in 896edfc (esquemas client + hide already-declared + show fecha/clausula as no-declarable). Re-tested pass."

### 4. FL-7 — Insert cláusula + renumber
expected: In a template with `CLÁUSULA PRIMERA.- Objeto` / `CLÁUSULA SEGUNDA.- Precio`, place cursor after PRIMERA, "Insertar cláusula", filter by label, pick one → inserted as "CLÁUSULA SEGUNDA.-" and the old SEGUNDA becomes "CLÁUSULA TERCERA.-".
result: pass
note: "Initial 'inserts at top' report was an incorrect test setup (content lacked recognized CLÁUSULA X.- headers → afterNumero=0 fallback). Renumber logic verified correct via harness (afterNumero=1 → new SEGUNDA, old SEGUNDA→TERCERA). Re-tested pass."

### 5. PLAN-06 — Versioning
expected: Edit contenido + Guardar → version increments (v2); GET /plantillas/:id/versions shows v1 (inactive) + v2 (active); the list page shows only the active version.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
