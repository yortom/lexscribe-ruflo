---
phase: 05-plantillas-y-editor
verified: 2026-05-31T18:00:00Z
status: passed
score: 8/8 automated must-haves verified; 5/5 human UAT passed (05-HUMAN-UAT.md)
re_verification: false
human_verification_resolved: "2026-06-02 — all 5 UAT scenarios passed; 2 bugs found & fixed (commits 58e9927, 896edfc)"
human_verification:
  - test: "FL-2 — Crear plantilla + deteccion de variables en tiempo real"
    expected: "Variables resaltadas azul en el editor CM6; panel lateral agrupa por tipoObjeto (expediente, contacto)"
    why_human: "CM6 decorations requieren DOM real; jsdom no puede confirmar renderizado visual de cm-var-valid/invalid"
  - test: "F-030b — Bloqueo por tipo desconocido en el navegador"
    expected: "Variable {{contrato.algo}} aparece en rojo; boton Guardar desactivado con mensaje que nombra 'contrato' y la linea"
    why_human: "Comportamiento interactivo (boton desactivado, mensaje de error inline) requiere navegador real"
  - test: "PLAN-04 — Declarar variable desde el editor"
    expected: "Modal muestra {{expediente.honorariosBase}} como declarable; {{fecha.hoy}} aparece como 'no declarable'. Al declarar honorariosBase con tipoDato 'numero' el esquema expediente gana el campo"
    why_human: "Requiere backend vivo (GET /api/v1/esquemas/expediente) para confirmar que addParametro se ejecuto"
  - test: "FL-7 — Insertar clausula con renumeracion"
    expected: "Con cursor tras CLAUSULA PRIMERA, al insertar una clausula de la biblioteca, aparece como CLAUSULA SEGUNDA y la anterior SEGUNDA se convierte en TERCERA"
    why_human: "Posicion del cursor en CM6 y resultado visual de renumeracion requieren navegador real"
  - test: "PLAN-06 — Versioning: editar plantilla crea nueva version"
    expected: "Guardar incrementa el numero de version (v1 -> v2); GET /plantillas/:id/versions retorna v1 inactivo + v2 activo; la lista solo muestra v2"
    why_human: "Flujo end-to-end requiere stack completo (backend + MongoDB) para verificar la secuencia insert-then-deactivate"
---

# Phase 05: Plantillas y Editor — Verification Report

**Phase Goal:** El usuario puede crear plantillas a partir de archivo o pegado, ver las variables detectadas y declarar campos nuevos. Clausulas insertables con renumeracion.
**Verified:** 2026-05-31T18:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Parser extrae `{{objeto.campo}}` y `{{objeto.rol.campo}}` con posicion linea/columna | VERIFIED | `parseVariables()` en variable-parser.ts (138 lineas); 52 tests vitest; 100% line coverage |
| 2 | Parser agrupa por tipoObjeto y rechaza tipos desconocidos como invalidos | VERIFIED | `groupByTipoObjeto()` + `validarVariables()` exportadas; KNOWN_TIPO_OBJETO = ['expediente','contacto','clausula','fecha'] independiente de esquemas.TIPO_OBJETO |
| 3 | Renumerador mapea ordinales espanoles 1-50 bidireccionalmente y renumera cabeceras tras insercion | VERIFIED | `intToOrdinal`, `ordinalToInt`, `detectClausulaHeaders`, `insertClausulaAndRenumber` en clausula-renumber.ts (215 lineas); 96.94% line coverage |
| 4 | POST /plantillas acepta texto pegado / .txt / .docx y persiste contenido + storagePath | VERIFIED | `plantillas.controller.ts` (@Controller('plantillas')); `createFromDocx()` en service; 28 tests e2e green |
| 5 | Tipos desconocidos bloquean el guardado con error 400 que nombra variable + linea (F-030b) | VERIFIED | `detectarYValidar()` lanza ValidationError con `Tipo de objeto desconocido en variables: ${invalidas.map(v => v.raw + ' (linea ' + v.linea + ')').join(', ')}` |
| 6 | PATCH /plantillas/:id crea version+1 activa y marca la anterior inactiva (insert-then-deactivate) | VERIFIED | `createNewVersion()` en repository: STEP 1 INSERT (activo:true) ANTES que STEP 2 deactivate; sin session/startTransaction |
| 7 | POST /plantillas/:id/declarar-variable agrega campo al esquema dinamico; clausula/fecha rechazados | VERIFIED | `addParametro()` llamado en service; guardia explicita "Solo se pueden declarar variables de expediente o contacto" + DeclararVariableSchema restringe a expediente|contacto |
| 8 | Editor CM6 con highlight valid/invalid + panel de variables + modales de insertar/declarar | VERIFIED (code) | PlantillaEditor.tsx (101 lineas), variableHighlight.ts (66 lineas), VariablesPanel.tsx (66 lineas), InsertarClausulaModal.tsx (119 lineas), DeclararVariableModal.tsx (157 lineas) — 17 tests vitest green. UAT pendiente (ver human_verification) |

