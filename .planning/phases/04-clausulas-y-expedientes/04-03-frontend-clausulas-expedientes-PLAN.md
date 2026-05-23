---
phase: 04-clausulas-y-expedientes
plan: 03
type: execute
wave: 2
depends_on: ["04-01", "04-02"]
files_modified:
  - apps/frontend/lib/api/clausulas.ts
  - apps/frontend/lib/api/expedientes.ts
  - apps/frontend/components/clausulas/ClausulaForm.tsx
  - apps/frontend/components/clausulas/ClausulaTable.tsx
  - apps/frontend/components/clausulas/LabelsInput.tsx
  - apps/frontend/components/expedientes/ExpedienteForm.tsx
  - apps/frontend/components/expedientes/ExpedienteTable.tsx
  - apps/frontend/components/expedientes/ExpedienteTabs.tsx
  - apps/frontend/components/expedientes/ContactosVinculadosTab.tsx
  - apps/frontend/components/expedientes/ParametrosTab.tsx
  - apps/frontend/components/expedientes/AsociarContactoModal.tsx
  - apps/frontend/components/contactos/ExpedientesVinculadosSection.tsx
  - apps/frontend/app/(app)/clausulas/page.tsx
  - apps/frontend/app/(app)/clausulas/nuevo/page.tsx
  - apps/frontend/app/(app)/clausulas/[id]/page.tsx
  - apps/frontend/app/(app)/expedientes/page.tsx
  - apps/frontend/app/(app)/expedientes/nuevo/page.tsx
  - apps/frontend/app/(app)/expedientes/[id]/page.tsx
  - apps/frontend/app/(app)/contactos/[id]/page.tsx
  - apps/frontend/__tests__/clausulas/ClausulaForm.test.tsx
  - apps/frontend/__tests__/clausulas/ClausulaTable.test.tsx
  - apps/frontend/__tests__/expedientes/ExpedienteForm.test.tsx
  - apps/frontend/__tests__/expedientes/ContactosVinculadosTab.test.tsx
autonomous: false
requirements: [CLAU-01, CLAU-02, CLAU-03, EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07]
must_haves:
  truths:
    - "El usuario navega a /clausulas y ve listado paginado con búsqueda y filtro por label"
    - "El usuario crea/edita/borra cláusulas desde la UI, con labels libres múltiples"
    - "El usuario navega a /expedientes y ve listado paginado con búsqueda por nombre"
    - "El usuario crea/edita expedientes con nombre y parámetros dinámicos"
    - "Detalle expediente muestra tabs: Contactos, Parámetros, Documentos (vacío), Fechas (vacío), Facturación (vacío)"
    - "Modal asociar contacto permite seleccionar contacto + escribir rol; intentar duplicar muestra error 409 legible"
    - "Detalle de contacto muestra sección 'Expedientes vinculados' con datos reales (cierre visual CONT-05)"
  artifacts:
    - path: "apps/frontend/lib/api/clausulas.ts"
      provides: "Cliente API tipado con react-query keys + funciones list/get/create/update/remove"
      exports: ["clausulasApi", "useClausulasList", "useClausulaMutations"]
    - path: "apps/frontend/lib/api/expedientes.ts"
      provides: "Cliente API + linkContacto/unlinkContacto"
      exports: ["expedientesApi"]
    - path: "apps/frontend/app/(app)/expedientes/[id]/page.tsx"
      provides: "Detalle expediente con tabs"
      contains: "ExpedienteTabs"
    - path: "apps/frontend/components/contactos/ExpedientesVinculadosSection.tsx"
      provides: "Sección en detalle contacto mostrando expedientesVinculados real (CONT-05 visual)"
      contains: "expedientesVinculados"
  key_links:
    - from: "apps/frontend/components/expedientes/AsociarContactoModal.tsx"
      to: "expedientesApi.linkContacto"
      via: "mutation"
      pattern: "linkContacto"
    - from: "apps/frontend/app/(app)/clausulas/page.tsx"
      to: "useClausulasList con debounce"
      via: "hook"
      pattern: "useClausulasList|useDebounce"
    - from: "apps/frontend/app/(app)/contactos/[id]/page.tsx"
      to: "ExpedientesVinculadosSection"
      via: "imports + render con expedientesVinculados desde API response"
      pattern: "ExpedientesVinculadosSection"
