---
phase: 03-contactos
plan: 03
type: execute
wave: 3
depends_on: ["03-01", "03-02"]
files_modified:
  - apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts
  - apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts
  - apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts
  - apps/backend/jest.config.ts
autonomous: true
requirements:
  - CONT-05

must_haves:
  truths:
    - "`pnpm --filter backend test -- --testPathPattern=contactos --coverage` exits 0 con cobertura de líneas/funciones ≥ 80% en `apps/backend/src/modules/contactos/**`"
    - "`contactos.repository.spec.ts` cubre: create, findById (happy + 404), findAll (search + tipologia + paginación), softDelete, update — todos con mocks Mongoose, sin mongodb-memory-server"
    - "`contactos.service.spec.ts` cubre: createContacto (happy path), createContacto con NIF duplicado → ConflictError, createContacto con `parametros` → `esquemasService.addParametro` llamado por clave, findAll paginado, findOne (happy + NotFoundError), update, remove"
    - "`contactos.controller.spec.ts` cubre: POST, GET list, GET :id, PATCH :id, DELETE :id — todos con JwtAuthGuard overrideado; verifica que el guard está activo via Reflect.getMetadata"
    - "`apps/backend/jest.config.ts` contiene `coverageThreshold` con entrada `'./src/modules/contactos/'` → `{ lines: 80, functions: 80 }`"
    - "`pnpm test` (suite completa) exits 0 — ninguna regresión introducida"
  artifacts:
    - path: "apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts"
      provides: "Unit tests ContactosRepository con mocks de Model Mongoose"
      min_lines: 80
      contains: "getModelToken"
    - path: "apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts"
      provides: "Unit tests ContactosService con mocks de Repository y EsquemasService"
      min_lines: 120
      contains: "addParametro"
    - path: "apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts"
      provides: "Unit tests ContactosController con overrideGuard(JwtAuthGuard)"
      min_lines: 80
      contains: "overrideGuard"
  key_links:
    - from: "apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts"
      to: "EsquemasService.addParametro"
      via: "jest.fn() mock — verificar llamada cuando dto.parametros tiene claves nuevas"
      pattern: "addParametro"
    - from: "apps/backend/jest.config.ts"
      to: "coverageThreshold"
      via: "añadir entrada `'./src/modules/contactos/'` con lines: 80, functions: 80"
      pattern: "coverageThreshold"
---

<objective>
Alcanzar ≥ 80% de cobertura de líneas y funciones en el módulo `contactos` mediante tests unitarios aislados (sin MongoDB real, sin servidor HTTP). Esta cobertura es el criterio de aceptación de CONT-05 y cierra la calidad del módulo antes de que Phase 4 lo use como dependencia.

Purpose: Garantizar que el contrato de ContactosService, ContactosRepository y ContactosController está verificado por tests reproducibles en CI, detectando regresiones cuando Phase 4 añada relaciones con expedientes.
Output: Tres archivos de unit tests que pasan con cobertura ≥ 80%; jest.config.ts con threshold configurado; `pnpm test` verde en CI.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@apps/backend/jest.config.ts
@apps/backend/src/modules/contactos/contactos.service.ts
@apps/backend/src/modules/contactos/contactos.repository.ts
@apps/backend/src/modules/contactos/contactos.controller.ts
@apps/backend/src/modules/contactos/schemas/contacto.schema.ts
@apps/backend/src/modules/contactos/dto/create-contacto.dto.ts
@apps/backend/src/modules/contactos/dto/update-contacto.dto.ts
@apps/backend/src/modules/contactos/dto/query-contacto.dto.ts
@apps/backend/src/modules/esquemas/esquemas.service.ts
@apps/backend/src/common/errors/index.ts
@apps/backend/src/modules/esquemas/__tests__/esquemas.service.spec.ts
@.planning/phases/03-contactos/03-RESEARCH.md
@.planning/phases/03-contactos/03-VALIDATION.md
</context>

<tasks>

<task type="auto">
  <name>Task 1 (Wave 3): Añadir coverage threshold en jest.config.ts</name>
  <files>
    apps/backend/jest.config.ts
  </files>
  <read_first>
    apps/backend/jest.config.ts (ver configuración actual de coverage y collectCoverageFrom),
    apps/backend/src/modules/esquemas/__tests__/esquemas.service.spec.ts (patrón de test existente a replicar)
  </read_first>
  <action>
    Editar `apps/backend/jest.config.ts`. Añadir o extender la sección `coverageThreshold` para que el path
    `'./src/modules/contactos/'` tenga threshold mínimo del 80% en líneas, funciones, statements y 70% en branches:

    ```typescript
    coverageThreshold: {
      './src/modules/contactos/': {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
    ```

    Si ya existe `coverageThreshold` global, AÑADIR esta entrada al objeto existente sin eliminar la global.

    Verificar también que `collectCoverageFrom` incluye `'src/**/*.ts'` y excluye:
    `'**/*.spec.ts'`, `'**/*.e2e-spec.ts'`, `'**/index.ts'`, `'**/*.module.ts'`. Añadir si faltan.
  </action>
  <verify>
    <automated>
      grep -q "coverageThreshold" apps/backend/jest.config.ts &&
      grep -q "contactos" apps/backend/jest.config.ts &&
      echo "jest.config.ts OK"
    </automated>
  </verify>
  <done>
    - `apps/backend/jest.config.ts` contiene `'./src/modules/contactos/'` como clave en `coverageThreshold`
    - `apps/backend/jest.config.ts` contiene `lines: 80` bajo esa clave
    - `apps/backend/jest.config.ts` contiene `functions: 80` bajo esa clave
  </done>