**Score:** 8/8 truths verified (automated code/test evidence). 5 truths con componentes de UI necesitan UAT en navegador real.

---

### Required Artifacts

#### Plan 01 — Parser Shared

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-validation/src/variable-parser.ts` | parseVariables + KNOWN_TIPO_OBJETO + VariableDetectada | VERIFIED | 138 lineas; todas las funciones exportadas; min_lines 60 superado |
| `packages/shared-validation/src/clausula-renumber.ts` | ordinal map + detectClausulaHeaders + insertClausulaAndRenumber | VERIFIED | 215 lineas; todas las funciones exportadas; min_lines 50 superado |
| `packages/shared-validation/src/plantillas.ts` | CreatePlantillaSchema / UpdatePlantillaSchema / QueryPlantillaSchema / DeclararVariableSchema | VERIFIED | 52 lineas; `CreatePlantillaSchema` y `DeclararVariableSchema` presentes; tipoObjeto restringido a expediente|contacto |
| `packages/shared-types/src/plantilla.ts` | Plantilla, VariableDetectada, PlantillaListResponse TS types | VERIFIED | 47 lineas; `VariableDetectada` y `Plantilla` exportados |
| `packages/shared-validation/vitest.config.ts` | coverage thresholds lines>=80 | VERIFIED | `thresholds: { lines: 80, ... }` presente |

#### Plan 02 — Backend Plantillas

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/src/common/storage/storage.service.ts` | S3-compatible client reusable | VERIFIED | 96 lineas; implements OnModuleInit; forcePathStyle: true; putObject; HeadBucketCommand |
| `apps/backend/src/modules/plantillas/plantillas.service.ts` | parse+validate on save, versioning, declare-variable | VERIFIED | 178 lineas; parseVariables + validarVariables + createNewVersion + addParametro + putObject todos presentes |
| `apps/backend/src/modules/plantillas/schemas/plantilla.schema.ts` | Mongoose schema con plantillaRaizId/version/activo/variablesDetectadas | VERIFIED | 81 lineas; plantillaRaizId presente; softDeletePlugin aplicado; 3 indices definidos |