---

<objective>
Construir las páginas y componentes Next.js para los módulos `clausulas` y `expedientes`: listados con búsqueda + filtros, formularios crear/editar, detalle expediente con tabs (incluye Contactos vinculados con modal asociar/rol), cierre visual de CONT-05 en detalle de contacto. Vitest tests por componente clave. Checkpoint humano de UAT al final.

Purpose: Cubrir la dimensión UI de Phase 4 — el usuario opera las funcionalidades CLAU-01..03 y EXPE-01..07 desde el navegador. Cierra visualmente CONT-05 (expedientes vinculados visible en detalle contacto).

Output: 6 páginas Next.js, ~10 componentes, 2 API clients, 4 suites Vitest, sección actualizada en detalle contacto. UAT humano aprobado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/04-clausulas-y-expedientes/04-RESEARCH.md
@.planning/phases/04-clausulas-y-expedientes/04-01-backend-clausulas-PLAN.md
@.planning/phases/04-clausulas-y-expedientes/04-02-backend-expedientes-PLAN.md
@docs/FUNCIONAL.md
@CLAUDE.md

# Phase 3 frontend reference patterns
@apps/frontend/lib/api/contactos.ts
@apps/frontend/components/contactos/ContactoForm.tsx
@apps/frontend/components/contactos/ContactoTable.tsx
@apps/frontend/components/contactos/ParametrosEditor.tsx
@apps/frontend/app/(app)/contactos/page.tsx
@apps/frontend/app/(app)/contactos/[id]/page.tsx
@apps/frontend/app/(app)/contactos/nuevo/page.tsx
@apps/frontend/__tests__/contactos/ContactoForm.test.tsx

<interfaces>
From @lexscribe/shared-validation (Plans 04-01, 04-02 export these):
- CreateClausulaSchema, UpdateClausulaSchema, QueryClausulaSchema
- CreateExpedienteSchema, UpdateExpedienteSchema, QueryExpedienteSchema, LinkContactoSchema
- Types: CreateClausulaInput, etc.

From @lexscribe/shared-types:
- Clausula, ClausulaListResponse
- Expediente, ExpedienteDetailResponse (con documentos:[], fechas:[] placeholders), ContactoVinculado

Backend endpoints (todos requieren `Authorization: Bearer <jwt>`):
- GET    /api/v1/clausulas?search=&label=&page=&limit=
- POST   /api/v1/clausulas
- GET    /api/v1/clausulas/:id
- PATCH  /api/v1/clausulas/:id
- DELETE /api/v1/clausulas/:id

- GET    /api/v1/expedientes?search=&contactoId=&page=&limit=
- POST   /api/v1/expedientes
- GET    /api/v1/expedientes/:id  → incluye documentos:[], fechas:[] placeholders
- PATCH  /api/v1/expedientes/:id
- DELETE /api/v1/expedientes/:id
- POST   /api/v1/expedientes/:id/contactos       body: {contactoId, rol}
- DELETE /api/v1/expedientes/:id/contactos/:contactoId/:rol  (rol URL-encoded)

