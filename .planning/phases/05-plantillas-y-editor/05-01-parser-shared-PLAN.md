---
phase: 05-plantillas-y-editor
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-validation/src/variable-parser.ts
  - packages/shared-validation/src/clausula-renumber.ts
  - packages/shared-validation/src/plantillas.ts
  - packages/shared-validation/src/index.ts
  - packages/shared-validation/package.json
  - packages/shared-validation/vitest.config.ts
  - packages/shared-validation/src/variable-parser.test.ts
  - packages/shared-validation/src/clausula-renumber.test.ts
  - packages/shared-types/src/plantilla.ts
  - packages/shared-types/src/index.ts
autonomous: true
requirements: [PLAN-02, PLAN-03, CLAU-04]
must_haves:
  truths:
    - "Parser extracts {{objeto.campo}} and {{objeto.rol.campo}} from arbitrary text with line/column positions"
    - "Parser groups detected variables by tipoObjeto and flags unknown tipoObjeto as invalid"
    - "KNOWN_TIPO_OBJETO recognizes expediente, contacto, clausula, fecha; rejects everything else"
    - "Renumber maps Spanish ordinals PRIMERA..1-50 bidirectionally and renumbers headers after insertion"
    - "Zod Create/Update/Query plantilla schemas validate inputs with strict()"
  artifacts:
    - path: "packages/shared-validation/src/variable-parser.ts"
      provides: "parseVariables() + KNOWN_TIPO_OBJETO + VariableDetectada types"
      min_lines: 60
    - path: "packages/shared-validation/src/clausula-renumber.ts"
      provides: "ordinal map + detectClausulaHeaders + insertClausulaAndRenumber"
      min_lines: 50
    - path: "packages/shared-validation/src/plantillas.ts"
      provides: "CreatePlantillaSchema/UpdatePlantillaSchema/QueryPlantillaSchema/DeclararVariableSchema"
      contains: "CreatePlantillaSchema"
    - path: "packages/shared-types/src/plantilla.ts"
      provides: "Plantilla, VariableDetectada, PlantillaListResponse TS types"
      contains: "VariableDetectada"
  key_links:
    - from: "packages/shared-validation/src/index.ts"
      to: "variable-parser.ts / clausula-renumber.ts / plantillas.ts"
      via: "barrel re-export"
      pattern: "export \\* from './variable-parser'"
    - from: "packages/shared-validation/dist/index.js"
      to: "consumers (backend, frontend)"
      via: "CJS build output"
      pattern: "parseVariables"
---

<objective>
Build the pure, dependency-free parsing core for Phase 5 in the shared-validation package: the variable detector (regex over `{{objeto.campo}}` / `{{objeto.rol.campo}}`), the clause-renumbering utility (Spanish ordinals), and the Zod DTO schemas for plantillas. Also add the TS types in shared-types.

Purpose: These are the highest-value, easiest-to-test units (SEC-06 coverage target lives here). Isolating them in shared-validation means BOTH the backend (validation on save) and the frontend (live highlight/panel) consume the exact same logic — no drift.
Output: Two parsing modules + Zod schemas (CJS-built), TS types, and unit tests covering the regex/ordinal logic.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@docs/FUNCIONAL.md
@docs/DATOS.md
@packages/shared-validation/src/clausulas.ts
@packages/shared-validation/src/esquemas.ts
@packages/shared-validation/src/index.ts
@packages/shared-types/src/clausula.ts
@packages/shared-types/src/index.ts
@packages/shared-validation/package.json

<interfaces>
shared-validation is CommonJS (package.json `"type": "commonjs"`, `main: ./dist/index.js`). Build via `pnpm --filter @lexscribe/shared-validation build` (tsc). Consumers import via `@lexscribe/shared-validation`.

Existing Zod pattern (from src/clausulas.ts) — strict objects, `.default()`, `z.coerce` for query numbers:
  export const QueryClausulaSchema = z.object({ search: z.string().optional(), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20) }).strict();
  export type QueryClausulaInput = z.infer<typeof QueryClausulaSchema>;

Existing esquemas constant pattern (src/esquemas.ts) — NOTE: TIPO_OBJETO is ONLY expediente/contacto:
  export const TIPO_OBJETO = ['expediente', 'contacto'] as const;

Barrel (src/index.ts) re-exports each module with `export * from './<name>'`.
shared-types pattern (src/clausula.ts) — plain interfaces, ISO date strings, `_id: string`.