#### Plan 03 — Frontend Editor

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/components/plantillas/PlantillaEditor.tsx` | CM6 editor con highlight decorations + insertAtCursor API | VERIFIED | 101 lineas; forwardRef + useImperativeHandle para insertAtCursor; highlightViewPlugin integrado |
| `apps/frontend/lib/api/plantillas.ts` | list/get/create/update/declararVariable/versions API client | VERIFIED | 143 lineas; `declararVariable` exportada; `uploadPlantilla` con FormData variant |
| `apps/frontend/components/plantillas/InsertarClausulaModal.tsx` | clausula library filter + insert (CLAU-04) | VERIFIED | 119 lineas; listClausulas + insertClausulaAndRenumber ambos llamados |

#### Plan 04 — Tests Coverage

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-validation/vitest.config.ts` | coverage thresholds lines>=80 | VERIFIED | `thresholds` presente; variable-parser.ts 100%, clausula-renumber.ts 96.94% |
| `apps/backend/src/modules/plantillas/plantillas.service.spec.ts` | unit coverage detect/validate/version/declare | VERIFIED | 385 lineas; 67 assertions; ValidationError + addParametro + createNewVersion cubiertos |
| `apps/backend/jest.config.ts` | coverageThreshold para ./src/modules/plantillas/ | VERIFIED | `'./src/modules/plantillas/'` presente; plantillas module 99.13% lineas |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `shared-validation/src/index.ts` | variable-parser.ts / clausula-renumber.ts / plantillas.ts | barrel re-export | WIRED | `export * from './variable-parser'`; `export * from './clausula-renumber'`; `export * from './plantillas'` todos presentes |
| `plantillas.service.ts` | `@lexscribe/shared-validation` parseVariables/validarVariables | import + call on save | WIRED | `parseVariables(` llamado en `detectarYValidar()`; `validarVariables(vars)` llamado tras parse |
| `plantillas.service.ts` | EsquemasService.addParametro | declare-variable injection | WIRED | `this.esquemas.addParametro(usuarioId, dto.tipoObjeto, {...})` presente |
| `plantillas.service.ts` | StorageService.putObject | .docx upload | WIRED | `await this.storage.putObject(...)` + `updateStoragePath` llamado tras upload |
| `PlantillaEditor.tsx` | `@lexscribe/shared-validation` parseVariables | live parse on doc change via variableHighlight.ts | WIRED | `parseVariables(text)` en variableHighlight.ts; ViewPlugin registrado en editor extensions |
| `InsertarClausulaModal.tsx` | `@lexscribe/shared-validation` insertClausulaAndRenumber | insert + renumber on confirm | WIRED | `insertClausulaAndRenumber(contenido, clausula.texto, afterNumero)` llamado directamente |
| `lib/api/plantillas.ts` | backend /plantillas endpoints | apiFetch | WIRED | Funciones list/get/create/update/upload/declarar todas llaman a paths `/plantillas*` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `VariablesPanel.tsx` | `grupos` (GrupoVariables[]) | `groupByTipoObjeto(parseVariables(contenido))` en useMemo | Si — pure computation sobre prop `contenido` del editor | FLOWING |
| `InsertarClausulaModal.tsx` | clausulas list | `listClausulas({ label })` via useQuery | Si — llama GET /clausulas?label= (API real del Phase 4) | FLOWING |
| `DeclararVariableModal.tsx` | `nuevasVariables` prop | Parent ([id]/page.tsx) via `parseVariables(contenido)` filtrado por valido+expediente|contacto | Si — calculado sobre contenido del editor en tiempo real | FLOWING |
| `plantillas/[id]/page.tsx` | `contenido` (local state) | `getPlantilla(id)` via useQuery; hidratado con useEffect+initialized flag (TanStack v5 pattern) | Si — fetch real al endpoint GET /plantillas/:id | FLOWING |
| `plantillas/page.tsx` | `plantillas` list | `listPlantillas({search,page})` via useQuery | Si — fetch real al endpoint GET /plantillas | FLOWING |
| `plantillas.service.ts` | `variablesDetectadas` | `parseVariables(dto.contenido)` | Si — parseado del contenido real; guardado en MongoDB | FLOWING |
| `plantillas.repository.ts` | nueva version | `createNewVersion()` with real MongoDB Model calls | Si — INSERT real + deactivate real; e2e verifica con MongoMemoryServer | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED para el stack completo (requiere servidor vivo). Los siguientes checks estaticos se ejecutaron:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Parser rechaza `{{contrato.algo}}` como invalido | `grep "valido.*false\|KNOWN_TIPO_OBJETO" variable-parser.ts` | valido = KNOWN_TIPO_OBJETO.includes(tipoObjeto) | PASS |
| Service lanza 400 por tipo desconocido | `grep "ValidationError" plantillas.service.ts` | `throw new ValidationError(...)` tras `validarVariables` | PASS |
| Repository no usa transacciones | `grep "session\|startTransaction" plantillas.repository.ts` | 0 resultados | PASS |
| CM6 highlight clases definidas | `grep "cm-var-valid\|cm-var-invalid" variableHighlight.ts` | Ambas clases definidas en VAR_VALID_CLASS + VAR_INVALID_CLASS | PASS |
| DeclararVariable Pitfall-4 guard | `grep "no declarable" DeclararVariableModal.tsx` | `no declarable` en texto + `isDeclarable()` guard | PASS |
| PlantillasModule registrado en app | `grep "PlantillasModule" app.module.ts` | `import PlantillasModule` + en imports[] | PASS |
| Nav link a /plantillas | `grep "/plantillas" layout.tsx` | `<a href="/plantillas">Plantillas</a>` | PASS |

