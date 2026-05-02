---
phase: 02-auth-y-bases-transversales
plan: 03
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - apps/backend/package.json
  - pnpm-lock.yaml
  - apps/backend/src/modules/auditoria/auditoria.module.ts
  - apps/backend/src/modules/auditoria/auditoria.service.ts
  - apps/backend/src/modules/auditoria/auditoria.repository.ts
  - apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts
  - apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts
  - apps/backend/src/modules/auditoria/decorators/audited.decorator.ts
  - apps/backend/src/modules/auditoria/listeners/audit.listener.ts
  - apps/backend/src/modules/auditoria/types.ts
  - apps/backend/src/app.module.ts
  - apps/backend/src/modules/auth/auth.service.ts
  - apps/backend/test/auditoria/interceptor.spec.ts
  - apps/backend/test/auditoria/events.e2e-spec.ts
  - apps/backend/test/auditoria/auth-events.e2e-spec.ts
autonomous: true
requirements:
  - AUTH-07

must_haves:
  truths:
    - "Crear/editar/borrar un recurso decorado con `@Audited('expediente')` produce un registro en `auditoria` con `accion`, `recurso`, `recursoId`, `usuarioId`, `timestamp`"
    - "Update produce un registro con `cambios` (diff before/after) calculado con `deep-object-diff`"
    - "`eventEmitter.emit('resource.linked'|'unlinked'|'generated', payload)` produce registro vía listener"
    - "Login y logout emiten eventos `auth.login` / `auth.logout` y se persisten en `auditoria`"
    - "Auditoría es asíncrona (no bloquea el response) y la colección NO tiene `activo`/`fechaInactivacion` (inmutable)"
  artifacts:
    - path: "apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts"
      provides: "Mongoose schema (sin soft-delete)"
      contains: "accion"
    - path: "apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts"
      provides: "AuditInterceptor (NestInterceptor) reading @Audited metadata"
      exports: ["AuditInterceptor"]
    - path: "apps/backend/src/modules/auditoria/decorators/audited.decorator.ts"
      provides: "@Audited(recurso, accion, options) decorator"
      exports: ["Audited", "AUDIT_KEY"]
    - path: "apps/backend/src/modules/auditoria/listeners/audit.listener.ts"
      provides: "@OnEvent listeners para link/unlink/generate/login/logout"
  key_links:
    - from: "apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts"
      to: "auditoria.service.writeAsync"
      via: "tap(result => writeAsync(...))"
      pattern: "writeAsync"
    - from: "apps/backend/src/modules/auth/auth.service.ts"
      to: "EventEmitter2.emit('auth.login'|'auth.logout')"
      via: "this.eventEmitter.emit(...)"
      pattern: "eventEmitter\\.emit\\('auth\\."
    - from: "apps/backend/src/modules/auditoria/listeners/audit.listener.ts"
      to: "auditoria.service.writeAsync"
      via: "@OnEvent('*.linked'|'*.unlinked'|'*.generated'|'auth.*')"
      pattern: "@OnEvent"
---

<objective>
Implementar el sistema de auditoría híbrido (interceptor para CRUD + EventEmitter para acciones de negocio + emisión directa para auth) según §Pattern 6 RESEARCH. Cumple AUTH-07.

Purpose: Toda operación significativa queda registrada en `auditoria` (inmutable) sin bloquear el response. Sienta el contrato que las fases 3-7 usarán mediante un único decorador `@Audited()`.
Output: Módulo `auditoria` operativo, decorador disponible, listeners conectados, AuthService emite login/logout, suites integración + e2e en verde.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@docs/ARQUITECTURA.md
@docs/DATOS.md
@.planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md
@.planning/phases/02-auth-y-bases-transversales/02-01-SUMMARY.md
@apps/backend/src/modules/auth/auth.service.ts
@apps/backend/src/app.module.ts

<interfaces>
<!-- Contratos -->

AuditMeta (decorator metadata):
```typescript
export type AuditAccion = 'create' | 'update' | 'delete' | 'link' | 'unlink' | 'generate' | 'login' | 'logout';
export interface AuditMeta {
  recurso: string;          // 'expediente', 'contacto', 'usuario', ...
  accion: AuditAccion;
  // Si update: cómo extraer "before" (necesario para diff). Si no se da, cambios = null.
  diffBefore?: (req: any) => unknown;
}
export const AUDIT_KEY = 'audit:meta';
```

Decorator usage:
```typescript
@Audited('expediente', 'create')
create(@Body() dto, @CurrentUser('id') uid) { ... }

@Audited('expediente', 'update', { diffBefore: req => req.body.__before })
update(...) { ... }
```