Variable syntax — FUNCIONAL §5.2 (authoritative):
- `{{objeto.campo}}` simple, e.g. `{{expediente.nombre}}`
- `{{objeto.rol.campo}}` roled, e.g. `{{contacto.vendedor.nombre}}`
- Identifiers: lowercase/camelCase with `_`, NO tildes, NO spaces. Regex `[a-zA-Z][a-zA-Z0-9_]*`.
- F-030b valid tipoObjeto: expediente, contacto, clausula, fecha. Unknown -> controlled error with variable + line.
- `{{#each ...}}` is P1/post-MVP (F-025) — do NOT support iteration.

plantillas variablesDetectadas element shape (DATOS §4.3):
  { raw: String, tipoObjeto: String, rol: String|null, campo: String, esArray: Boolean }
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Variable parser + KNOWN_TIPO_OBJETO + tests</name>
  <read_first>
    - packages/shared-validation/src/esquemas.ts (TIPO_OBJETO constant — DO NOT reuse it here, Pitfall 2)
    - packages/shared-validation/src/clausulas.ts (Zod/export style)
    - docs/FUNCIONAL.md §5.2 lines 72-113 (syntax + rules), F-030b line 165
    - docs/DATOS.md §4.3 variablesDetectadas shape (lines 160-168)
  </read_first>
  <behavior>
    - "{{expediente.nombre}}" -> 1 variable {raw:"{{expediente.nombre}}", tipoObjeto:"expediente", rol:null, campo:"nombre", esArray:false, valido:true, linea:1, columna:<idx>}
    - "{{contacto.vendedor.nombre}}" -> {tipoObjeto:"contacto", rol:"vendedor", campo:"nombre", valido:true}
    - "{{contrato.algo}}" -> {tipoObjeto:"contrato", valido:false} (unknown type, F-030b)
    - "{{fecha.hoy}}" and "{{clausula.objeto}}" -> valido:true (both KNOWN)
    - Two lines, var on line 2 -> linea:2 with column reset per line
    - Duplicate "{{expediente.nombre}}" twice -> 2 occurrences, but groupByTipoObjeto dedupes by (tipoObjeto,rol,campo)
    - Text with no braces -> [] (empty)
    - Malformed "{{ expediente.nombre }}" with inner spaces -> NOT matched (rule 1)
    - "{{contacto.cliente}}" (2 parts) -> tipoObjeto:"contacto", rol:null, campo:"cliente", valido:true
  </behavior>
  <action>
    Create `packages/shared-validation/src/variable-parser.ts`. Pure functions, NO dependencies (no zod here).

    1. KNOWN set — SEPARATE from esquemas TIPO_OBJETO (Pitfall 2; esquemas only allows expediente/contacto for addParametro, but the PARSER recognizes all four valid template types):
      export const KNOWN_TIPO_OBJETO = ['expediente', 'contacto', 'clausula', 'fecha'] as const;
      export type KnownTipoObjeto = (typeof KNOWN_TIPO_OBJETO)[number];

    2. Detected-variable interface:
      export interface VariableDetectada {
        raw: string;          // "{{contacto.vendedor.nombre}}"
        tipoObjeto: string;   // "contacto" (string, NOT KnownTipoObjeto — may be unknown)
        rol: string | null;   // "vendedor" or null
        campo: string;        // "nombre"
        esArray: boolean;     // F-025 heuristic — always false in MVP
        valido: boolean;      // tipoObjeto in KNOWN_TIPO_OBJETO
        linea: number;        // 1-based
        columna: number;      // 1-based, position of "{{" on that line
      }

    3. Regex (identifiers `[a-zA-Z][a-zA-Z0-9_]*`, no tildes/spaces); match `{{` + 2-or-3 dot-separated identifiers + `}}` with NO whitespace inside braces:
      const VARIABLE_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z][a-zA-Z0-9_]*)(?:\.([a-zA-Z][a-zA-Z0-9_]*))?\}\}/g;
      Capture: g1=primera, g2=segunda, g3=tercera(opcional).
      - g3 present -> tipoObjeto=g1, rol=g2, campo=g3.
      - g3 absent  -> tipoObjeto=g1, rol=null, campo=g2.

    4. export function parseVariables(texto: string): VariableDetectada[]
      - Split into lines for linea/columna. Iterate per line with a fresh regex (reset lastIndex), columna = match.index + 1.
      - valido = (KNOWN_TIPO_OBJETO as readonly string[]).includes(tipoObjeto).
      - esArray: false for all (F-025 post-MVP; do NOT parse {{#each}}).
      - Return ALL occurrences in document order (no dedupe here).

    5. export interface GrupoVariables { tipoObjeto: string; valido: boolean; variables: VariableDetectada[]; }
      export function groupByTipoObjeto(vars: VariableDetectada[]): GrupoVariables[]
      - Group by tipoObjeto. Within a group dedupe by `(rol ?? '') + '|' + campo` (keep first). Preserve group insertion order.

    6. export interface ResultadoValidacion { valido: boolean; invalidas: VariableDetectada[]; }
      export function validarVariables(vars: VariableDetectada[]): ResultadoValidacion
      - invalidas = vars where valido === false. valido = invalidas.length === 0. (Backend uses this for the F-030b save-block.)

    Keep < 200 lines (CLAUDE.md <500). No `any`.

    Create `packages/shared-validation/src/variable-parser.test.ts` with vitest (`import { describe, it, expect } from 'vitest'`) covering every <behavior> case. Aim >=90% lines (SEC-06).

    Add vitest to shared-validation (no runner exists yet):
    - package.json: add `"vitest": "^2.0.0"` to devDependencies; set test script to `"test": "vitest run"`.
    - Create `packages/shared-validation/vitest.config.ts`:
        import { defineConfig } from 'vitest/config';
        export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'], coverage: { provider: 'v8', include: ['src/variable-parser.ts','src/clausula-renumber.ts'], thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } } } });
    - Run `pnpm install` from root so vitest + @vitest/coverage-v8 resolve. (Add `"@vitest/coverage-v8": "^2.0.0"` to devDependencies too.)
  </action>
  <verify>
    <automated>cd packages/shared-validation && pnpm vitest run src/variable-parser.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "KNOWN_TIPO_OBJETO = \['expediente', 'contacto', 'clausula', 'fecha'\]" packages/shared-validation/src/variable-parser.ts -> match
    - grep "export function parseVariables" packages/shared-validation/src/variable-parser.ts -> match
    - grep "export function groupByTipoObjeto" packages/shared-validation/src/variable-parser.ts -> match
    - grep "export function validarVariables" packages/shared-validation/src/variable-parser.ts -> match
    - grep -c "from './esquemas'" packages/shared-validation/src/variable-parser.ts -> 0 (KNOWN set independent)
    - vitest run green for all describe blocks
  </acceptance_criteria>
  <done>parseVariables/groupByTipoObjeto/validarVariables exported, KNOWN_TIPO_OBJETO is a standalone 4-value const, all parser tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Clause-renumber utility + tests</name>
  <read_first>
    - packages/shared-validation/src/variable-parser.ts (file/style conventions from Task 1)
    - locked decisions D-04/D-05/D-06 (marker "CLÁUSULA PRIMERA.-", insert at cursor + renumber subsequent)
    - docs/FUNCIONAL.md F-042/F-043/F-044 (CLAU-04 insert + renumber)
  </read_first>
  <behavior>
    - ordinalToInt("PRIMERA")===1, ordinalToInt("SEGUNDA")===2, ordinalToInt("DECIMA")===10, ordinalToInt("VIGESIMA")===20
    - intToOrdinal(1)==="PRIMERA", intToOrdinal(11)==="UNDECIMA", intToOrdinal(21)==="VIGESIMA PRIMERA", intToOrdinal(50)==="QUINCUAGESIMA"
    - detectClausulaHeaders("CLÁUSULA PRIMERA.- Objeto\n...\nCLÁUSULA SEGUNDA.- Precio") -> 2 headers with {indiceLinea, ordinal, numero, raw}
    - Headers tolerate accent-less "CLAUSULA" and case ("Cláusula Primera.-")
    - insertClausulaAndRenumber(texto, "Pago aplazado...", afterNumero=1) -> new clause SEGUNDA, old SEGUNDA -> TERCERA, etc.
    - afterNumero=0 (top) -> new clause PRIMERA, all others +1
    - Text with no existing headers + insert -> inserted clause numbered PRIMERA
  </behavior>
  <action>
    Create `packages/shared-validation/src/clausula-renumber.ts`. Pure, no deps.

    1. Ordinal map 1..50 (Spanish feminine ordinals, UPPERCASE). Provide:
      export const ORDINALES: readonly string[];   // ORDINALES[1]="PRIMERA" ... build with [0]="" sentinel
      export function intToOrdinal(n: number): string;   // 1->"PRIMERA" ... 50->"QUINCUAGESIMA"; compound 21->"VIGESIMA PRIMERA"
      export function ordinalToInt(ordinal: string): number | null; // case/accent-insensitive; null if unknown
      Cover 1-50 (PRIMERA..QUINCUAGESIMA). 21-29 etc. compound "VIGESIMA PRIMERA". Normalize input via `.toUpperCase()` and strip accents (Á->A, É->E, ...) before lookup.

    2. Header detection. Marker per D-04 is exactly `CLÁUSULA <ORDINAL>.-`. Regex (case-insensitive, accent tolerant on the C-word):
      const HEADER_RE = /^(\s*)(CL[ÁA]USULA)\s+([A-ZÁÉÍÓÚ ]+?)\.-/gim;
      export interface ClausulaHeader { indiceLinea: number; ordinal: string; numero: number; raw: string; }
      export function detectClausulaHeaders(texto: string): ClausulaHeader[];
      Compute numero via ordinalToInt (skip header if null — malformed).

    3. Insert + renumber:
      export function insertClausulaAndRenumber(texto: string, clausulaTexto: string, afterNumero: number): string;
      // clausulaTexto = body WITHOUT the "CLÁUSULA X.-" prefix; afterNumero = insert as clause afterNumero+1; 0 = top.
      Algorithm:
        - Detect existing headers.
        - Inserted clause gets numero = afterNumero+1; every existing header with numero > afterNumero shifts +1.
        - Rewrite each affected header line: `CLÁUSULA ${intToOrdinal(nuevoNumero)}.-` (keep accented form in OUTPUT).
        - Splice the new clause (prefixed `CLÁUSULA ${intToOrdinal(afterNumero+1)}.- `) at the line boundary after the header whose numero === afterNumero (or top if 0).
        - Return full new text.

    Keep < 200 lines. No `any`.

    Create `packages/shared-validation/src/clausula-renumber.test.ts` (vitest) covering every <behavior> case. Aim >=85% lines (SEC-06).
  </action>
  <verify>
    <automated>cd packages/shared-validation && pnpm vitest run src/clausula-renumber.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function intToOrdinal" packages/shared-validation/src/clausula-renumber.ts -> match
    - grep "export function ordinalToInt" packages/shared-validation/src/clausula-renumber.ts -> match
    - grep "export function detectClausulaHeaders" packages/shared-validation/src/clausula-renumber.ts -> match
    - grep "export function insertClausulaAndRenumber" packages/shared-validation/src/clausula-renumber.ts -> match
    - grep "CL\[ÁA\]USULA" packages/shared-validation/src/clausula-renumber.ts -> match (accent-tolerant detection)
    - vitest run green for clausula-renumber.test.ts
  </acceptance_criteria>
  <done>Ordinal map + header detection + insert/renumber exported and tested; inserting at afterNumero shifts subsequent clauses correctly.</done>
</task>

<task type="auto">
  <name>Task 3: Plantillas Zod schemas + shared-types + barrel + CJS build</name>
  <read_first>
    - packages/shared-validation/src/clausulas.ts (Zod Create/Update/Query pattern)
    - packages/shared-validation/src/esquemas.ts (TipoDato/Nombre regex reuse)
    - packages/shared-validation/src/index.ts (barrel)
    - packages/shared-types/src/clausula.ts + src/index.ts (interface + barrel)
    - docs/DATOS.md §4.3 plantillas schema (lines 147-176) for field shapes
  </read_first>
  <action>
    1. Create `packages/shared-validation/src/plantillas.ts` mirroring clausulas.ts style:
      import { z } from 'zod';
      export const FORMATO_ORIGEN = ['txt', 'docx', 'pegado'] as const;
      export const FormatoOrigenSchema = z.enum(FORMATO_ORIGEN);
      export const CreatePlantillaSchema = z.object({ nombre: z.string().min(1).max(200), contenido: z.string().min(1).max(200000), formatoOriginal: FormatoOrigenSchema.default('pegado') }).strict();
      // Editing creates a NEW version (PLAN-06).
      export const UpdatePlantillaSchema = z.object({ nombre: z.string().min(1).max(200).optional(), contenido: z.string().min(1).max(200000) }).strict();
      export const QueryPlantillaSchema = z.object({ search: z.string().optional(), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20) }).strict();
      // PLAN-04: declare a new dynamic-schema field from the editor. Only expediente/contacto declarable; clausula/fecha rejected at service layer (Pitfall 4).
      export const DeclararVariableSchema = z.object({ tipoObjeto: z.enum(['expediente', 'contacto']), nombre: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/), tipoDato: z.enum(['texto', 'numero', 'fecha', 'booleano']).default('texto') }).strict();
      export type CreatePlantillaInput = z.infer<typeof CreatePlantillaSchema>;
      export type UpdatePlantillaInput = z.infer<typeof UpdatePlantillaSchema>;
      export type QueryPlantillaInput = z.infer<typeof QueryPlantillaSchema>;
      export type DeclararVariableInput = z.infer<typeof DeclararVariableSchema>;

    2. Update `packages/shared-validation/src/index.ts` — add after the clausulas/expedientes lines:
      export * from './plantillas';
      export * from './variable-parser';
      export * from './clausula-renumber';

    3. Create `packages/shared-types/src/plantilla.ts` (interfaces, ISO strings, mirror clausula.ts) with VariableDetectada (same shape as parser output), Plantilla (all DATOS §4.3 fields: _id, usuarioId, plantillaRaizId, version, nombre, contenido, formatoOriginal 'txt'|'docx'|'pegado', storagePath string|null, variablesDetectadas[], clausulasReferenciadas string[], activo, fechaInactivacion string|null, fechaCreacion, fechaActualizacion), and PlantillaListResponse {items,total,page,limit}.

    4. Update `packages/shared-types/src/index.ts` — add `export * from './plantilla';`

    5. Build both packages (CJS): from repo root run `pnpm run build:packages`. Confirm `packages/shared-validation/dist/index.js` re-exports parseVariables and `packages/shared-types/dist/plantilla.d.ts` exists.
  </action>
  <verify>
    <automated>cd packages/shared-validation && pnpm build && cd ../shared-types && pnpm build && cd ../.. && pnpm exec node -e "const v=require('./packages/shared-validation/dist'); if(typeof v.parseVariables!=='function'||typeof v.intToOrdinal!=='function'||!v.CreatePlantillaSchema){process.exit(1)} console.log('exports ok')"</automated>
  </verify>
  <acceptance_criteria>
    - grep "export const CreatePlantillaSchema" packages/shared-validation/src/plantillas.ts -> match
    - grep "export const DeclararVariableSchema" packages/shared-validation/src/plantillas.ts -> match
    - grep "tipoObjeto: z.enum(\['expediente', 'contacto'\])" packages/shared-validation/src/plantillas.ts -> match (PLAN-04 declarable set)
    - grep "export \* from './variable-parser'" packages/shared-validation/src/index.ts -> match
    - grep "export interface Plantilla" packages/shared-types/src/plantilla.ts -> match
    - node require check prints "exports ok"
  </acceptance_criteria>
  <done>Zod plantilla schemas + DeclararVariableSchema (expediente/contacto only) exported, barrel updated, shared-types Plantilla added, both packages build to CJS dist and expose parser + schemas.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/shared-validation test` runs vitest and all parser + renumber tests pass.
- `pnpm run build:packages` succeeds (shared-types + shared-validation tsc clean).
- KNOWN_TIPO_OBJETO (4 values) is a distinct constant from esquemas TIPO_OBJETO (2 values).
- DeclararVariableSchema restricts tipoObjeto to expediente|contacto (Pitfall 4 enforced at the schema boundary).
- `require('@lexscribe/shared-validation')` exposes parseVariables, groupByTipoObjeto, validarVariables, intToOrdinal, insertClausulaAndRenumber, CreatePlantillaSchema.
</verification>

<success_criteria>
PLAN-02 (detection), PLAN-03 (validation/unknown-type), CLAU-04 (renumber core) have their pure logic implemented and unit-tested at >=80% line coverage on variable-parser.ts and clausula-renumber.ts. Wave 2 (backend) and Wave 3 (frontend) can consume these exports without re-implementing parsing.
</success_criteria>

<output>
After completion, create `.planning/phases/05-plantillas-y-editor/05-01-SUMMARY.md`
</output>
