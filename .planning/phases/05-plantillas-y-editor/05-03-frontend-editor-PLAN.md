---
phase: 05-plantillas-y-editor
plan: 03
type: execute
wave: 3
depends_on: ["05-02"]
files_modified:
  - apps/frontend/package.json
  - apps/frontend/lib/api/plantillas.ts
  - apps/frontend/components/plantillas/PlantillaEditor.tsx
  - apps/frontend/components/plantillas/variableHighlight.ts
  - apps/frontend/components/plantillas/VariablesPanel.tsx
  - apps/frontend/components/plantillas/InsertarClausulaModal.tsx
  - apps/frontend/components/plantillas/DeclararVariableModal.tsx
  - apps/frontend/components/plantillas/PlantillaTable.tsx
  - apps/frontend/app/(app)/plantillas/page.tsx
  - apps/frontend/app/(app)/plantillas/nuevo/page.tsx
  - apps/frontend/app/(app)/plantillas/[id]/page.tsx
  - apps/frontend/app/(app)/layout.tsx
  - apps/frontend/__tests__/plantillas/PlantillaEditor.test.tsx
  - apps/frontend/__tests__/plantillas/VariablesPanel.test.tsx
  - apps/frontend/__tests__/plantillas/InsertarClausulaModal.test.tsx
  - apps/frontend/__tests__/plantillas/DeclararVariableModal.test.tsx
autonomous: false
requirements: [PLAN-05, PLAN-01, PLAN-02, PLAN-03, PLAN-04, CLAU-04]
must_haves:
  truths:
    - "Editor (CodeMirror 6) highlights valid {{...}} blue and unknown-type {{...}} red in real time"
    - "Variables panel lists detected variables grouped by tipoObjeto, updating as the user types"
    - "Insertar cláusula modal filters the Phase 4 clausula library by label and inserts at cursor with renumber (CLAU-04)"
    - "Declarar variable modal lists new fields and lets the user pick tipoDato, persisting via the backend (PLAN-04)"
    - "Saving an edited template creates a new version; unknown-type variables block save"
  artifacts:
    - path: "apps/frontend/components/plantillas/PlantillaEditor.tsx"
      provides: "CM6 editor with highlight decorations + insert-at-cursor API"
      min_lines: 60
    - path: "apps/frontend/lib/api/plantillas.ts"
      provides: "list/get/create/update/declararVariable/versions API client"
      contains: "declararVariable"
    - path: "apps/frontend/components/plantillas/InsertarClausulaModal.tsx"
      provides: "clausula library filter + insert (CLAU-04)"
      min_lines: 40
  key_links:
    - from: "PlantillaEditor.tsx"
      to: "@lexscribe/shared-validation parseVariables"
      via: "live parse on doc change"
      pattern: "parseVariables\\("
    - from: "InsertarClausulaModal.tsx"
      to: "@lexscribe/shared-validation insertClausulaAndRenumber"
      via: "insert + renumber on confirm"
      pattern: "insertClausulaAndRenumber\\("
    - from: "lib/api/plantillas.ts"
      to: "backend /plantillas endpoints"
      via: "apiFetch"
      pattern: "/plantillas"
---

<objective>
Build the Next.js editor UI for plantillas: a CodeMirror 6 editor with live variable highlighting, a real-time variables panel, an insert-cláusula modal (reusing the Phase 4 clausula library with renumber), and a declare-variable modal. Wire an API client and pages, add the nav link. Reuses the SAME shared parser/renumber logic the backend uses (no duplication).

Purpose: This is the user-facing surface of Phase 5 (PLAN-05) and the integration point for PLAN-01..04 + CLAU-04 via UI. It is non-autonomous because the editor needs human UAT (FL-2, FL-7).
Output: plantillas editor + modals + pages + API client + component tests, plus a UAT checkpoint.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@docs/FUNCIONAL.md
@docs/ARQUITECTURA.md
@apps/frontend/lib/api/clausulas.ts
@apps/frontend/components/clausulas/ClausulaForm.tsx
@apps/frontend/components/clausulas/ClausulaTable.tsx
@apps/frontend/app/(app)/clausulas/page.tsx
@apps/frontend/app/(app)/clausulas/nuevo/page.tsx
@apps/frontend/app/(app)/clausulas/[id]/page.tsx
@apps/frontend/app/(app)/layout.tsx
@apps/frontend/package.json

