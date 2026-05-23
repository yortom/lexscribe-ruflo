---
phase: 04-clausulas-y-expedientes
plan: 04
type: execute
wave: 3
depends_on: ["04-01", "04-02", "04-03"]
files_modified:
  - apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts
  - apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts
  - apps/backend/src/modules/clausulas/__tests__/clausulas.controller.spec.ts
  - apps/backend/src/modules/expedientes/__tests__/expedientes.repository.spec.ts
  - apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts
  - apps/backend/src/modules/expedientes/__tests__/expedientes.controller.spec.ts
  - apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts
  - apps/backend/jest.config.ts
autonomous: true
requirements: [CLAU-01, CLAU-02, CLAU-03, EXPE-01, EXPE-02, EXPE-03, EXPE-04, EXPE-05, EXPE-06, EXPE-07]
must_haves:
  truths:
    - "Cobertura ≥80% line y ≥80% function en `apps/backend/src/modules/clausulas/`"
    - "Cobertura ≥80% line y ≥80% function en `apps/backend/src/modules/expedientes/`"
    - "ContactosService.getById está testeado con expedientesRepo mockeado devolviendo expedientes vinculados (CONT-05 unit)"
    - "Tests específicos: $text search en clausulas.repository, push/pull contactos en expedientes.repository, validación duplicado en linkContacto, eventEmitter.emit en link/unlink"
    - "`pnpm --filter @lexscribe/backend test` finaliza verde con coverageThreshold cumplido"
  artifacts:
    - path: "apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts"
      provides: "Unit tests servicio cláusulas"
      min_lines: 100
    - path: "apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts"
      provides: "Unit tests servicio expedientes incluyendo link/unlink + emit eventos"
      min_lines: 200
    - path: "apps/backend/jest.config.ts"
      provides: "coverageThreshold extendido a clausulas y expedientes"
      contains: "./src/modules/clausulas/"
  key_links:
    - from: "apps/backend/jest.config.ts"
      to: "coverageThreshold per-module"
      via: "config object"
      pattern: "./src/modules/(clausulas|expedientes)/"
---

<objective>
Completar la cobertura unit (Jest) de los módulos `clausulas` y `expedientes` siguiendo el patrón Phase 3 (87.31% line, 96.15% function logrados en contactos). Añadir tests específicos para los puntos no triviales: `$text` search en repository de cláusulas, validación de unicidad `(contactoId, rol)` en linkContacto, integración con `forwardRef` ContactosService↔ExpedientesRepository (mockeada). Actualizar `jest.config.ts` para añadir `coverageThreshold` por módulo.

Purpose: Cierre de calidad Phase 4 — completar Success Criteria #5 del estilo Phase 3 (cobertura ≥80% módulos). Asegurar regresión-protection para Phase 5 que construirá sobre estos módulos.

Output: ~60 nuevos tests unit (Jest, MongoMemoryServer-free salvo donde sea imprescindible), `coverageThreshold` actualizado, `pnpm test` verde con coverage gates.
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
@CLAUDE.md

