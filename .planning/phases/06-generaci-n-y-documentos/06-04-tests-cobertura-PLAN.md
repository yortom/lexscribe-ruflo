---
phase: 06-generaci-n-y-documentos
plan: 04
type: tdd
wave: 3
depends_on: ["06-02"]
files_modified:
  - apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts
  - apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts
  - apps/backend/src/modules/documentos/tests/generation.service.spec.ts
  - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts
  - apps/backend/jest.config.ts
autonomous: true
requirements: [DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07]
must_haves:
  truths:
    - "El módulo documentos alcanza >=80% de cobertura de líneas y funciones"
    - "La inmutabilidad de datosCongelados está cubierta por un test explícito (DOC-07)"
    - "jest.config.ts aplica coverageThreshold al directorio src/modules/documentos"
    - "La suite completa del backend queda verde"
  artifacts:
    - path: "apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts"
      provides: "Tests unitarios del repository (create/findById/listByExpediente/softDelete)"
    - path: "apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts"
      provides: "Tests del controller (rutas → service, @Audited, params)"
    - path: "apps/backend/jest.config.ts"
      provides: "coverageThreshold per ./src/modules/documentos/ >=80%"
      contains: "documentos"
  key_links:
    - from: "jest.config.ts"
      to: "src/modules/documentos coverage gate"
      via: "coverageThreshold"
      pattern: "documentos"
---

<objective>
Cerrar la cobertura del módulo documentos a >=80% (líneas + funciones) añadiendo specs de repository y controller, reforzando los specs de generation/documentos service (incluyendo el test explícito de inmutabilidad DOC-07), y configurando el coverageThreshold por directorio en jest.config.ts. Deja la suite backend completa verde.

Purpose: SEC-06 establece >=80% en servicios y utilidades críticas; el pipeline de generación es crítico. Asegura que DOC-07 (inmutabilidad) tiene cobertura explícita.
Output: Specs completos del módulo documentos, threshold enforced, suite verde.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/06-generaci-n-y-documentos/06-01-SUMMARY.md
@.planning/phases/06-generaci-n-y-documentos/06-02-SUMMARY.md

<interfaces>
<!-- Patrones de test del codebase -->

Patrón de threshold por directorio (jest.config.ts, establecido en 05-04 / 03-03):
```typescript
coverageThreshold: {
  './src/modules/documentos/': { lines: 80, functions: 80, branches: 60, statements: 80 },
}
```
NOTA (de STATE.md 05-04): el threshold por directorio cuenta controller + DTOs; el controller spec es necesario para que el agregado no caiga por debajo de 80%.

Patrón specs unitarios:
- repository: ver apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts (mock del Mongoose Model; MISSING_ID = '000000000000000000000000' para ramas not-found, evita BSONError).
- service: ver apps/backend/src/modules/plantillas/plantillas.service.spec.ts (mocks de repos/servicios).
- controller: ver apps/backend/src/modules/plantillas/plantillas.controller.spec.ts (mock del service, verifica delegación).

Specs ya creados en 06-01/06-02 (reforzar si falta cobertura, NO duplicar):
- generation.service.spec.ts (DOC-01/03/04/07).
- documentos.service.spec.ts (DOC-02/05/06/07).