Auditoria record (Mongoose):
```typescript
{
  _id, usuarioId: ObjectId | null,
  accion: AuditAccion,
  recurso: string,
  recursoId: ObjectId | null,
  cambios: object | null,           // deep-object-diff result o null
  contexto: object | null,
  ip: string | null,
  userAgent: string | null,
  timestamp: Date,
}
```
**SIN** `activo`/`fechaInactivacion`. **NO** aplicar `softDeletePlugin`.
Índices: `{recurso:1, recursoId:1, timestamp:-1}`, `{usuarioId:1, timestamp:-1}`, `{timestamp:-1}`.

Service:
```typescript
class AuditoriaService {
  writeAsync(record: Omit<AuditoriaRecord,'_id'|'timestamp'> & {timestamp?: Date}): void;
  // Internamente: setImmediate(() => repo.create({...record, timestamp: record.timestamp ?? new Date()}).catch(logErr));
}
```

EventEmitter eventos a escuchar (wildcards de eventemitter2):
- `*.linked` → `accion='link'`
- `*.unlinked` → `accion='unlink'`
- `*.generated` → `accion='generate'`
- `auth.login` / `auth.logout` → `accion='login'|'logout'`

Convención de nombre: `<recurso>.<verbo_pasado>`. Ej: `expediente.contacto.linked` (recurso = `expediente`, contexto incluye `{contactoId, rol}`). El listener parsea o el payload lleva `{recurso, recursoId}` explícitos — usar la opción explícita para no ser frágil.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Schema auditoria + service + módulo + integración con AppModule</name>
  <files>
    apps/backend/package.json,
    pnpm-lock.yaml,
    apps/backend/src/modules/auditoria/auditoria.module.ts,
    apps/backend/src/modules/auditoria/auditoria.service.ts,
    apps/backend/src/modules/auditoria/auditoria.repository.ts,
    apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts,
    apps/backend/src/modules/auditoria/types.ts,
    apps/backend/src/app.module.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 6 + §Standard Stack auditoría),
    docs/ARQUITECTURA.md §18 (auditoría),
    docs/DATOS.md §3 (colección `auditoria`),
    apps/backend/src/app.module.ts
  </read_first>
  <action>
    1) Instalar deps: `pnpm --filter backend add @nestjs/event-emitter@^3.1.0 deep-object-diff@^1.1.9`. Regenerar lock.
    2) `auditoria/types.ts`:
       ```ts
       export type AuditAccion = 'create'|'update'|'delete'|'link'|'unlink'|'generate'|'login'|'logout';
       export interface AuditoriaRecord {
         usuarioId: string | null;
         accion: AuditAccion;
         recurso: string;
         recursoId: string | null;
         cambios: unknown | null;
         contexto: unknown | null;
         ip: string | null;
         userAgent: string | null;
         timestamp: Date;
       }
       ```
    3) `auditoria/schemas/auditoria.schema.ts`:
       Mongoose `@Schema({collection:'auditoria', timestamps:false, strict:true})` con campos del contrato. NO aplicar `softDeletePlugin`.
       ```ts
       AuditoriaSchema.index({ recurso: 1, recursoId: 1, timestamp: -1 });
       AuditoriaSchema.index({ usuarioId: 1, timestamp: -1 });
       AuditoriaSchema.index({ timestamp: -1 });
       ```
    4) `auditoria/auditoria.repository.ts`: método único `create(record: AuditoriaRecord)` → `model.create(record)`.
    5) `auditoria/auditoria.service.ts`:
       ```ts
       @Injectable()
       export class AuditoriaService {
         constructor(private readonly repo: AuditoriaRepository, private readonly logger: Logger) {}
         writeAsync(record: Omit<AuditoriaRecord, 'timestamp'> & { timestamp?: Date }): void {
           const final = { ...record, timestamp: record.timestamp ?? new Date() };
           setImmediate(() => {
             this.repo.create(final).catch(err => this.logger.error({ err, record: final }, 'auditoria.write.failed'));
           });
         }
       }
       ```
    6) `auditoria/auditoria.module.ts`: registra MongooseModule.forFeature, exporta `AuditoriaService` (el interceptor y listener lo consumen).
    7) `app.module.ts`:
       - Importar `EventEmitterModule.forRoot({wildcard: true, delimiter: '.'})` (wildcard true para `*.linked`).
       - Importar `AuditoriaModule`.
       - Asegurar que `MongooseModule.forRootAsync` (ya añadido en 02-01) está antes que `AuditoriaModule`.
  </action>
  <verify>
    <automated>pnpm --filter backend build &amp;&amp; pnpm --filter backend test</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "deep-object-diff" apps/backend/package.json` exits 0.
    - `grep -q "@nestjs/event-emitter" apps/backend/package.json` exits 0.
    - `grep -q "EventEmitterModule" apps/backend/src/app.module.ts` exits 0.
    - `grep -q "wildcard: true" apps/backend/src/app.module.ts` exits 0.
    - `grep -q "setImmediate" apps/backend/src/modules/auditoria/auditoria.service.ts` exits 0.
    - `grep -RIn "softDeletePlugin" apps/backend/src/modules/auditoria/schemas/` returns NO matches.
    - `grep -q "recurso.*recursoId.*timestamp" apps/backend/src/modules/auditoria/schemas/auditoria.schema.ts` matches the index definition (use `-E`).
    - Build green.
  </acceptance_criteria>
  <done>
    Módulo `auditoria` registrado, schema con índices, `AuditoriaService.writeAsync` operativo y no-bloqueante. EventEmitter wildcard activo.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: AuditInterceptor + @Audited decorator + AuditListener + auth events + tests</name>
  <files>
    apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts,
    apps/backend/src/modules/auditoria/decorators/audited.decorator.ts,
    apps/backend/src/modules/auditoria/listeners/audit.listener.ts,
    apps/backend/src/modules/auth/auth.service.ts,
    apps/backend/src/modules/auditoria/auditoria.module.ts,
    apps/backend/test/auditoria/interceptor.spec.ts,
    apps/backend/test/auditoria/events.e2e-spec.ts,
    apps/backend/test/auditoria/auth-events.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 6 + §Code Examples 2 + §Pitfall 3),
    apps/backend/src/modules/auth/auth.service.ts,
    apps/backend/src/modules/auditoria/auditoria.service.ts (creado en Task 1)
  </read_first>
  <behavior>
    - Interceptor unit/integration:
      · Controller dummy con `@UseInterceptors(AuditInterceptor) @Audited('foo','create') create()` que devuelve `{_id:'abc'}` → tras la respuesta hay (eventually) un registro `auditoria` con `accion='create', recurso='foo', recursoId='abc'`.
      · Update con `@Audited('foo','update',{diffBefore: req => req.body.__before})` → `cambios` es objeto deep-diff comparando `req.body.__before` vs response.
      · Si la handler lanza error → NO se escribe auditoría (porque va en `tap()` post-success).
    - Events e2e:
      · `eventEmitter.emit('expediente.linked', {usuarioId, recursoId, contexto:{contactoId, rol}})` → tras `setImmediate` hay registro `accion='link', recurso='expediente'`.
      · `*.unlinked` y `*.generated` análogos.
    - Auth events e2e:
      · POST `/auth/login` válido → registro con `accion='login', usuarioId, ip, userAgent`.
      · POST `/auth/logout` → registro con `accion='logout'`.
  </behavior>
  <action>
    1) `decorators/audited.decorator.ts`:
       ```ts
       export const AUDIT_KEY = 'audit:meta';
       export interface AuditMeta {
         recurso: string; accion: AuditAccion;
         diffBefore?: (req: any) => unknown;
         contexto?: (req: any, result: any) => unknown;
       }
       export const Audited = (recurso: string, accion: AuditAccion, opts: Partial<AuditMeta> = {}) =>
         SetMetadata(AUDIT_KEY, { recurso, accion, ...opts });
       ```
    2) `interceptors/audit.interceptor.ts` siguiendo §Code Examples 2:
       - Inyectar `Reflector` y `AuditoriaService`.
       - Leer meta con `reflector.get<AuditMeta>(AUDIT_KEY, ctx.getHandler())`.
       - Si no hay meta → `next.handle()` directo.
       - `next.handle().pipe(tap(result => { /* writeAsync */ }))`.
       - En el `tap`, calcular `cambios`:
         · Si `accion === 'update'` Y `meta.diffBefore` definido → `cambios = diff(meta.diffBefore(req), result)` con `import { diff } from 'deep-object-diff';`.
         · Resto → `cambios = null`.
       - `recursoId = result?._id?.toString?.() ?? result?.id ?? null`.
       - `usuarioId = req.user?.id ?? null` (puede ser null si endpoint público — improbable pero seguro).
       - `contexto = meta.contexto?.(req, result) ?? null`.
       - Llamar `this.auditoria.writeAsync({usuarioId, accion: meta.accion, recurso: meta.recurso, recursoId, cambios, contexto, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null})`.
    3) `listeners/audit.listener.ts`:
       ```ts
       @Injectable()
       export class AuditListener {
         constructor(private readonly auditoria: AuditoriaService) {}
         @OnEvent('*.linked', { async: true })
         onLinked(payload: { usuarioId, recurso, recursoId, contexto, ip?, userAgent? }) {
           this.auditoria.writeAsync({ ...payload, accion: 'link', cambios: null, ip: payload.ip ?? null, userAgent: payload.userAgent ?? null });
         }
         @OnEvent('*.unlinked', { async: true }) onUnlinked(p) { /* accion: 'unlink' */ }
         @OnEvent('*.generated', { async: true }) onGenerated(p) { /* accion: 'generate' */ }
         @OnEvent('auth.login', { async: true }) onLogin(p) { /* accion: 'login', recurso: 'usuario', recursoId: usuarioId */ }
         @OnEvent('auth.logout', { async: true }) onLogout(p) { /* accion: 'logout', recurso: 'usuario' */ }
       }
       ```
       Convención del payload: estandarizada en este listener. Quien emita debe seguirla — documentar en JSDoc del listener.
    4) Registrar `AuditListener` como provider en `auditoria.module.ts`.
    5) Refactor `auth/auth.service.ts`:
       - **Modificar el constructor de `AuthService`** (creado en 02-01) **para inyectar** `private readonly eventEmitter: EventEmitter2` (de `@nestjs/event-emitter`) y emitir `auth.login` / `auth.logout` desde los métodos `login()` y `logout()`.
       - En `login(...)` tras éxito: `this.eventEmitter.emit('auth.login', {usuarioId: user._id.toString(), recurso: 'usuario', recursoId: user._id.toString(), contexto: null, ip, userAgent})`.
       - En `logout(...)` tras éxito: `this.eventEmitter.emit('auth.logout', {usuarioId, recurso: 'usuario', recursoId: usuarioId, contexto: null, ip, userAgent})`.
       - Pasar `ip` y `userAgent` desde el controller (extender la firma del método si fuera necesario; actualizar el controller para pasar `req.ip`, `req.headers['user-agent']`).
       - NO emitir en refresh (decisión: solo login/logout cuentan como eventos auditables explícitos — refresh es operacional).
    6) Tests:
       - `test/auditoria/interceptor.spec.ts`: usa `Test.createTestingModule` con un controller dummy decorado, mongo memory server, dispara request, hace `await new Promise(r=>setImmediate(r))` para que `setImmediate` complete, luego asserta `await AuditoriaModel.find()` length === 1 con campos correctos. Caso update: incluye `__before` en body, asserta `cambios` no nulo y contiene la clave modificada.
       - `test/auditoria/events.e2e-spec.ts`: emite los 3 eventos directamente vía `app.get(EventEmitter2).emit(...)`, espera `setImmediate`, asserta registros.
       - `test/auditoria/auth-events.e2e-spec.ts`: hace login y logout vía supertest, espera, asserta 2 registros.
  </action>
  <verify>
    <automated>pnpm --filter backend test -- auditoria.interceptor &amp;&amp; pnpm --filter backend test:e2e -- auditoria</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "AUDIT_KEY" apps/backend/src/modules/auditoria/decorators/audited.decorator.ts` exits 0.
    - `grep -q "tap(" apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts` exits 0.
    - `grep -q "deep-object-diff" apps/backend/src/modules/auditoria/interceptors/audit.interceptor.ts` exits 0.
    - `grep -q "@OnEvent" apps/backend/src/modules/auditoria/listeners/audit.listener.ts` exits 0 with at least 5 matches.
    - `grep -q "eventEmitter: EventEmitter2" apps/backend/src/modules/auth/auth.service.ts` exits 0 (inyección explícita en el constructor).
    - `grep -q "auth.login" apps/backend/src/modules/auth/auth.service.ts` exits 0.
    - `grep -q "auth.logout" apps/backend/src/modules/auth/auth.service.ts` exits 0.
    - All 3 audit test files pass.
    - Negative: handler que lanza no escribe auditoría (test asserta `await AuditoriaModel.find()` length === 0 tras error).
  </acceptance_criteria>
  <done>
    AUTH-07 cumplido. Interceptor + listener + auth events operativos. Cualquier nuevo módulo solo añade `@Audited(...)` a sus métodos repository/service y emite eventos para link/unlink/generate.
  </done>
</task>

</tasks>

<verification>
1. `pnpm --filter backend test && pnpm --filter backend test:e2e` — todo verde.
2. Login → grep en `auditoria` collection muestra `{accion:'login'}`.
3. Logout → grep muestra `{accion:'logout'}` distinto del login.
4. Documentar en SUMMARY el contrato del payload de eventos (`{usuarioId, recurso, recursoId, contexto, ip, userAgent}`) para que las fases siguientes lo sigan.
</verification>

<success_criteria>
- AUTH-07: create/update/delete/link/unlink/generate/login/logout producen registros en `auditoria`.
- Auditoría es asíncrona, inmutable, sin soft-delete.
- Suite backend completa verde.
</success_criteria>

<output>
After completion, create `.planning/phases/02-auth-y-bases-transversales/02-03-SUMMARY.md`.
</output>