# Phase 3 reference unit test patterns
@apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts
@apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts
@apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts
@apps/backend/jest.config.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Unit tests Cláusulas — repository (search $text, label filter, paginación, soft-delete), service (CRUD + errores), controller (DTO mapping)</name>
  <read_first>
    - apps/backend/src/modules/contactos/__tests__/contactos.repository.spec.ts (patrón de mock Model + schema pre-hook coverage)
    - apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts (patrón mock repo + esquemasService)
    - apps/backend/src/modules/contactos/__tests__/contactos.controller.spec.ts (patrón mock service)
    - apps/backend/src/modules/clausulas/clausulas.repository.ts (creado en 04-01)
    - apps/backend/src/modules/clausulas/clausulas.service.ts
    - apps/backend/src/modules/clausulas/clausulas.controller.ts
  </read_first>
  <behavior>
    - **Repository tests** (MongoMemoryServer NO requerido — usar mock `Model` con jest.fn()):
      - `findAll` sin filtros: filter solo `usuarioId`, sort por `fechaCreacion:-1`
      - `findAll` con `search`: filter contiene `$text: { $search: <term> }`, sort por `score: { $meta: 'textScore' }`
      - `findAll` con `label`: filter contiene `labels: <label>`
      - `findAll` con search+label combinado: filter contiene ambos
      - `findAll` paginación: skip = (page-1)*limit, limit aplicado
      - `findById` aplica `toObjectId` a id y usuarioId; query es `{_id, usuarioId}`
      - `create` invoca `model.create({...data, usuarioId})`
      - `update` usa `findOneAndUpdate` con `returnDocument:'after'`
      - `softDelete` setea `{activo:false, fechaInactivacion: Date}`
      - `toObjectId` acepta string y ObjectId ya construido (cubrir ambas ramas)
      - Schema-level: verificar que `ClausulaSchema` tiene `softDeletePlugin` aplicado y los dos índices (compound + text). Patrón Phase 3: extraer hooks via `ClausulaSchema.s.hooks._pres` y verificar pre-hook de soft-delete está presente.
    - **Service tests** (mock repo):
      - `list` invoca `repo.findAll` y envuelve respuesta con `page, limit`
      - `getById` retorna doc; lanza `NotFoundError('clausula', id)` si null
      - `create` invoca `repo.create` y retorna doc
      - `update` lanza `NotFoundError` si repo retorna null
      - `remove` lanza `NotFoundError` si repo retorna null
    - **Controller tests** (mock service):
      - cada handler delega correctamente al service con `(uid, ...args)`
      - `@CurrentUser('id')` extracts el `uid` correctamente — mockear via parámetro directo
  </behavior>
  <action>
    1. Crear `apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts`:
       ```typescript
       import { Test } from '@nestjs/testing';
       import { getModelToken } from '@nestjs/mongoose';
       import { Types } from 'mongoose';
       import { ClausulasRepository } from '../clausulas.repository';
       import { Clausula, ClausulaSchema } from '../schemas/clausula.schema';

       describe('ClausulasRepository', () => {
         let repo: ClausulasRepository;
         let model: any;

         beforeEach(async () => {
           model = {
             find: jest.fn().mockReturnThis(),
             findOne: jest.fn().mockReturnThis(),
             findOneAndUpdate: jest.fn().mockReturnThis(),
             countDocuments: jest.fn().mockReturnThis(),
             create: jest.fn(),
             sort: jest.fn().mockReturnThis(),
             skip: jest.fn().mockReturnThis(),
             limit: jest.fn().mockReturnThis(),
             exec: jest.fn(),
           };
           const ref = await Test.createTestingModule({
             providers: [ClausulasRepository,
               { provide: getModelToken(Clausula.name), useValue: model }],
           }).compile();
           repo = ref.get(ClausulasRepository);
         });

         describe('findAll', () => {
           it('builds filter with $text and score sort when search provided', async () => {
             model.exec.mockResolvedValueOnce([]).mockResolvedValueOnce(0);
             await repo.findAll('507f1f77bcf86cd799439011', { search: 'hipoteca', page: 1, limit: 20 });
             expect(model.find).toHaveBeenCalledWith(
               expect.objectContaining({ $text: { $search: 'hipoteca' } }),
               expect.objectContaining({ score: { $meta: 'textScore' } }),
             );
             expect(model.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
           });
           it('builds filter with labels when label provided', async () => { /* ... */ });
           it('combines search and label filters', async () => { /* ... */ });
           it('uses fechaCreacion sort when no search', async () => { /* ... */ });
           it('applies pagination skip and limit', async () => { /* ... */ });
         });
         // findById, create, update, softDelete, toObjectId branches
       });

       describe('ClausulaSchema', () => {
         it('has softDeletePlugin pre-find hook', () => {
           const hooks = (ClausulaSchema as any).s.hooks._pres;
           const findHook = hooks.get('find');
           expect(findHook).toBeDefined();
           expect(findHook.length).toBeGreaterThan(0);
         });
         it('has text index on nombre and texto', () => {
           const indexes = ClausulaSchema.indexes();
           const textIdx = indexes.find(([_, opts]) => opts?.name === 'clausula_text_idx');
           expect(textIdx).toBeDefined();
           expect(textIdx![0]).toEqual({ nombre: 'text', texto: 'text' });
         });
         it('has compound index {usuarioId, activo, labels}', () => {
           const indexes = ClausulaSchema.indexes();
           const compound = indexes.find(([fields]) =>
             fields.usuarioId === 1 && fields.activo === 1 && fields.labels === 1);
           expect(compound).toBeDefined();
         });
       });
       ```
       Mínimo 15 tests.

    2. Crear `apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts` (≥10 tests): cada método de ClausulasService con mock repo verificando llamadas + error handling.

    3. Crear `apps/backend/src/modules/clausulas/__tests__/clausulas.controller.spec.ts` (≥6 tests): cada endpoint mock service.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend test -- --testPathPattern=clausulas</automated>
  </verify>
  <acceptance_criteria>
    - Existen 3 ficheros spec en `apps/backend/src/modules/clausulas/__tests__/`
    - `grep -c "it(" apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts` ≥15
    - `grep -c "it(" apps/backend/src/modules/clausulas/__tests__/clausulas.service.spec.ts` ≥10
    - `grep -c "it(" apps/backend/src/modules/clausulas/__tests__/clausulas.controller.spec.ts` ≥6
    - `grep -n "\\$text" apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts` retorna match
    - `grep -n "clausula_text_idx" apps/backend/src/modules/clausulas/__tests__/clausulas.repository.spec.ts` retorna match
    - `pnpm --filter @lexscribe/backend test -- --testPathPattern=clausulas` exit 0
  </acceptance_criteria>
  <done>
    Suite unit cláusulas verde con ≥31 tests cubriendo repo, service, controller y schema (índices, plugin).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Unit tests Expedientes — repository (findByContactoId, push/pullContacto, search), service (linkContacto unicidad + eventEmitter, unlinkContacto, getById con placeholders), controller</name>
  <read_first>
    - apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts (cómo mockear EsquemasService + repo)
    - apps/backend/src/modules/expedientes/expedientes.service.ts (creado en 04-02)
    - apps/backend/src/modules/expedientes/expedientes.repository.ts
    - apps/backend/src/modules/expedientes/expedientes.controller.ts
  </read_first>
  <behavior>
    - **Repository**:
      - `findByContactoId` construye query `{usuarioId, 'contactos.contactoId': ObjectId}`
      - `pushContacto` usa `$push: { contactos: vinculo }` con `returnDocument:'after'`
      - `pullContacto` usa `$pull: { contactos: {contactoId, rol} }`
      - `findAll` con `contactoId` filtra `'contactos.contactoId'`
      - `findAll` con `search` usa `$text`
    - **Service `linkContacto`**:
      - llama `contactosRepo.findById` → si null, lanza `NotFoundError('contacto', id)`
      - llama `repo.findById` → si null, lanza `NotFoundError('expediente', id)`
      - si `expediente.contactos` contiene `{contactoId, rol}` exacto → lanza `ConflictError` con mensaje que incluye `rol`
      - en caso éxito: invoca `repo.pushContacto` con `Types.ObjectId(contactoId)` y `rol`
      - en caso éxito: invoca `eventEmitter.emit('expedientes.linked', {usuarioId, recurso:'expediente', recursoId, contexto:{contactoId,rol}})`
    - **Service `unlinkContacto`**:
      - lanza `NotFoundError('expediente', id)` si no existe
      - lanza `NotFoundError('vinculo', ...)` si el par no estaba
      - emite `expedientes.unlinked` con contexto correcto
    - **Service `getById`**: retorna `{...doc, documentos:[], fechas:[]}` (placeholders presentes)
    - **Service `create`/`update`**: registra parámetros via `esquemasService.addParametro(uid, 'expediente', ...)`
    - **Schema**: indices presentes (text, contactos.contactoId, usuarioId,activo,fechaCreacion); softDeletePlugin aplicado
    - **Controller**: 7 endpoints (list, getById, create, update, remove, link, unlink) delegan al service; `decodeURIComponent(rol)` aplicado en unlink
  </behavior>
  <action>
    Crear 3 specs en `apps/backend/src/modules/expedientes/__tests__/`:

    1. `expedientes.repository.spec.ts` (≥15 tests, patrón mock Model como en Task 1).
    2. `expedientes.service.spec.ts` (≥20 tests, mock `repo`, `contactosRepo`, `esquemasService`, `eventEmitter`):
       ```typescript
       describe('linkContacto', () => {
         it('throws NotFoundError if contacto does not exist', async () => {
           contactosRepo.findById.mockResolvedValueOnce(null);
           await expect(service.linkContacto(uid, expId, dto))
             .rejects.toThrow(NotFoundError);
         });
         it('throws ConflictError if (contactoId,rol) already exists', async () => {
           contactosRepo.findById.mockResolvedValueOnce({ _id: contactoId } as any);
           repo.findById.mockResolvedValueOnce({
             _id: expId, contactos: [{ contactoId: new Types.ObjectId(dto.contactoId), rol: dto.rol }]
           } as any);
           await expect(service.linkContacto(uid, expId, dto))
             .rejects.toThrow(ConflictError);
         });
         it('emits expedientes.linked event with correct payload', async () => {
           // ... setup happy path
           await service.linkContacto(uid, expId, dto);
           expect(eventEmitter.emit).toHaveBeenCalledWith('expedientes.linked',
             expect.objectContaining({
               usuarioId: uid, recurso: 'expediente', recursoId: expId,
               contexto: { contactoId: dto.contactoId, rol: dto.rol },
             }));
         });
       });
       ```
    3. `expedientes.controller.spec.ts` (≥7 tests, uno por endpoint).
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend test -- --testPathPattern=expedientes</automated>
  </verify>
  <acceptance_criteria>
    - 3 ficheros existen en `apps/backend/src/modules/expedientes/__tests__/`
    - `grep -c "it(" apps/backend/src/modules/expedientes/__tests__/expedientes.repository.spec.ts` ≥15
    - `grep -c "it(" apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` ≥20
    - `grep -c "it(" apps/backend/src/modules/expedientes/__tests__/expedientes.controller.spec.ts` ≥7
    - `grep -n "expedientes.linked" apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` retorna match
    - `grep -n "expedientes.unlinked" apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` retorna match
    - `grep -n "ConflictError" apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` retorna match
    - `grep -n "documentos: \\[\\]\\|fechas: \\[\\]" apps/backend/src/modules/expedientes/__tests__/expedientes.service.spec.ts` retorna match
    - `pnpm --filter @lexscribe/backend test -- --testPathPattern=expedientes` exit 0
  </acceptance_criteria>
  <done>
    Suite unit expedientes verde con ≥42 tests cubriendo todos los métodos críticos incluyendo eventos y unicidad.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Ampliar ContactosService unit test (CONT-05 con expedientesRepo mockeado) + actualizar jest.config.ts coverageThreshold</name>
  <read_first>
    - apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts (test actual con stub expedientesVinculados:[])
    - apps/backend/src/modules/contactos/contactos.service.ts (modificado en 04-02 — ya inyecta expedientesRepo)
    - apps/backend/jest.config.ts (coverageThreshold actual sólo cubre contactos)
  </read_first>
  <behavior>
    - El test existente que verifica `expedientesVinculados:[]` debe actualizarse: ahora ContactosService inyecta `ExpedientesRepository` mockeado; cuando el mock retorna `[]`, `expedientesVinculados` es `[]`; cuando retorna `[{...}]`, mapea a `{_id, nombre, rol}` correctamente.
    - `jest.config.ts` añade `coverageThreshold` para `./src/modules/clausulas/` y `./src/modules/expedientes/` con `lines:80, functions:80, branches:70` (mismo perfil que contactos).
    - `pnpm --filter @lexscribe/backend test --coverage` finaliza verde respetando todos los thresholds.
  </behavior>
  <action>
    1. Actualizar `apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts`:
       - Añadir mock provider `{ provide: ExpedientesRepository, useValue: { findByContactoId: jest.fn() } }`
       - Localizar test "getById returns contacto with empty expedientesVinculados" y actualizarlo: cuando `expedientesRepo.findByContactoId` resuelve `[]`, retorna `expedientesVinculados:[]`.
       - Añadir nuevo test:
         ```typescript
         it('CONT-05: getById returns expedientesVinculados from ExpedientesRepository', async () => {
           const contactoId = '507f1f77bcf86cd799439011';
           const expId = '507f1f77bcf86cd799439022';
           repo.findById.mockResolvedValueOnce({
             _id: contactoId, toObject: () => ({ _id: contactoId, nombre: 'Foo' }),
           } as any);
           expedientesRepo.findByContactoId.mockResolvedValueOnce([{
             _id: { toString: () => expId },
             nombre: 'Caso X',
             contactos: [{ contactoId: { toString: () => contactoId }, rol: 'cliente' }],
           }] as any);
           const result = await service.getById('user1', contactoId);
           expect(result.expedientesVinculados).toEqual([
             { _id: expId, nombre: 'Caso X', rol: 'cliente' },
           ]);
           expect(expedientesRepo.findByContactoId).toHaveBeenCalledWith('user1', contactoId);
         });
         ```

    2. Actualizar `apps/backend/jest.config.ts`:
       ```typescript
       coverageThreshold: {
         global: { branches: 0, functions: 0, lines: 0, statements: 0 },
         './src/modules/contactos/': { branches: 70, functions: 80, lines: 80, statements: 80 },
         './src/modules/clausulas/': { branches: 70, functions: 80, lines: 80, statements: 80 },
         './src/modules/expedientes/': { branches: 70, functions: 80, lines: 80, statements: 80 },
       }
       ```

    3. Ejecutar `pnpm --filter @lexscribe/backend test --coverage` y verificar que todos los thresholds pasan.
  </action>
  <verify>
    <automated>pnpm --filter @lexscribe/backend test --coverage</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "CONT-05" apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts` retorna match (test nuevo)
    - `grep -n "expedientesRepo\\|ExpedientesRepository" apps/backend/src/modules/contactos/__tests__/contactos.service.spec.ts` retorna match
    - `grep -n "./src/modules/clausulas/" apps/backend/jest.config.ts` retorna match
    - `grep -n "./src/modules/expedientes/" apps/backend/jest.config.ts` retorna match
    - Comando `pnpm --filter @lexscribe/backend test --coverage` finaliza con exit 0 — Jest no falla por coverage threshold incumplido
    - Output del comando muestra ≥80% lines y functions en `apps/backend/src/modules/clausulas/` y `apps/backend/src/modules/expedientes/`
    - Comando `pnpm --filter @lexscribe/backend test:e2e` sigue verde (sin regresiones)
  </acceptance_criteria>
  <done>
    Coverage Phase 4 cumplido (≥80%); ContactosService re-testeado con expedientesRepo real (mockeado); `jest.config.ts` actualizado; toda la suite (unit + e2e) verde.
  </done>
</task>

</tasks>

<verification>
- `pnpm --filter @lexscribe/backend test --coverage` → coverage thresholds OK, 0 failed
- `pnpm --filter @lexscribe/backend test:e2e` → 0 failed
- `pnpm --filter @lexscribe/backend lint && pnpm --filter @lexscribe/backend build` → 0 errors
- `pnpm --filter @lexscribe/frontend test` → 0 failed (no regression)
</verification>

<success_criteria>
- Phase 4 Success Criteria #5 (estilo Phase 3) cumplido: ≥80% cobertura en módulos clausulas y expedientes
- Tests específicos verifican $text search, push/pull contactos, unicidad linkContacto, emisión eventos, placeholders detalle expediente
- CONT-05 testeado a nivel unit con ExpedientesRepository mockeado
- jest.config.ts actualizado con thresholds per-módulo
- Sin regresiones en tests existentes
</success_criteria>

<output>
Crear `.planning/phases/04-clausulas-y-expedientes/04-04-SUMMARY.md` con: número de tests añadidos por módulo, % cobertura final logrado, decisiones de mocking, link a output del coverage report.

Tras este plan, actualizar STATE.md marcando Phase 04 como COMPLETE y dejando "Next: Phase 05 — Plantillas y Editor".
</output>