Comando cobertura: `pnpm --filter backend test -- --coverage --collectCoverageFrom='src/modules/documentos/**/*.ts'` (o el script de coverage del repo). jest.config.ts targets *.spec.ts.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: documentos.repository.spec + documentos.controller.spec</name>
  <read_first>
    - apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts (patrón mock Model + MISSING_ID)
    - apps/backend/src/modules/plantillas/plantillas.controller.spec.ts (patrón controller spec)
    - apps/backend/src/modules/documentos/documentos.repository.ts (de 06-01)
    - apps/backend/src/modules/documentos/documentos.controller.ts (de 06-02)
  </read_first>
  <behavior>
    documentos.repository.spec.ts (mock del Mongoose Model):
    - create persiste con usuarioId convertido a ObjectId y devuelve el doc.
    - findById filtra por _id + usuarioId; devuelve null para MISSING_ID.
    - listByExpediente filtra por expedienteId, ordena fechaCreacion:-1, aplica skip/limit, devuelve {items,total}.
    - softDelete setea activo:false + fechaInactivacion, returnDocument:'after'.

    documentos.controller.spec.ts (mock del DocumentosService):
    - POST generar → service.generar(uid, expedienteId, dto).
    - POST upload → service.uploadExistente(uid, expedienteId, {file,nombre}).
    - GET :id/download → service.getDownloadUrl(uid,id).
    - GET (list) → service.list(uid, expedienteId, query).
    - DELETE :id → service.remove(uid,id).
  </behavior>
  <action>
    1. Crear `documentos.repository.spec.ts` siguiendo contactos.repository.spec.ts: mockear el Model con jest (find/findOne/findOneAndUpdate/create/countDocuments retornando objetos con `.sort().skip().limit().exec()` encadenables). Usar `MISSING_ID = '000000000000000000000000'`. Cubrir los 4 métodos.
    2. Crear `documentos.controller.spec.ts` siguiendo plantillas.controller.spec.ts: mock del DocumentosService (jest.fn por método); instanciar el controller con el mock; verificar que cada endpoint delega con los argumentos correctos.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend test -- documentos.repository.spec documentos.controller.spec</automated>
  </verify>
  <acceptance_criteria>
    - `apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts` existe y `grep "MISSING_ID" ...repository.spec.ts`
    - `apps/backend/src/modules/documentos/tests/documentos.controller.spec.ts` existe
    - `grep 'listByExpediente' apps/backend/src/modules/documentos/tests/documentos.repository.spec.ts` existe
    - `pnpm --filter backend test -- documentos.repository.spec documentos.controller.spec` pasa
  </acceptance_criteria>
  <done>Repository y controller specs verdes.</done>
</task>

<task type="auto">
  <name>Task 2: Reforzar DOC-07 + coverageThreshold + suite verde</name>
  <read_first>
    - apps/backend/jest.config.ts (coverageThreshold existente de fases previas)
    - apps/backend/src/modules/documentos/tests/generation.service.spec.ts (de 06-01 — verificar test DOC-07)
    - apps/backend/src/modules/documentos/tests/documentos.service.spec.ts (de 06-02)
    - .planning/STATE.md (nota 05-04 sobre threshold por directorio)
  </read_first>
  <action>
    1. Verificar que generation.service.spec.ts contiene un test explícito DOC-07 que demuestra inmutabilidad: capturar el objeto pasado a `doc.render(...)`, persistir, luego mutar el objeto expediente fuente y aseverar que el `datosCongelados` persistido NO cambia (igualdad estructural con el snapshot capturado, no referencia compartida). Si no existe o es débil, añadirlo/reforzarlo.
    2. En `jest.config.ts` añadir al `coverageThreshold` la entrada por directorio:
       ```typescript
       './src/modules/documentos/': { lines: 80, functions: 80, branches: 60, statements: 80 },
       ```
       (No bajar thresholds existentes de otros módulos.)
    3. Ejecutar la suite del módulo con cobertura y comprobar >=80% líneas/funciones. Si algún archivo arrastra el agregado (DTOs, schema), añadir specs mínimos o ajustar `collectCoverageFrom` según el patrón establecido en 05-04 (incluir controller/DTOs en el directorio contado).
    4. Ejecutar la suite backend completa (unit) y confirmar verde.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && pnpm --filter backend test -- --coverage --collectCoverageFrom='src/modules/documentos/**/*.ts'</automated>
  </verify>
  <acceptance_criteria>
    - `grep "'./src/modules/documentos/'" apps/backend/jest.config.ts` existe en coverageThreshold
    - `grep -i 'inmutab\|datosCongelados' apps/backend/src/modules/documentos/tests/generation.service.spec.ts` existe (DOC-07 explícito)
    - `pnpm --filter backend test -- --coverage --collectCoverageFrom='src/modules/documentos/**/*.ts'` reporta lines>=80 y functions>=80 para el módulo documentos sin fallar el threshold
    - `pnpm --filter backend test` (suite unit completa) sale 0
  </acceptance_criteria>
  <done>DOC-07 cubierto explícitamente; threshold del módulo documentos >=80% enforced; suite backend verde.</done>
</task>

</tasks>

<verification>
- `pnpm --filter backend test` (unit) verde con coverageThreshold de documentos satisfecho.
- `pnpm --filter backend test:e2e -- documentos` verde (de 06-02, no debe regresar).
- DOC-07 cubierto por test de inmutabilidad explícito.
</verification>

<success_criteria>
- SEC-06 aplicado al módulo crítico: >=80% líneas/funciones en src/modules/documentos.
- DOC-01..DOC-07 con cobertura de tests (unit + e2e a través de 06-01/06-02 + este plan).
- coverageThreshold por directorio enforced en jest.config.ts.
</success_criteria>

<output>
After completion, create `.planning/phases/06-generaci-n-y-documentos/06-04-SUMMARY.md`
</output>
