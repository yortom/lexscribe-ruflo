---
phase: 02-auth-y-bases-transversales
plan: 02
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - apps/backend/src/common/plugins/soft-delete.plugin.ts
  - apps/backend/src/common/errors/domain.error.ts
  - apps/backend/src/common/errors/not-found.error.ts
  - apps/backend/src/common/errors/conflict.error.ts
  - apps/backend/src/common/errors/validation.error.ts
  - apps/backend/src/common/errors/unauthorized.error.ts
  - apps/backend/src/common/errors/index.ts
  - apps/backend/src/common/filters/domain-exception.filter.ts
  - apps/backend/src/main.ts
  - apps/backend/src/modules/auth/auth.service.ts
  - apps/backend/test/common/soft-delete.plugin.spec.ts
  - apps/backend/test/common/domain-exception.filter.spec.ts
  - apps/backend/test/common/zod-validation.e2e-spec.ts
autonomous: true
requirements:
  - AUTH-06

must_haves:
  truths:
    - "Aplicar `softDeletePlugin` a un schema añade `activo` y `fechaInactivacion` y filtra `activo:false` por defecto en find/findOne/count/update"
    - "Pasando `query.setOptions({withInactive:true})` la query incluye los inactivos"
    - "`softDelete(filter)` marca `activo:false` y setea `fechaInactivacion` (no borra físicamente)"
    - "ZodValidationPipe global rechaza body con propiedades extra (`.strict()`) con HTTP 400"
    - "Lanzar un `DomainError` (NotFoundError/ConflictError/ValidationError/UnauthorizedError) desde un service produce HTTP del `httpStatus` con body `{code, message}` sin stack trace"
    - "AuthService usa `UnauthorizedError` en lugar de excepciones HTTP de NestJS"
  artifacts:
    - path: "apps/backend/src/common/plugins/soft-delete.plugin.ts"
      provides: "Mongoose plugin (function softDeletePlugin(schema))"
      exports: ["softDeletePlugin"]
      min_lines: 30
    - path: "apps/backend/src/common/errors/domain.error.ts"
      provides: "Clase abstracta DomainError + subclases tipadas"
      exports: ["DomainError", "NotFoundError", "ConflictError", "ValidationError", "UnauthorizedError"]
    - path: "apps/backend/src/common/filters/domain-exception.filter.ts"
      provides: "@Catch(DomainError) ExceptionFilter global"
      exports: ["DomainExceptionFilter"]
  key_links:
    - from: "apps/backend/src/main.ts"
      to: "ZodValidationPipe + DomainExceptionFilter"
      via: "useGlobalPipes + useGlobalFilters"
      pattern: "useGlobal(Pipes|Filters)"
    - from: "apps/backend/src/modules/auth/auth.service.ts"
      to: "UnauthorizedError"
      via: "throw new UnauthorizedError('Invalid credentials')"
      pattern: "throw new UnauthorizedError"
---

<objective>
Cementar las 3 bases transversales que toda colección/endpoint posterior asumirá como dadas:
1. **Soft-delete plugin Mongoose** (custom, ~40 líneas) con escape hatch `withInactive`.
2. **ZodValidationPipe global** (vía `nestjs-zod`) — `.strict()` en todos los DTOs.
3. **ExceptionFilter global** mapeando `DomainError` tipados → HTTP.

Purpose: Garantizar que las fases 3-7 no tengan que reinventar borrado lógico, validación ni traducción de errores. Cumple AUTH-06.
Output: Plugin testeado + filter global activo + AuthService reescrito sobre `UnauthorizedError` (en lugar de las excepciones genéricas que metimos en 02-01).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@docs/DATOS.md
@docs/ARQUITECTURA.md
@.planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md
@.planning/phases/02-auth-y-bases-transversales/02-01-SUMMARY.md
@apps/backend/src/main.ts
@apps/backend/src/modules/auth/auth.service.ts

<interfaces>
<!-- Contratos a respetar -->