- GET /api/v1/contactos/:id → ahora incluye expedientesVinculados: Array<{_id, nombre, rol}>
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: API clients tipados + componentes Cláusulas (form/table/labels) + páginas listado/nuevo/[id] + Vitest tests</name>
  <read_first>
    - apps/frontend/lib/api/contactos.ts (patrón fetch + react-query hooks + auth header)
    - apps/frontend/components/contactos/ContactoForm.tsx (patrón react-hook-form + zodResolver)
    - apps/frontend/components/contactos/ContactoTable.tsx (patrón tabla + paginación)
    - apps/frontend/app/(app)/contactos/page.tsx (patrón listado con search debounced)
    - apps/frontend/app/(app)/contactos/nuevo/page.tsx
    - apps/frontend/app/(app)/contactos/[id]/page.tsx (patrón edit con use(params) síncrono Next.js 14)
    - apps/frontend/__tests__/contactos/ContactoForm.test.tsx (patrón Vitest + Testing Library)
  </read_first>
  <behavior>
    - `lib/api/clausulas.ts` expone: `listClausulas(params)`, `getClausula(id)`, `createClausula(dto)`, `updateClausula(id, dto)`, `deleteClausula(id)`. Todos añaden `Authorization: Bearer ${token}` (reutilizar helper `authFetch` de contactos).
    - Hooks react-query: `useClausulasList(query)`, `useClausula(id)`, `useCreateClausula()`, etc. Query keys: `['clausulas', query]`, `['clausula', id]`.
    - `ClausulaForm.tsx`: react-hook-form + zodResolver(CreateClausulaSchema). Campos: nombre, texto (textarea grande), labels (chips via `LabelsInput`). Botón Guardar disabled mientras isPending.
    - `LabelsInput.tsx`: input que añade tags al presionar Enter; muestra chips removibles; valores se normalizan a lowercase al añadir.
    - `ClausulaTable.tsx`: tabla con nombre, labels (badges), fechaCreacion, acciones Editar/Borrar. Paginación.
    - Página `/clausulas/page.tsx`: header con botón "Nueva", input búsqueda (debounce 300ms), filtro label dropdown (poblado con union de labels existentes — opcional, alternativa: input texto), tabla con paginación. Diálogo confirmación al borrar.
    - Página `/clausulas/nuevo/page.tsx`: render `<ClausulaForm onSubmit={createMutation.mutate}>`; al éxito redirige a `/clausulas`.
    - Página `/clausulas/[id]/page.tsx`: fetch cláusula; render `<ClausulaForm defaultValues={data} onSubmit={updateMutation.mutate}>`. Usar `params: { id: string }` síncrono (Next.js 14 — STATE.md decision).
  </behavior>
  <action>
    1. **`apps/frontend/lib/api/clausulas.ts`**: clonar estructura de `lib/api/contactos.ts`. Endpoints `/api/v1/clausulas`. Tipos importados de `@lexscribe/shared-types` y `@lexscribe/shared-validation`. Manejo de errores: lanzar `Error(body.message)` para que react-query lo capture y se muestre vía toast.

    2. **Componentes** en `apps/frontend/components/clausulas/`:
       - `LabelsInput.tsx`: props `{value: string[], onChange: (next: string[]) => void}`. Render: chips actuales + `<input>` que al keypress Enter llama `onChange([...value, normalize(input)])`. Normalize: `trim().toLowerCase()`.
       - `ClausulaForm.tsx`: react-hook-form, `defaultValues?: Partial<Clausula>`, `onSubmit: (data: CreateClausulaInput) => void`, `isPending: boolean`. Validación Zod.
       - `ClausulaTable.tsx`: props `{items, total, page, limit, onPageChange, onEdit, onDelete}`. Render badges para labels (max 3 + "..." si más).

    3. **Páginas** en `apps/frontend/app/(app)/clausulas/`:
       - `page.tsx` (Server Component shell + Client Component listado): listado con `useClausulasList`. Debounce input search 300ms (reutilizar `useDebounce` hook si existe en contactos, o crear `apps/frontend/hooks/useDebounce.ts` mínimo). Filtro `?label=`. Confirmación borrado con `window.confirm` o componente Dialog.
       - `nuevo/page.tsx`: client component con `useCreateClausula` mutation; al éxito `router.push('/clausulas')`.
       - `[id]/page.tsx`: client component con `useClausula(id)` + `useUpdateClausula(id)`. `params` síncrono.

    4. **Tests Vitest** en `apps/frontend/__tests__/clausulas/`:
       - `ClausulaForm.test.tsx`: submit OK con nombre+texto+labels; falla validación si nombre vacío; labels se añaden via Enter; chip remove funciona. Mínimo 5 tests.
       - `ClausulaTable.test.tsx`: renderiza items; click Editar dispara `onEdit(id)`; click Borrar dispara `onDelete(id)` tras confirmación; paginación dispara `onPageChange`. Mínimo 4 tests.
       - Mock `fetch` global con `vi.fn()` cuando se testea componente que usa hooks de react-query (envolver en QueryClientProvider de test).

    5. Ejecutar `pnpm --filter @lexscribe/frontend test -- clausulas` y `pnpm --filter @lexscribe/frontend lint`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/frontend test -- clausulas &amp;&amp; pnpm --filter @lexscribe/frontend lint</automated>
  </verify>
  <acceptance_criteria>
    - Existen `apps/frontend/lib/api/clausulas.ts`, `apps/frontend/components/clausulas/{ClausulaForm,ClausulaTable,LabelsInput}.tsx`, `apps/frontend/app/(app)/clausulas/{page,nuevo/page,[id]/page}.tsx`
    - `grep -n "zodResolver(CreateClausulaSchema)" apps/frontend/components/clausulas/ClausulaForm.tsx` retorna match
    - `grep -n "useDebounce\\|setTimeout" apps/frontend/app/\\(app\\)/clausulas/page.tsx` retorna match (debounce implementado)
    - `grep -n "Authorization.*Bearer" apps/frontend/lib/api/clausulas.ts` retorna match
    - `grep -c "it\\|test(" apps/frontend/__tests__/clausulas/ClausulaForm.test.tsx` ≥5
    - `pnpm --filter @lexscribe/frontend test -- clausulas` finaliza 0 failed
    - `pnpm --filter @lexscribe/frontend build` (Next.js production build) finaliza con exit 0
  </acceptance_criteria>
  <done>
    UI cláusulas operativa: navegar a /clausulas, crear, editar, borrar, filtrar por label, buscar full-text. Tests verdes.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: API client + componentes Expedientes (form, tabs, modal asociar contacto, parámetros) + páginas + sección expedientes vinculados en detalle contacto + Vitest tests</name>
  <read_first>
    - apps/frontend/lib/api/clausulas.ts (creado en Task 1 — patrón a replicar)
    - apps/frontend/lib/api/contactos.ts (necesario para selector de contactos en modal asociar)
    - apps/frontend/components/contactos/ParametrosEditor.tsx (REUTILIZAR si su shape de props lo permite — Phase 3 lo creó genérico)
    - apps/frontend/app/(app)/contactos/[id]/page.tsx (donde añadir sección ExpedientesVinculados)
    - .planning/phases/04-clausulas-y-expedientes/04-02-backend-expedientes-PLAN.md (endpoints exactos)
  </read_first>
  <behavior>
    - `lib/api/expedientes.ts`: list/get/create/update/delete + `linkContacto(expedienteId, {contactoId, rol})` + `unlinkContacto(expedienteId, contactoId, rol)` (rol URL-encoded en la ruta). Hooks react-query asociados con invalidation correcta (al link/unlink: invalidar `['expediente', id]` y `['contactos', contactoId]`).
    - `ExpedienteForm.tsx`: react-hook-form + zodResolver(CreateExpedienteSchema). Campos: nombre + `ParametrosEditor` (reutilizado de Phase 3) o equivalente con tipoObjeto='expediente'.
    - `ExpedienteTabs.tsx`: tabs (shadcn/ui o headless): Contactos, Parámetros, Documentos, Fechas, Facturación. Documentos/Fechas/Facturación renderizan placeholder "Disponible en una fase futura" (Phases 6/7).
    - `ContactosVinculadosTab.tsx`: lista de contactos vinculados (resuelve nombre via fetch /contactos/:id por cada uno, o aceptar que backend lo populate en futuro — por ahora mostrar `contactoId` + rol y un botón Detalle que enlaza a `/contactos/:id`). Botón "Asociar contacto" abre modal. Botón "Desasociar" por cada vínculo dispara mutation unlink.
    - `AsociarContactoModal.tsx`: selector de contactos (combobox que llama a `GET /api/v1/contactos?search=...`), input rol (text), botón Guardar. Si backend devuelve 409, muestra error inline "Este contacto ya está vinculado con el rol X".
    - `ExpedientesVinculadosSection.tsx`: componente que recibe `expedientesVinculados: Array<{_id,nombre,rol}>`, renderiza una lista con enlaces a `/expedientes/:id` y badge con el rol. Si vacío, muestra "Sin expedientes vinculados".
    - Detalle contacto `/contactos/[id]/page.tsx`: añadir `<ExpedientesVinculadosSection expedientes={data.expedientesVinculados} />` debajo del formulario.
    - Página `/expedientes`: listado con búsqueda + paginación.
    - Página `/expedientes/nuevo`: form crear.
    - Página `/expedientes/[id]`: cabecera con nombre editable + ExpedienteTabs.
  </behavior>
  <action>
    1. **`apps/frontend/lib/api/expedientes.ts`** con todos los métodos. `linkContacto`:
       ```typescript
       async linkContacto(expedienteId: string, dto: LinkContactoInput) {
         return authFetch(`/api/v1/expedientes/${expedienteId}/contactos`, {
           method: 'POST', body: JSON.stringify(dto),
         });
       }
       async unlinkContacto(expedienteId: string, contactoId: string, rol: string) {
         const path = `/api/v1/expedientes/${expedienteId}/contactos/${contactoId}/${encodeURIComponent(rol)}`;
         return authFetch(path, { method: 'DELETE' });
       }
       ```
       Hooks: `useLinkContacto(expedienteId)`, `useUnlinkContacto(expedienteId)` con `onSuccess: () => queryClient.invalidateQueries({queryKey:['expediente', expedienteId]})`.

    2. **Componentes** en `apps/frontend/components/expedientes/`:
       - `ExpedienteForm.tsx`
       - `ExpedienteTable.tsx`
       - `ExpedienteTabs.tsx` (orquestador de tabs)
       - `ContactosVinculadosTab.tsx`
       - `AsociarContactoModal.tsx` (controlled open/onClose, mutation con manejo error 409)
       - `ParametrosTab.tsx` (wrapper de ParametrosEditor con tipoObjeto='expediente')
       - `apps/frontend/components/contactos/ExpedientesVinculadosSection.tsx`

    3. **Páginas** en `apps/frontend/app/(app)/expedientes/`:
       - `page.tsx`: listado con búsqueda debounced
       - `nuevo/page.tsx`: form crear; al éxito redirige a `/expedientes/:newId`
       - `[id]/page.tsx`: detalle con ExpedienteTabs

    4. **Modificar** `apps/frontend/app/(app)/contactos/[id]/page.tsx`:
       - Importar `ExpedientesVinculadosSection`
       - Bajo el formulario, renderizar `<ExpedientesVinculadosSection expedientes={data?.expedientesVinculados ?? []} />`

    5. **Tests Vitest** en `apps/frontend/__tests__/expedientes/`:
       - `ExpedienteForm.test.tsx`: submit OK con nombre + parametros; validación nombre vacío. ≥3 tests.
       - `ContactosVinculadosTab.test.tsx`: renderiza vacío ("Sin contactos"); renderiza lista cuando hay datos; click Desasociar llama mutation; modal asociar abre/cierra. ≥4 tests.
       - `AsociarContactoModal.test.tsx` (opcional pero recomendado): mock fetch retorna 409 → muestra error inline. ≥2 tests.

    6. Ejecutar `pnpm --filter @lexscribe/frontend test -- expedientes && pnpm --filter @lexscribe/frontend lint && pnpm --filter @lexscribe/frontend build`.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/frontend test -- expedientes &amp;&amp; pnpm --filter @lexscribe/frontend lint &amp;&amp; pnpm --filter @lexscribe/frontend build</automated>
  </verify>
  <acceptance_criteria>
    - Existen los 6 componentes en `components/expedientes/` + `ExpedientesVinculadosSection.tsx` en `components/contactos/`
    - Existen las 3 páginas en `app/(app)/expedientes/`
    - `grep -n "linkContacto" apps/frontend/lib/api/expedientes.ts` retorna match
    - `grep -n "encodeURIComponent(rol)" apps/frontend/lib/api/expedientes.ts` retorna match (manejo de rol con espacios)
    - `grep -n "ExpedientesVinculadosSection" apps/frontend/app/\\(app\\)/contactos/\\[id\\]/page.tsx` retorna match
    - `grep -n "expedientesVinculados" apps/frontend/components/contactos/ExpedientesVinculadosSection.tsx` retorna match
    - `grep -n "Disponible en una fase futura\\|Próximamente\\|Phase " apps/frontend/components/expedientes/ExpedienteTabs.tsx` retorna match (placeholders documentos/fechas/facturación)
    - `grep -n "409\\|ya vinculado\\|ya está" apps/frontend/components/expedientes/AsociarContactoModal.tsx` retorna match (manejo error duplicado)
    - `grep -c "it\\|test(" apps/frontend/__tests__/expedientes/ContactosVinculadosTab.test.tsx` ≥4
    - `pnpm --filter @lexscribe/frontend test` finaliza 0 failed
    - `pnpm --filter @lexscribe/frontend build` exit 0
  </acceptance_criteria>
  <done>
    UI expedientes operativa con detalle tabbed, modal asociar contacto, sección "Expedientes vinculados" en detalle contacto poblada con datos reales. Tests verdes.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: UAT manual — Phase 4 end-to-end UI</name>
  <what-built>
    Backend Plans 04-01 (clausulas) y 04-02 (expedientes + cierre CONT-05) ya operativos. Frontend Plans 04-03 Task 1 y 2 ya implementados: páginas /clausulas y /expedientes con CRUD, búsqueda, filtros, detalle expediente con tabs, modal asociar contacto, sección expedientes vinculados en detalle contacto.
  </what-built>
  <how-to-verify>
    Arrancar el sistema localmente:
    ```bash
    pnpm dev  # arranca frontend (3000) + backend (4000) en paralelo
    # En otro terminal, si Mongo/MinIO no están: docker compose up -d mongodb minio
    ```
    Loguearse con el usuario seed (credenciales en `.env`). Ejecutar los siguientes 8 escenarios — todos deben pasar:

    **Escenario 1 — Crear cláusula (CLAU-01, CLAU-02):**
    1. Navegar a /clausulas → ver listado vacío
    2. Click "Nueva" → llenar nombre="Garantía estándar", texto="El vendedor garantiza...", labels=["compraventa","garantia"]
    3. Click Guardar → redirigir a /clausulas
    4. **Esperado:** ver la cláusula en el listado con 2 badges de labels

    **Escenario 2 — Buscar y filtrar cláusulas (CLAU-03):**
    1. Crear 2 cláusulas más con labels variados
    2. En /clausulas: escribir "garantía" en búsqueda → ver solo las que matchean
    3. Limpiar búsqueda; seleccionar filtro label="compraventa" → ver solo las con ese label
    4. **Esperado:** ambos filtros funcionan independientes y combinados

    **Escenario 3 — Editar y borrar cláusula (CLAU-01):**
    1. Click Editar en una cláusula → modificar texto → Guardar
    2. Click Borrar otra cláusula → confirmar
    3. **Esperado:** cambio reflejado; borrada desaparece del listado

    **Escenario 4 — Crear expediente con parámetros (EXPE-01, EXPE-04):**
    1. Navegar a /expedientes → ver vacío
    2. Click "Nuevo" → nombre="Caso Pérez vs García"; añadir parámetro `honorariosBase=2500`
    3. Guardar → redirige al detalle
    4. **Esperado:** ver expediente creado con fechaCreacion auto; en tab Parámetros aparece honorariosBase

    **Escenario 5 — Asociar contactos con rol único (EXPE-02, EXPE-03):**
    1. Asegurar que existen ≥2 contactos (crear en /contactos si no)
    2. En detalle expediente → tab Contactos → click "Asociar contacto"
    3. Modal: seleccionar contacto A, rol="cliente" → Guardar
    4. Modal: seleccionar contacto A, rol="cliente" otra vez → **error legible** ("ya vinculado con rol cliente")
    5. Modal: contacto A, rol="vendedor" → OK (mismo contacto, distinto rol)
    6. **Esperado:** lista tab Contactos muestra 2 entradas para contacto A (cliente + vendedor)

    **Escenario 6 — Desasociar contacto con rol con espacio (EXPE-02):**
    1. Asociar contacto B con rol="Cliente Principal" (con espacio)
    2. Click Desasociar en esa fila
    3. **Esperado:** desaparece de la lista (URL-encoding correcto)

    **Escenario 7 — Vista inversa: expedientes vinculados desde contacto (CONT-05):**
    1. Navegar a /contactos → click sobre contacto A
    2. **Esperado:** sección "Expedientes vinculados" muestra "Caso Pérez vs García" con badge rol "cliente" y "vendedor"
    3. Click sobre el enlace del expediente → navega a su detalle

    **Escenario 8 — Listado y búsqueda expedientes; placeholders tabs (EXPE-05, EXPE-06, EXPE-07):**
    1. En /expedientes: escribir "Pérez" → ver solo los que matchean
    2. Click sobre un expediente → ver tabs Documentos, Fechas, Facturación con mensaje "Disponible en una fase futura" o equivalente
    3. **Esperado:** tabs vacíos visibles, sin errores
  </how-to-verify>
  <action>PAUSE for human UAT verification. Display the <what-built> and <how-to-verify> sections to the user, then wait for the resume-signal. Do NOT proceed to next plan until user types "approved".</action>
  <verify>
    <automated>echo "Manual UAT checkpoint — awaiting human approval on 8 scenarios"</automated>
  </verify>
  <done>Human user has typed "approved" after executing all 8 UAT scenarios successfully; any failure described and resolved before resuming.</done>
  <resume-signal>Escribe "approved" si los 8 escenarios pasan, o describe los issues encontrados (qué escenario, qué falló, screenshot opcional).</resume-signal>
</task>

</tasks>

<verification>
- 8 escenarios UAT aprobados por el humano
- `pnpm --filter @lexscribe/frontend test` → 0 failed
- `pnpm --filter @lexscribe/frontend build` → 0 errors
- `pnpm --filter @lexscribe/frontend lint` → 0 errors
</verification>

<success_criteria>
- UI completa: páginas y componentes para cláusulas y expedientes operativas
- Cierre visual de CONT-05: detalle contacto muestra expedientes vinculados reales
- Modal asociar contacto maneja error 409 (duplicado) de forma legible
- Detalle expediente con tabs (documentos/fechas/facturación como placeholders) sin romper layout
- UAT humano aprobado
</success_criteria>

<output>
Tras UAT aprobado, crear `.planning/phases/04-clausulas-y-expedientes/04-03-SUMMARY.md` con: páginas creadas, decisiones UX (debounce, filtros), número de tests Vitest, resultado UAT y comentarios humanos.
</output>