---

### Requirements Coverage

| Requirement | Plan(s) | Description | Status | Evidence |
|-------------|---------|-------------|--------|----------|
| PLAN-01 | 02, 03 | Crear plantillas desde .txt, .docx o pegado | SATISFIED | POST /plantillas (pasted/txt) + POST /plantillas/upload (docx); uploadPlantilla en frontend |
| PLAN-02 | 01, 03 | Detectar variables `{{objeto.campo}}` agrupadas por tipo | SATISFIED | parseVariables + groupByTipoObjeto en shared-validation; VariablesPanel muestra grupos en tiempo real |
| PLAN-03 | 01, 02 | Tipos desconocidos -> error controlado con linea+variable, bloquea guardado | SATISFIED | validarVariables + ValidationError en service (F-030b); cliente desactiva Guardar si hay invalidos |
| PLAN-04 | 01, 02, 03 | Declarar campo nuevo desde editor -> se anade al esquema dinamico | SATISFIED | DeclararVariableSchema (expediente|contacto solo); EsquemasService.addParametro llamado; DeclararVariableModal |
| PLAN-05 | 03 | Editor CM6 con highlight visual + panel lateral en tiempo real | SATISFIED (code) / UAT pendiente | PlantillaEditor.tsx + variableHighlight.ts + VariablesPanel.tsx implementados; 17 tests vitest green; UAT en navegador real pendiente |
| PLAN-06 | 02 | Editar plantilla -> nueva version activa, anterior inactiva | SATISFIED | `createNewVersion()` insert-then-deactivate; PATCH /plantillas/:id; e2e cubre v1->v2 |
| CLAU-04 | 01, 03 | Insertar clausula con renumeracion respetando el clausulado | SATISFIED | insertClausulaAndRenumber en shared-validation; InsertarClausulaModal llama a esta funcion; test InsertarClausulaModal.test.tsx green |
| SEC-06 | 04 | >=80% cobertura en parser + plantillas service/repository | SATISFIED (anticipado) | variable-parser.ts 100%, clausula-renumber.ts 96.94%, plantillas module 99.13% lineas — umbrales en vitest.config.ts y jest.config.ts activos. Nota: SEC-06 mapea oficialmente a Phase 8 en REQUIREMENTS.md; Phase 5 lo entrega anticipadamente. |

**Nota sobre PLAN-05 checkbox:** `REQUIREMENTS.md` muestra `[ ]` (sin marcar) para PLAN-05, pero el codigo esta completamente implementado (PlantillaEditor.tsx, variableHighlight.ts, VariablesPanel.tsx con tests). La casilla sin marcar es una omision de documentacion, no un gap de implementacion. El UAT en navegador real es lo que falta para marcarla como done formalmente.

**Nota sobre SEC-06:** El plan 04 lista SEC-06 como requirement pero `REQUIREMENTS.md` asigna SEC-06 oficialmente a Phase 8. Phase 5 entrega este requisito de forma anticipada. No es un gap.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `InsertarClausulaModal.tsx` | 71 | `placeholder="Filtrar por label..."` | INFO | HTML input placeholder attribute — NO es un stub de codigo; es UX correcto para el campo de busqueda |

No se encontraron stubs reales: ninguna funcion retorna `{}` / `[]` / `null` como valor final sin datos reales; no hay `TODO`/`FIXME` en rutas criticas; no hay `console.log`-only implementations; no hay hardcoded empty arrays que fluyan al render sin fetch.

---

### Human Verification Required

Los siguientes 5 escenarios corresponden a la Task 4 (UAT checkpoint) del plan 05-03, que el usuario decidio DIFERIR. El codigo subyacente y los tests unit/integration estan presentes y green (205 tests). Solo falta el walkthrough en navegador real.

**Prerequisitos:** backend + frontend corriendo (`pnpm dev`), Mongo + MinIO activos (`docker compose up`), sesion iniciada.

#### 1. FL-2 — Creacion + deteccion de variables