DomainError base (este plan crea):
```typescript
export abstract class DomainError extends Error {
  abstract readonly code: string;       // 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'UNAUTHORIZED'
  abstract readonly httpStatus: number; // 404 | 409 | 400 | 401
}
```

Filter response shape (estable — fases siguientes lo asumen):
```json
{ "code": "NOT_FOUND", "message": "expediente abc not found" }
```
NO `stack` en producción. NO `usuarioId` ni datos sensibles.

Soft-delete plugin contract:
- Aplica `schema.add({activo: {type:Boolean, default:true, index:true}, fechaInactivacion: {type:Date, default:null}})`.
- Hook `pre` para: `find`, `findOne`, `findOneAndUpdate`, `count`, `countDocuments`, `updateOne`, `updateMany`.
- Si `query.getOptions().withInactive === true` → bypass.
- Si `query.getFilter().activo === undefined` → `this.where({activo: true})`.
- `schema.statics.softDelete(filter)` → `updateMany(filter, {$set:{activo:false, fechaInactivacion:new Date()}})`.
- NO se aplica globalmente (`mongoose.plugin`) — se aplica por schema.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Soft-delete plugin Mongoose + tests unitarios</name>
  <files>
    apps/backend/src/common/plugins/soft-delete.plugin.ts,
    apps/backend/test/common/soft-delete.plugin.spec.ts
  </files>
  <read_first>
    docs/DATOS.md §2.3 (soft-delete universal),
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 3 + §Pitfall 4),
    apps/backend/test/setup-e2e.ts (para reutilizar mongodb-memory-server)
  </read_first>
  <behavior>
    Sobre un schema `Foo({nombre: String})` con `softDeletePlugin` aplicado:
    - Test 1: schema añade `activo: Boolean = true` y `fechaInactivacion: Date | null`.
    - Test 2: `Foo.create({nombre:'a'})` luego `Foo.find()` devuelve 1 doc; tras `Foo.softDelete({nombre:'a'})`, `Foo.find()` devuelve 0.
    - Test 3: `Foo.find({}, null, {withInactive:true})` (o `Foo.find({}).setOptions({withInactive:true})`) devuelve el doc inactivo.
    - Test 4: `softDelete` setea `fechaInactivacion` a una `Date` no nula.
    - Test 5: `Foo.findOne({activo:false}).setOptions({withInactive:true})` encuentra el inactivo (filter explícito sobre `activo` no se sobrescribe).
    - Test 6: `Foo.countDocuments()` excluye inactivos por defecto.
  </behavior>
  <action>
    Implementar `softDeletePlugin(schema)` siguiendo §Pattern 3 RESEARCH literalmente. Detalle:
    - Hooks sobre operaciones: `find`, `findOne`, `findOneAndUpdate`, `count`, `countDocuments`, `updateOne`, `updateMany`. Usar `schema.pre(op, function() {...})` con cast `this: Query<any, any>`.
    - Si `this.getOptions().withInactive` → return (no filtrar).
    - Si `this.getFilter().activo === undefined` → `this.where({activo: true})`.
    - `schema.statics.softDelete = function (filter) { return this.updateMany(filter, {$set:{activo:false, fechaInactivacion:new Date()}}); };`.
    - Tests con `mongodb-memory-server` (require import en el test, no del global setup, porque este test corre como `*.spec.ts` no `e2e-spec.ts`). Iniciar Mongo en `beforeAll`, conectar mongoose, definir schema con plugin, ejecutar las 6 aserciones.
    - Mover el spec a `apps/backend/test/common/soft-delete.plugin.spec.ts` y asegurarse de que `jest.config.ts` (no e2e) lo recoge: si por defecto Jest busca `*.spec.ts` en `src/**`, ajustar `testRegex` o roots a incluir `test/`. Verificar.
  </action>
  <verify>
    <automated>pnpm --filter backend test -- soft-delete.plugin</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/backend/src/common/plugins/soft-delete.plugin.ts` exits 0.
    - `grep -q "fechaInactivacion" apps/backend/src/common/plugins/soft-delete.plugin.ts` exits 0.
    - `grep -q "withInactive" apps/backend/src/common/plugins/soft-delete.plugin.ts` exits 0.
    - `grep -q "softDelete" apps/backend/src/common/plugins/soft-delete.plugin.ts` exits 0.
    - `pnpm --filter backend test -- soft-delete.plugin` shows 6+ passing assertions, 0 failing.
    - File length < 80 lines (`wc -l < apps/backend/src/common/plugins/soft-delete.plugin.ts` returns < 80).
  </acceptance_criteria>
  <done>
    Plugin operativo y unit-tested. Listo para que fase 3+ lo aplique a `expedientes`, `contactos`, etc.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: DomainError tipados + DomainExceptionFilter global + ZodValidationPipe global + refactor AuthService</name>
  <files>
    apps/backend/src/common/errors/domain.error.ts,
    apps/backend/src/common/errors/not-found.error.ts,
    apps/backend/src/common/errors/conflict.error.ts,
    apps/backend/src/common/errors/validation.error.ts,
    apps/backend/src/common/errors/unauthorized.error.ts,
    apps/backend/src/common/errors/index.ts,
    apps/backend/src/common/filters/domain-exception.filter.ts,
    apps/backend/src/main.ts,
    apps/backend/src/modules/auth/auth.service.ts,
    apps/backend/test/common/domain-exception.filter.spec.ts,
    apps/backend/test/common/zod-validation.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 4 + §Pattern 5),
    docs/ARQUITECTURA.md §5.3 + §14 (idioma API),
    apps/backend/src/main.ts,
    apps/backend/src/modules/auth/auth.service.ts (para refactor)
  </read_first>
  <behavior>
    - Filter test (unit con HttpAdapterHost mock o e2e ligero):
      · Endpoint test que `throw new NotFoundError('expediente', 'abc123')` → response 404 + body `{code:'NOT_FOUND', message:'expediente abc123 not found'}`.
      · `throw new ConflictError('foo')` → 409 + `code:'CONFLICT'`.
      · `throw new ValidationError('bar')` → 400 + `code:'VALIDATION'`.
      · `throw new UnauthorizedError('Invalid credentials')` → 401 + `code:'UNAUTHORIZED'`.
      · Body NO contiene `stack` ni propiedades extras.
    - Zod e2e:
      · POST `/api/v1/auth/login` con body `{email:'x@x.com', password:'P@ss12345', extraField:'haxx'}` → 400 (Zod `.strict()` rechaza).
      · POST con `{email:'invalid'}` → 400 con detalle de validación.
    - Auth refactor:
      · `pnpm --filter backend test:e2e -- auth` sigue verde tras cambiar las excepciones a `UnauthorizedError`.
  </behavior>
  <action>
    1) `common/errors/domain.error.ts`:
       ```ts
       export abstract class DomainError extends Error {
         abstract readonly code: string;
         abstract readonly httpStatus: number;
       }
       ```
    2) Crear las 4 subclases en archivos separados:
       - `not-found.error.ts`: `code='NOT_FOUND'`, `httpStatus=404`. Constructor `(resource: string, id: string)` → `super(\`${resource} ${id} not found\`)`. Exporta `resource`, `id` como readonly.
       - `conflict.error.ts`: `code='CONFLICT'`, `httpStatus=409`. Constructor `(message: string)`.
       - `validation.error.ts`: `code='VALIDATION'`, `httpStatus=400`. Constructor `(message: string, public readonly details?: unknown)`.
       - `unauthorized.error.ts`: `code='UNAUTHORIZED'`, `httpStatus=401`. Constructor `(message: string = 'Unauthorized')`.
    3) `common/errors/index.ts` re-exporta todas.
    4) `common/filters/domain-exception.filter.ts`:
       ```ts
       @Catch(DomainError)
       export class DomainExceptionFilter implements ExceptionFilter {
         catch(ex: DomainError, host: ArgumentsHost) {
           const res = host.switchToHttp().getResponse();
           res.status(ex.httpStatus).json({ code: ex.code, message: ex.message });
         }
       }
       ```
       Nota: NO incluir `details` por defecto (filtrar PII). Si `ex instanceof ValidationError` y `ex.details` existe, incluir `details` solo si `process.env.NODE_ENV !== 'production'`.
    5) `main.ts`: registrar globales:
       ```ts
       import { ZodValidationPipe } from 'nestjs-zod';
       app.useGlobalPipes(new ZodValidationPipe());
       app.useGlobalFilters(new DomainExceptionFilter());
       ```
       Verificar orden: `cookieParser` → `setGlobalPrefix('api/v1')` → `useGlobalPipes` → `useGlobalFilters` → `listen`.
    6) Refactor `auth/auth.service.ts`: sustituir cualquier `throw new UnauthorizedException(...)` (Nest) por `throw new UnauthorizedError(...)` del módulo de errores. Verificar que las suites e2e de Plan 02-01 siguen pasando (el body cambia de `{statusCode, message}` a `{code, message}` — actualizar las aserciones de los e2e para que esperen `{code:'UNAUTHORIZED'}`).
    7) `test/common/domain-exception.filter.spec.ts` (unit): construir un `Test.createTestingModule` con un controller dummy que tira las 4 excepciones, montar la app con el filter, hacer 4 supertest requests, asertar status + body.
    8) `test/common/zod-validation.e2e-spec.ts`: usa la app full montada, hace login con body `extraField` y body con email inválido, asserta 400.
    9) Documentar en `apps/backend/src/common/errors/index.ts` un comentario JSDoc 1 línea por cada error con su HTTP code, para fases siguientes.
  </action>
  <verify>
    <automated>pnpm --filter backend test -- domain-exception &amp;&amp; pnpm --filter backend test:e2e -- auth zod-validation</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "abstract class DomainError" apps/backend/src/common/errors/domain.error.ts` exits 0.
    - `grep -q "@Catch(DomainError)" apps/backend/src/common/filters/domain-exception.filter.ts` exits 0.
    - `grep -q "ZodValidationPipe" apps/backend/src/main.ts` exits 0.
    - `grep -q "DomainExceptionFilter" apps/backend/src/main.ts` exits 0.
    - `grep -q "UnauthorizedError" apps/backend/src/modules/auth/auth.service.ts` exits 0.
    - `grep -RIn "UnauthorizedException" apps/backend/src/modules/auth/` returns NO matches (refactor completo).
    - `pnpm --filter backend test:e2e` (full backend e2e) all green.
    - Body shape de un error: capturado en test contiene EXACTAMENTE keys `code` y `message`, sin `stack` ni `statusCode`.
  </acceptance_criteria>
  <done>
    Pipe + Filter globales activos. Errores tipados en uso. AuthService refactorizado. Cualquier nuevo módulo solo necesita `throw new NotFoundError(...)` para producir HTTP correcto.
  </done>
</task>

</tasks>

<verification>
1. `pnpm --filter backend test && pnpm --filter backend test:e2e` — todo en verde.
2. `grep -RIn "HttpException\|UnauthorizedException\|NotFoundException" apps/backend/src/modules/` debería estar vacío (todo el dominio usa DomainError).
3. Lint + type-check verdes.
</verification>

<success_criteria>
- AUTH-06: plugin disponible (no aplicado aún a colecciones de negocio — fases 3+ lo aplicarán).
- ZodValidationPipe global activo y `.strict()` rechaza props extra en `LoginDto`.
- DomainExceptionFilter global activo; AuthService usa errores tipados.
- Suite backend completa verde (`test` + `test:e2e`).
</success_criteria>

<output>
After completion, create `.planning/phases/02-auth-y-bases-transversales/02-02-SUMMARY.md`.
</output>