</task>

<task type="auto">
  <name>Task 2 (Wave 3): Unit tests de ContactosRepository</name>
  <files>
    apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts
  </files>
  <read_first>
    apps/backend/src/modules/contactos/contactos.repository.ts (implementación exacta a testear — leer métodos, firmas, errores lanzados),
    apps/backend/src/modules/contactos/schemas/contacto.schema.ts (tipos del documento),
    apps/backend/src/modules/esquemas/__tests__/esquemas.service.spec.ts (patrón de mocking NestJS con getModelToken)
  </read_first>
  <action>
    Crear `apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts`.

    Usar `@nestjs/testing` + `getModelToken('Contacto')` para mockear el Model Mongoose.
    NO importar mongodb-memory-server. NO importar MongoMemoryServer.

    Mock del modelo:
    ```typescript
    const mockContactoModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
      softDelete: jest.fn(),
      exec: jest.fn(),
      lean: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    };
    ```

    Tests OBLIGATORIOS (uno por `it`):

    1. `create` — mock `model.create` resuelve con doc `{ _id: 'id1', nombre: 'Test', activo: true }`;
       verificar que el resultado coincide.

    2. `findById` happy path — mock `findOne().exec()` resuelve con doc; verificar retorno.

    3. `findById` not found — mock `findOne().exec()` resuelve con `null`;
       verificar que lanza `NotFoundError`.

    4. `findAll` paginado — mock `find().sort().skip().limit().lean().exec()` resuelve con array de 2 docs;
       mock `countDocuments` resuelve con `2`; verificar que retorna `{ items, total: 2, page: 1, limit: 20 }`.

    5. `findAll` con filtro tipologia — verificar que el query pasado a `find()` incluye `{ tipologia: 'cliente' }`.

    6. `softDelete` — mock `model.softDelete` resuelve `{ modifiedCount: 1 }`;
       verificar que `softDelete` fue llamado con filtro correcto.

    7. `update` — mock `findOneAndUpdate().exec()` resuelve con doc actualizado;
       verificar que retorna el doc con los campos actualizados.
  </action>
  <verify>
    <automated>
      pnpm --filter backend test -- --testPathPattern=contactos.repository --passWithNoTests=false
    </automated>
  </verify>
  <done>
    - Archivo existe: `apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts`
    - `grep -c "it(" apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts` devuelve ≥ 7
    - El archivo contiene `getModelToken('Contacto')`
    - El archivo NO contiene `mongodb-memory-server` ni `MongoMemoryServer`
    - `pnpm --filter backend test -- --testPathPattern=contactos.repository` exits 0
  </done>
</task>