<interfaces>
From @lexscribe/shared-validation (Wave 1):
  parseVariables(texto): VariableDetectada[]  // {raw,tipoObjeto,rol,campo,esArray,valido,linea,columna}
  groupByTipoObjeto(vars): { tipoObjeto, valido, variables }[]
  insertClausulaAndRenumber(texto, clausulaTexto, afterNumero): string
  detectClausulaHeaders(texto): ClausulaHeader[]
  CreatePlantillaSchema, UpdatePlantillaSchema, DeclararVariableSchema (zodResolver targets)
From @lexscribe/shared-types: Plantilla, VariableDetectada, PlantillaListResponse; Clausula, ClausulaListResponse.

API client pattern (lib/api/clausulas.ts): apiFetch<T>(path, init) with session token + refresh-on-401; ApiError{code,message,status}. Reuse this; create lib/api/plantillas.ts in the same shape.

Form pattern (ClausulaForm.tsx): react-hook-form + zodResolver(Schema) + Tailwind.
Page pattern: 'use client' + @tanstack/react-query useQuery/useMutation/useQueryClient; useDebounce hook (@/hooks/useDebounce); Next.js 14 SYNC params (`params: { id: string }`, NOT use(params)).
Tests live in apps/frontend/__tests__/<module>/*.test.tsx (vitest + @testing-library/react + jsdom).

Clausula library reuse (CLAU-04, D-06): GET /clausulas?label=<x> already exists (listClausulas in lib/api/clausulas.ts). The Insertar modal calls listClausulas({label}) to filter.

Backend endpoints (Wave 2): GET /plantillas, GET /plantillas/:id, GET /plantillas/:id/versions, POST /plantillas, POST /plantillas/upload (multipart), PATCH /plantillas/:id (new version), POST /plantillas/:id/declarar-variable, DELETE /plantillas/:id.

CodeMirror 6 packages (RESEARCH versions): @codemirror/state, @codemirror/view, @codemirror/commands, @codemirror/language. Pin to ^6 ranges. CM6 is framework-agnostic; mount via useRef + EditorView in a useEffect.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install CM6 + API client + PlantillaEditor with highlight + VariablesPanel</name>
  <read_first>
    - apps/frontend/lib/api/clausulas.ts (apiFetch + ApiError + session/refresh)
    - apps/frontend/app/(app)/clausulas/page.tsx (react-query page pattern)
    - 05-01 variable-parser.ts (parseVariables/groupByTipoObjeto output)
    - docs/ARQUITECTURA.md §4.3 (editor expectations)
  </read_first>
  <action>
    1. Add to apps/frontend/package.json dependencies (CM6): `"@codemirror/state": "^6.4.1"`, `"@codemirror/view": "^6.34.1"`, `"@codemirror/commands": "^6.7.1"`, `"@codemirror/language": "^6.10.3"`. Run `pnpm install` from root.

    2. Create `apps/frontend/lib/api/plantillas.ts` mirroring clausulas.ts (reuse the same apiFetch/ApiError/session/refresh imports — DO NOT redefine apiFetch; either import from a shared module or replicate exactly as clausulas does). Functions:
      listPlantillas(query): GET /plantillas?... -> PlantillaListResponse
      getPlantilla(id): GET /plantillas/:id -> Plantilla
      getPlantillaVersions(id): GET /plantillas/:id/versions -> Plantilla[]
      createPlantilla(data: CreatePlantillaInput): POST /plantillas -> Plantilla
      uploadPlantilla(file: File, nombre: string): POST /plantillas/upload (FormData, no Content-Type header so browser sets multipart boundary) -> Plantilla
      updatePlantilla(id, data: UpdatePlantillaInput): PATCH /plantillas/:id -> Plantilla
      declararVariable(id, data: DeclararVariableInput): POST /plantillas/:id/declarar-variable -> void
      deletePlantilla(id): DELETE /plantillas/:id -> void
      NOTE: uploadPlantilla must NOT set 'Content-Type': 'application/json'; build a variant fetch for FormData.

    3. Create `apps/frontend/components/plantillas/variableHighlight.ts` — CM6 decoration logic. Export a function buildDecorations(view: EditorView): DecorationSet that runs parseVariables(view.state.doc.toString()) and maps each VariableDetectada to a Decoration.mark with class `cm-var-valid` (valido) or `cm-var-invalid` (!valido). Compute absolute offset from {linea,columna} via view.state.doc.line(linea).from + (columna-1) and length = raw.length. Export a ViewPlugin that recomputes decorations on docChanged. (Inline CSS classes: blue for valid, red underline for invalid — define via EditorView.theme or a <style> tag in the editor component.)

    4. Create `apps/frontend/components/plantillas/PlantillaEditor.tsx` ('use client'):
      Props: { value: string; onChange: (v: string) => void; }
      - useRef<HTMLDivElement> host + useRef<EditorView>.
      - useEffect on mount: new EditorView({ doc: value, parent: hostRef.current, extensions: [ highlightViewPlugin, EditorView.updateListener.of(u => { if (u.docChanged) onChange(u.state.doc.toString()); }), EditorView.theme({ '.cm-var-valid': { color:'#2563eb' }, '.cm-var-invalid': { color:'#dc2626', textDecoration:'underline wavy' } }) ] }); destroy on unmount.
      - Expose an imperative insertAtCursor(text: string) via useImperativeHandle + forwardRef: dispatch a transaction inserting `text` at the current selection head. (InsertarClausulaModal uses this.)
      - Sync external value changes (e.g. after clause insert/renumber that replaces whole doc) by dispatching a full-doc replace when prop value differs from view doc.

    5. Create `apps/frontend/components/plantillas/VariablesPanel.tsx` ('use client'):
      Props: { contenido: string }. Compute `const grupos = groupByTipoObjeto(parseVariables(contenido))` (memoize with useMemo). Render grouped list: heading per tipoObjeto (red badge "tipo desconocido" if !valido), each variable showing campo (+ rol if present). Clicking a variable is optional (panel is informational); if implemented, accept onVariableClick(v) prop.

    6. Component tests in apps/frontend/__tests__/plantillas/:
      - PlantillaEditor.test.tsx: render with a value containing "{{expediente.nombre}}" and "{{contrato.x}}"; assert the host renders and (since CM6/jsdom is awkward) at minimum assert insertAtCursor ref method exists and calling onChange works. Keep CM-DOM assertions light (jsdom limits CM6); focus on the contract.
      - VariablesPanel.test.tsx: render with contenido "{{expediente.nombre}}\n{{contacto.cliente.nif}}\n{{contrato.x}}"; assert it shows groups "expediente", "contacto", and an invalid "contrato" marked unknown.
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm vitest run __tests__/plantillas/VariablesPanel.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "@codemirror/view" apps/frontend/package.json -> match
    - grep "declararVariable" apps/frontend/lib/api/plantillas.ts -> match
    - grep "uploadPlantilla" apps/frontend/lib/api/plantillas.ts -> match (FormData, multipart)
    - grep "parseVariables(" apps/frontend/components/plantillas/variableHighlight.ts -> match
    - grep "cm-var-invalid" apps/frontend/components/plantillas/variableHighlight.ts -> match
    - grep "groupByTipoObjeto(" apps/frontend/components/plantillas/VariablesPanel.tsx -> match
    - VariablesPanel.test.tsx passes showing valid + invalid groups
  </acceptance_criteria>
  <done>CM6 installed, API client with declare/upload, editor with valid/invalid highlight + insertAtCursor, live variables panel; panel test green.</done>
</task>

<task type="auto">
  <name>Task 2: InsertarClausulaModal (CLAU-04) + DeclararVariableModal (PLAN-04)</name>
  <read_first>
    - apps/frontend/lib/api/clausulas.ts (listClausulas with label filter)
    - apps/frontend/components/clausulas/ClausulaTable.tsx (list rendering style)
    - apps/frontend/__tests__/expedientes/AsociarContactoModal.test.tsx (modal test pattern)
    - 05-01 clausula-renumber.ts (insertClausulaAndRenumber, detectClausulaHeaders) + variable-parser.ts
    - locked decisions D-04/D-05/D-06 (ordinal marker, insert at cursor + renumber, modal reuses Phase 4 list)
  </read_first>
  <action>
    1. Create `apps/frontend/components/plantillas/InsertarClausulaModal.tsx` ('use client'):
      Props: { contenido: string; afterNumero: number; onInsert: (nuevoContenido: string) => void; onClose: () => void; }
      - A label filter input (debounced) -> useQuery(['clausulas',{label}], () => listClausulas({label})). Render the result list (nombre + labels) with a "Insertar" button per row (reuse the Phase 4 clausula library — D-06).
      - On insert: `const nuevo = insertClausulaAndRenumber(contenido, clausula.texto, afterNumero); onInsert(nuevo); onClose();` (CLAU-04: respects clausulado order, renumbers subsequent — D-05).
      - afterNumero is supplied by the parent: it derives it from the clause header immediately preceding the cursor via detectClausulaHeaders (or 0 if cursor is above all clauses). Document this prop contract in a comment.

    2. Create `apps/frontend/components/plantillas/DeclararVariableModal.tsx` ('use client'):
      Props: { plantillaId: string; nuevasVariables: VariableDetectada[]; onClose: () => void; onDeclared: () => void; }
      - nuevasVariables = variables that are valido (known tipoObjeto) but whose campo is NOT yet in the esquema. (Parent computes this; the modal just renders the list it is given.) IMPORTANT (Pitfall 4 / D-03): only show/allow declaration for tipoObjeto ∈ {expediente, contacto}. For valido variables of tipoObjeto clausula/fecha, render them disabled with a note "no declarable" (these are not dynamic-schema fields).
      - For each declarable variable render a row: label `{tipoObjeto}.{campo}` + a tipoDato <select> (texto default, numero, fecha, booleano — D-02). A "Declarar" button calls declararVariable(plantillaId, { tipoObjeto: v.tipoObjeto, nombre: v.campo, tipoDato }). On all done -> onDeclared(); onClose().

    3. Tests:
      - InsertarClausulaModal.test.tsx: mock listClausulas to return one clausula {nombre, texto:"Pago aplazado"}; render with contenido "CLÁUSULA PRIMERA.- Objeto" and afterNumero=1; click Insertar; assert onInsert called with text containing "CLÁUSULA SEGUNDA.-" (renumber applied).
      - DeclararVariableModal.test.tsx: render with nuevasVariables = [{tipoObjeto:'expediente',campo:'honorariosBase',valido:true,...}, {tipoObjeto:'fecha',campo:'hoy',valido:true,...}]; assert expediente row has a tipoDato select + enabled Declarar; assert fecha row is shown as "no declarable" / disabled (Pitfall 4). Mock declararVariable; click Declarar on the expediente row; assert it was called with {tipoObjeto:'expediente', nombre:'honorariosBase', tipoDato:'texto'}.
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm vitest run __tests__/plantillas/InsertarClausulaModal.test.tsx __tests__/plantillas/DeclararVariableModal.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "insertClausulaAndRenumber(" apps/frontend/components/plantillas/InsertarClausulaModal.tsx -> match
    - grep "listClausulas(" apps/frontend/components/plantillas/InsertarClausulaModal.tsx -> match (Phase 4 library reuse)
    - grep "declararVariable(" apps/frontend/components/plantillas/DeclararVariableModal.tsx -> match
    - grep "no declarable" apps/frontend/components/plantillas/DeclararVariableModal.tsx -> match (clausula/fecha rejected, Pitfall 4)
    - both modal tests pass (renumber + declarable-only-expediente/contacto)
  </acceptance_criteria>
  <done>Insertar modal filters Phase 4 library + inserts with renumber (CLAU-04); Declarar modal lists new vars with tipoDato selector, declares expediente/contacto only; both tests green.</done>
</task>

<task type="auto">
  <name>Task 3: Pages (list / nuevo / editor) + nav link</name>
  <read_first>
    - apps/frontend/app/(app)/clausulas/page.tsx + nuevo/page.tsx + [id]/page.tsx (page patterns)
    - apps/frontend/app/(app)/layout.tsx (nav)
    - apps/frontend/components/clausulas/ClausulaTable.tsx (table pattern for PlantillaTable)
  </read_first>
  <action>
    1. Create `apps/frontend/components/plantillas/PlantillaTable.tsx` mirroring ClausulaTable.tsx: columns nombre, version, fechaActualizacion, # variables; onEdit/onDelete; pagination.

    2. Create `apps/frontend/app/(app)/plantillas/page.tsx` ('use client') mirroring clausulas/page.tsx: useQuery(['plantillas',{search,page}], listPlantillas), search input (debounced), "Nueva plantilla" link to /plantillas/nuevo, PlantillaTable, delete mutation.

    3. Create `apps/frontend/app/(app)/plantillas/nuevo/page.tsx` ('use client'):
      - Two creation modes (PLAN-01): (a) paste/type — a nombre input + PlantillaEditor bound to local contenido state + VariablesPanel; (b) upload — a file input (.txt/.docx) that on .txt reads text into the editor, on .docx calls uploadPlantilla(file, nombre).
      - "Guardar" calls createPlantilla({nombre, contenido, formatoOriginal:'pegado'|'txt'}) (or uploadPlantilla for .docx). On unknown-type variables the backend returns 400 — surface ApiError.message (F-030b) and ALSO pre-block client-side: disable Guardar if parseVariables(contenido) has any !valido (show which). On success router.push(`/plantillas/${id}`).

    4. Create `apps/frontend/app/(app)/plantillas/[id]/page.tsx` ('use client', SYNC params):
      - useQuery(['plantilla',id], () => getPlantilla(id)); local contenido state initialized from data.contenido.
      - PlantillaEditor (with ref) + VariablesPanel + buttons: "Insertar cláusula" (opens InsertarClausulaModal, computing afterNumero from detectClausulaHeaders relative to cursor), "Declarar variables" (opens DeclararVariableModal with the valido-but-new variables — for MVP you may pass all valido expediente/contacto variables; backend addParametro is idempotent), "Guardar" (PATCH -> new version via updatePlantilla; invalidate ['plantilla',id]; client-block on !valido). Show current version number and a note that saving creates a new version (PLAN-06).

    5. Update `apps/frontend/app/(app)/layout.tsx` nav: add `<a href="/plantillas">Plantillas</a>` alongside the existing Contactos/Cláusulas/Expedientes links.

    6. Run frontend type-check + the plantillas test suite to ensure no regressions.
  </action>
  <verify>
    <automated>cd apps/frontend && pnpm type-check && pnpm vitest run __tests__/plantillas</automated>
  </verify>
  <acceptance_criteria>
    - grep "/plantillas" apps/frontend/app/(app)/layout.tsx -> match (nav link added)
    - grep "createPlantilla(" apps/frontend/app/(app)/plantillas/nuevo/page.tsx -> match
    - grep "uploadPlantilla(" apps/frontend/app/(app)/plantillas/nuevo/page.tsx -> match (PLAN-01 .docx)
    - grep "updatePlantilla(" apps/frontend/app/(app)/plantillas/[id]/page.tsx -> match (PLAN-06 new version)
    - grep "InsertarClausulaModal" apps/frontend/app/(app)/plantillas/[id]/page.tsx -> match
    - grep "DeclararVariableModal" apps/frontend/app/(app)/plantillas/[id]/page.tsx -> match
    - pnpm type-check clean; all __tests__/plantillas tests green
  </acceptance_criteria>
  <done>List/nuevo/editor pages wired with create/upload/update + insert-clausula + declarar-variable modals, nav link added, type-check + tests green.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: UAT — FL-2, FL-7, declare variable, versioning, unknown-type block</name>
  <action>
    Human verification of the plantillas editor. The agent automates nothing here: it presents the steps in how-to-verify, waits for the human to run them against a live stack, and resumes only on the "approved" signal (or fixes reported issues first).
  </action>
  <verify>
    <automated>MISSING — manual UAT; the human walkthrough in how-to-verify is the verification (FL-2 detection, F-030b block, PLAN-04 declare, FL-7 renumber, PLAN-06 versioning)</automated>
  </verify>
  <done>Human types "approved" after confirming all 5 scenarios pass.</done>
  <what-built>
    Full plantillas editor UI: create from paste/.txt/.docx, CodeMirror 6 with live valid/invalid variable highlight, variables panel, insert-cláusula modal (renumber), declare-variable modal, version-on-save.
  </what-built>
  <how-to-verify>
    Prereqs: backend + frontend running (`pnpm dev`), Mongo + MinIO up (`docker compose up` or local), logged in.
    1. FL-2 (create + detection): Go to /plantillas -> "Nueva plantilla". Paste:
         "En Madrid, a {{expediente.fechaCreacion}}, comparecen {{contacto.vendedor.nombre}} con NIF {{contacto.vendedor.nif}}."
       Expect: variables highlighted blue; panel groups "expediente" (fechaCreacion) and "contacto" (vendedor.nombre, vendedor.nif). Save -> redirected to editor with version 1.
    2. Unknown-type block (F-030b): add a line "{{contrato.algo}}". Expect: it highlights RED and Guardar is blocked with a message naming "contrato" and the line; remove it -> save works.
    3. PLAN-04 declare: add "{{expediente.honorariosBase}}" -> open "Declarar variables" -> pick tipoDato "numero" -> Declarar. Confirm no error (check esquema via GET /api/v1/esquemas/expediente shows honorariosBase, or re-open modal and it is gone).
       Also confirm a "{{fecha.hoy}}" variable shows as NOT declarable in the modal (Pitfall 4).
    4. FL-7 (insert cláusula): in a template with "CLÁUSULA PRIMERA.- Objeto\nCLÁUSULA SEGUNDA.- Precio", place cursor after PRIMERA, open "Insertar cláusula", filter by label, pick one. Expect: inserted as "CLÁUSULA SEGUNDA.-" and the old SEGUNDA becomes "CLÁUSULA TERCERA.-".
    5. PLAN-06 versioning: edit contenido + Guardar. Expect: version increments (v2); GET /plantillas/:id/versions shows v1 (inactive) + v2 (active); the list page shows only the active version.
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues (highlight wrong, renumber off, save not versioning, etc.)</resume-signal>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/frontend type-check` clean.
- `pnpm --filter @lexscribe/frontend vitest run __tests__/plantillas` all green.
- Editor + modals consume the SHARED parser/renumber (no re-implemented regex or ordinal map in frontend).
- Nav exposes /plantillas.
- UAT (Task 4) approved by human for FL-2, F-030b block, PLAN-04 declare (with clausula/fecha non-declarable), FL-7 insert+renumber, PLAN-06 versioning.
</verification>

<success_criteria>
PLAN-05 (CM6 highlight + live panel) delivered; PLAN-01..04 and CLAU-04 are exercised end-to-end through the UI and confirmed by human UAT. Saving edits creates versions; unknown types block save both client- and server-side.
</success_criteria>

<output>
After completion, create `.planning/phases/05-plantillas-y-editor/05-03-SUMMARY.md`
</output>