**Test:** Ir a /plantillas -> "Nueva plantilla". Pegar: `"En Madrid, a {{expediente.fechaCreacion}}, comparecen {{contacto.vendedor.nombre}} con NIF {{contacto.vendedor.nif}}."`
**Expected:** Variables resaltadas azul; panel agrupa "expediente" (fechaCreacion) y "contacto" (vendedor.nombre, vendedor.nif). Guardar -> redirige al editor con version 1.
**Why human:** CM6 decorations requieren DOM real; jsdom mockea el editor en los tests.

#### 2. F-030b — Bloqueo por tipo desconocido

**Test:** Anadir la linea `{{contrato.algo}}` a la plantilla.
**Expected:** Variable resaltada en rojo. Boton Guardar desactivado con mensaje que nombra "contrato" y el numero de linea. Al eliminar la linea -> Guardar funciona.
**Why human:** Interaccion visual (estado del boton, mensaje inline) requiere navegador real.

#### 3. PLAN-04 — Declarar variable nueva

**Test:** Anadir `{{expediente.honorariosBase}}` -> abrir "Declarar variables" -> elegir tipoDato "numero" -> Declarar. Verificar tambien que `{{fecha.hoy}}` aparece como "no declarable".
**Expected:** Sin error al declarar. Esquema expediente gana `honorariosBase` (verificable via GET /api/v1/esquemas/expediente). `{{fecha.hoy}}` muestra "no declarable" en el modal.
**Why human:** Requiere backend vivo para confirmar persistencia del esquema dinamico.

#### 4. FL-7 — Insertar clausula con renumeracion

**Test:** En una plantilla con `CLAUSULA PRIMERA.- Objeto\nCLAUSULA SEGUNDA.- Precio`, colocar cursor tras PRIMERA, abrir "Insertar clausula", seleccionar una de la biblioteca.
**Expected:** Clausula insertada como `CLAUSULA SEGUNDA.-`; la antigua SEGUNDA se convierte en `CLAUSULA TERCERA.-`.
**Why human:** Posicion del cursor en CM6 y resultado visual de renumeracion requieren navegador.

#### 5. PLAN-06 — Versioning end-to-end

**Test:** Editar el contenido de una plantilla existente y pulsar Guardar.
**Expected:** Numero de version incrementa (v1 -> v2). GET /api/v1/plantillas/:id/versions retorna v1 inactivo + v2 activo. La lista de plantillas muestra solo la version activa.
**Why human:** Requiere stack completo para verificar la secuencia insert-then-deactivate en MongoDB.

---

### Gaps Summary

No hay gaps en el codigo implementado. Todos los must-haves automatizables estan verificados:

- **05-01 (parser shared):** parseVariables, groupByTipoObjeto, validarVariables, intToOrdinal, insertClausulaAndRenumber, CreatePlantillaSchema, DeclararVariableSchema — todos exportados, barrel wired, 52 tests vitest green, 97-100% coverage.
- **05-02 (backend):** StorageService + PlantillasModule registrado + versioning insert-then-deactivate + F-030b block + PLAN-04 declare + e2e 28 tests green.
- **05-03 (frontend):** PlantillaEditor (CM6 + forwardRef insertAtCursor) + VariablesPanel (live groupByTipoObjeto) + InsertarClausulaModal (CLAU-04) + DeclararVariableModal (PLAN-04 Pitfall-4 guard) + 3 pages + nav link + 17 tests vitest green.
- **05-04 (coverage):** SEC-06 satisfecho anticipadamente — plantillas module 99.13% lineas, parser 100%, renumber 96.94%, thresholds activos en vitest.config.ts y jest.config.ts.

El unico pendiente es el UAT humano (Task 4 del plan 03), diferido por decision del usuario. Los 5 escenarios estan documentados arriba.

**Elemento de documentacion a actualizar (no es un gap funcional):** El checkbox de PLAN-05 en REQUIREMENTS.md esta sin marcar (`[ ]`) a pesar de que el codigo esta implementado y tiene 17 tests. Se recomienda marcarlo como `[x]` cuando el UAT sea aprobado.

---

_Verified: 2026-05-31T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Mode: Initial verification — no previous VERIFICATION.md found_