<task type="auto">
  <name>Task 3 (Wave 3): Unit tests de ContactosService</name>
  <files>
    apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts
  </files>
  <read_first>
    apps/backend/src/modules/contactos/contactos.service.ts (TODA la lógica a testear — leer línea a línea antes de escribir tests),
    apps/backend/src/modules/contactos/contactos.repository.ts (interfaz del repositorio mockeado),
    apps/backend/src/modules/esquemas/esquemas.service.ts (firma de addParametro a mockear),
    apps/backend/src/common/errors/index.ts (errores de dominio esperados: NotFoundError, ConflictError)
  </read_first>
  <action>
    Crear `apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts`.

    Mocks requeridos:
    ```typescript
    const mockContactosRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockEsquemasService = {
      addParametro: jest.fn(),
    };
    ```

    Tests OBLIGATORIOS:

    1. `create` — happy path: `repository.create` resuelve con doc; verificar que retorna el doc.

    2. `create` — NIF duplicado: `repository.create` lanza error con code 11000 (MongoDB duplicate key);
       verificar que el service lanza `ConflictError` con mensaje que contiene `'already registered'`.

    3. `create` — con parámetros dinámicos: dto incluye `parametros: { profesion: 'Abogado', aniosExp: 5 }`;
       verificar que `esquemasService.addParametro` es llamado 2 veces (una por clave),
       con `tipoObjeto: 'contacto'` y el `usuarioId` correcto;
       verificar inferencia de tipoDato: string → 'texto', number → 'numero'.

    4. `findAll`: llama `repository.findAll` con `{ usuarioId, search, tipologia, page, limit }`;
       retorna el resultado del repo tal cual.

    5. `findOne` — happy path: `repository.findById` resuelve con doc; retorna doc.

    6. `findOne` — not found: `repository.findById` lanza o resuelve null;
       verificar que el service lanza `NotFoundError('contacto', id)`.

    7. `update`: `repository.findById` verifica existencia; `repository.update` actualiza;
       si el dto incluye `parametros`, `addParametro` es llamado por cada clave.

    8. `remove`: `repository.findById` verifica existencia; `repository.softDelete` es llamado
       con `{ _id: id, usuarioId }`.

    NOTA: El stub `expedientesVinculados: []` está embedido dentro del método `getById`/`findOne`
    que ya se cubre en el test #5. No existe `findExpedientesVinculados` como método separado.
  </action>
  <verify>
    <automated>
      pnpm --filter backend test -- --testPathPattern=contactos.service --passWithNoTests=false
    </automated>
  </verify>
  <done>
    - Archivo existe: `apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts`
    - `grep -c "it(" apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts` devuelve ≥ 8
    - El archivo contiene `addParametro`
    - El archivo contiene `ConflictError`
    - El archivo contiene `NotFoundError`
    - `pnpm --filter backend test -- --testPathPattern=contactos.service` exits 0
  </done>
</task>

<task type="auto">
  <name>Task 4 (Wave 3): Unit tests de ContactosController + verificar cobertura ≥ 80%</name>
  <files>
    apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts
  </files>
  <read_first>
    apps/backend/src/modules/contactos/contactos.controller.ts (decoradores y métodos exactos a testear),
    apps/backend/src/modules/contactos/contactos.service.ts (métodos mockeados),
    apps/backend/src/modules/auth/__tests__/auth.service.spec.ts (patrón de mocking de guards existente en el proyecto)
  </read_first>
  <action>
    Crear `apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts`.

    Mock del servicio:
    ```typescript
    const mockContactosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    ```

    Para mockear `JwtAuthGuard` usar `overrideGuard`:
    ```typescript
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactosController],
      providers: [{ provide: ContactosService, useValue: mockContactosService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    ```

    Tests OBLIGATORIOS:

    1. `POST /contactos` — llama `service.create(dto, usuarioId)`; retorna el resultado.

    2. `GET /contactos` — llama `service.findAll(query, usuarioId)`; retorna objeto paginado.

    3. `GET /contactos/:id` — llama `service.findOne(id, usuarioId)`; retorna doc.

    4. `PATCH /contactos/:id` — llama `service.update(id, dto, usuarioId)`; retorna doc actualizado.

    5. `DELETE /contactos/:id` — llama `service.remove(id, usuarioId)`; retorna confirmación.

    6. Guard activo — verificar que JwtAuthGuard está aplicado al controlador:
       ```typescript
       const guards = Reflect.getMetadata('__guards__', ContactosController);
       expect(guards).toContain(JwtAuthGuard);
       ```

    Tras escribir los tests, ejecutar la suite completa con coverage:
    ```bash
    pnpm --filter backend test -- \
      --testPathPattern=contactos \
      --coverage \
      --collectCoverageFrom='src/modules/contactos/**/*.ts'
    ```
    Si alguna dimensión (lines/functions/statements) está por debajo del 80%, añadir tests adicionales
    en el spec file correspondiente hasta alcanzarlo. Finalmente ejecutar `pnpm test` completo.
  </action>
  <verify>
    <automated>
      pnpm --filter backend test -- --testPathPattern=contactos --coverage --collectCoverageFrom='src/modules/contactos/**/*.ts' --passWithNoTests=false &&
      pnpm test
    </automated>
  </verify>
  <done>
    - Archivo existe: `apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts`
    - `grep -c "it(" apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts` devuelve ≥ 6
    - El archivo contiene `overrideGuard(JwtAuthGuard)`
    - El archivo contiene `JwtAuthGuard`
    - `pnpm --filter backend test -- --testPathPattern=contactos --coverage` exits 0 con Lines ≥ 80%
    - `pnpm test` exits 0
    - `pnpm build` exits 0
  </done>
</task>

</tasks>

## Verification

```bash
# Unit tests con coverage del módulo contactos
pnpm --filter backend test -- --testPathPattern=contactos --coverage \
  --collectCoverageFrom='src/modules/contactos/**/*.ts'

# Suite completa (no regresiones)
pnpm test

# Build limpio
pnpm build
```

**Passed when:**
- Todos los unit tests de contactos pasan
- Cobertura ≥ 80% (lines, functions, statements) en `src/modules/contactos/**`
- Suite completa verde
- Build limpio sin errores TypeScript
