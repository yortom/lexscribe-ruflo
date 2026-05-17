# Phase 2: Auth y bases transversales — Research

**Researched:** 2026-04-27
**Domain:** NestJS auth (JWT + refresh rotativo), Mongoose soft-delete, validación Zod, auditoría event-driven, esquema dinámico, backup rclone
**Confidence:** HIGH (stack decisions ya cerradas en `docs/`); MEDIUM en algunas decisiones operativas (almacén refresh tokens, granularidad audit interceptor) — recomendación con default sólido al final.

## Summary

La fase 2 es la primera fase con dominio. Construye el "raíl" sobre el que rodarán las fases 3–8: módulo `auth`, primer modelo Mongoose persistido (`usuarios`), y los 4 mecanismos transversales que **toda colección de negocio futura asumirá como dados** (soft-delete, validación, errores tipados, auditoría). También cierra `INF-06` (backup automatizado) que quedó pendiente de la fase 1.

Los 3 documentos fuente de verdad ya tienen cerradas las decisiones macro: `docs/ARQUITECTURA.md §9` fija JWT 15 min + refresh 7 d en cookie HttpOnly con rotación; §17.3 fija AES-256-GCM (post-MVP, fase 8); §18 fija auditoría con interceptor + event-driven; §16 fija seed idempotente. `docs/DATOS.md §2.3` fija soft-delete universal (`activo`/`fechaInactivacion`) con excepción documentos↔eventos. La investigación, por tanto, no abre alternativas a esas decisiones — las **traduce a librerías y patrones concretos**.

**Primary recommendation:** Pasar a NestJS 11 **antes** de añadir el ecosistema auth (todos los paquetes auxiliares vivos están en v11), ó bien anclar todo el stack auth a versiones v10 LTS (existen y están soportadas). Recomendación firme: actualizar a NestJS 11 en el primer plan (02-01) — es trivial, evita pinning de 4 paquetes secundarios y deja la base saneada para 6 fases más. En cuanto a librerías: Passport + `@nestjs/jwt` (no custom), `argon2` (no bcrypt), Mongoose plugin de soft-delete propio (NO `mongoose-delete` — ver §Don't Hand-Roll), `nestjs-zod` (no pipe custom), `@nestjs/event-emitter` para audit, rclone con cron en host NAS (no en contenedor).

## User Constraints (from CONTEXT.md)

> No existe `02-CONTEXT.md`. La fase se lanza directa desde `/gsd:plan-phase` sin sesión de discusión previa. Las "decisiones del usuario" provienen, por delegación, de los 3 documentos fuente de verdad (`docs/FUNCIONAL.md`, `docs/DATOS.md`, `docs/ARQUITECTURA.md`).

### Locked Decisions (de los docs — equivalentes a decisiones de usuario)

Estos puntos están **cerrados** y la planificación NO debe abrir alternativas:

- **JWT access 15 min + refresh 7 d con rotación** (Arquitectura §9.1, AUTH-01/02).
- **Refresh en cookie `httpOnly` `secure` `sameSite=strict`** (Arquitectura §9.1).
- **Logout invalida refresh server-side** (Arquitectura §9.1, AUTH-03).
- **`usuarioId` se inyecta vía guard, NUNCA del body** (Arquitectura §9.2, AUTH-04). Decorador `@CurrentUser()`.
- **Idioma de la API: inglés**; UI traduce al español (Arquitectura §14).
- **Soft-delete universal** vía middleware Mongoose (`activo: Boolean`, `fechaInactivacion`). Queries por defecto excluyen `activo: false`. Endpoint admite `?incluirInactivos=true` (Datos §2.3, Arquitectura §6.1).
- **Validación a nivel aplicación** (no MongoDB JSON Schema — Datos §2 conv. 7), con Zod compartido en `packages/shared-validation`.
- **Errores de dominio = clases tipadas** (`ExpedienteNotFoundError`, `RolDuplicadoError`…) traducidas a HTTP por un `ExceptionFilter` global (Arquitectura §5.3).
- **Auditoría asíncrona, inmutable**, sin `activo`/`fechaInactivacion`. Captura: interceptor para create/update/delete; event-driven (NestJS `EventEmitter`) para link/unlink/generate; módulo auth para login/logout (Arquitectura §18).
- **Seed idempotente** crea 1 usuario (credenciales en `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` env) + entradas `esquemas` vacías para `expediente` y `contacto`. Reintentar el script no duplica nada (Arquitectura §16, AUTH-05).
- **`esquemas` ÚNICO por `tipoObjeto` + `usuarioId`** (Datos §4.8). Endpoint `/api/v1/esquemas/:tipoObjeto` GET/POST/DELETE (Arquitectura §6.2). Borrar/renombrar parámetro NO entra en MVP (post-MVP F-095).
- **MongoDB 8.x, Node 22 LTS, pnpm 9** (Arquitectura §15).
- **Backup diario MinIO + Mongo a Google Drive vía rclone**, retención 30 d en Drive + 7 d local. Cron en NAS (Arquitectura §8.2, INF-06).
- **API base URL `/api/v1/...`** (Arquitectura §6.1).

### Claude's Discretion

Áreas donde planner puede recomendar default sin abrir debate (ver justificación en cada sección):

- **Hashing de password:** argon2 vs bcrypt → recomendación argon2 (§Standard Stack).
- **Almacén del refresh token (server-side):** colección Mongo `refresh_tokens` vs documento embebido en `usuarios.refreshTokens[]` vs Redis → recomendación: documento embebido en `usuarios` (sin Redis, evita nuevo servicio en el compose, AUTH-02/03 cumplible).
- **Plugin Mongoose soft-delete:** `mongoose-delete` (npm) vs plugin propio → recomendación: plugin propio ~40 líneas (ver §Don't Hand-Roll razón).
- **Diff para `auditoria.cambios`:** `deep-object-diff` vs implementación propia → recomendación: usar `deep-object-diff` (~3 KB).
- **CSRF protection:** cookie SameSite=strict + endpoint `/auth/refresh` solo POST → suficiente para MVP intranet; **no añadir `csurf`** (deprecado desde 2022, no necesario con SameSite=strict + sin terceros).
- **NestJS 10 → 11 upgrade:** sí, en plan 02-01 antes de instalar auth. Coste: bajo, beneficio: paquetes secundarios viven en v11.

### Deferred Ideas (OUT OF SCOPE)

NO investigar ni planear nada de lo siguiente — pertenecen a fases futuras:

- Cifrado AES-256-GCM de PII (`documentacionFiscal`, `documentoIdentidad`) → fase 8, SEC-01/02.
- Multi-usuario, roles, permisos. La columna `usuarioId` se persiste pero no hay control de pertenencia entre usuarios (mono-usuario MVP).
- Renombrar/eliminar parámetros del esquema dinámico (F-095) — solo `GET`, `POST` (`$addToSet`) en MVP. `DELETE` puede aparecer en endpoint pero NO ejecuta migración (post-MVP).
- Tipos de dato `numero`/`fecha`/`booleano` en parámetros del esquema (F-093) son P1, default `texto`. Validar el tipo declarado en `esquemas` está en MVP, **propagar el tipo a validación de instancias** queda para fases que tocan los recursos (3 contactos, 4 expedientes).
- Vista global de auditoría en frontend (Arquitectura §18.4) — post-MVP.
- Sentry, métricas Prometheus — fase 8.
- Cifrado de volumen NAS (capa 1) — operacional, fuera del código.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-06 | Backup diario de MinIO y Mongo a Google Drive vía rclone | §Standard Stack (rclone), §Architecture Patterns (Backup), §Common Pitfalls (rclone tokens), plan 02-04 |
| AUTH-01 | Login email/password → JWT 15 min + refresh cookie 7 d | §Standard Stack (Passport + @nestjs/jwt + argon2), §Architecture Patterns (Auth flow), plan 02-01 |
| AUTH-02 | Rotación de refresh — usar invalida y emite uno nuevo | §Architecture Patterns (Refresh rotation), §Common Pitfalls (race conditions), plan 02-01 |
| AUTH-03 | Logout invalida el refresh en servidor | §Architecture Patterns (Refresh storage), plan 02-01 |
| AUTH-04 | `usuarioId` se inyecta del JWT, nunca del body | §Architecture Patterns (`@CurrentUser` decorator + guard), plan 02-01 |
| AUTH-05 | `pnpm seed` idempotente: usuario + esquemas vacíos | §Architecture Patterns (Seed pattern + upsert), plan 02-04 |
| AUTH-06 | Soft-delete vía middleware Mongoose (queries excluyen `activo:false`) | §Architecture Patterns (Soft-delete plugin), §Don't Hand-Roll, plan 02-02 |
| AUTH-07 | `auditoria` registra create/update/delete/link/unlink/generate/login/logout | §Architecture Patterns (Audit interceptor + EventEmitter), plan 02-03 |
| AUTH-08 | Módulo `esquemas` con CRUD por `tipoObjeto` (`expediente`, `contacto`) | §Architecture Patterns (Esquemas module), plan 02-04 |

## Standard Stack

### Core (auth)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/jwt` | `^11.0.2` (o `^10.2.0` si se mantiene Nest 10) | Firmar/verificar JWT (HS256) | Wrapper oficial NestJS sobre `jsonwebtoken`. Cero lock-in, integra con DI. |
| `@nestjs/passport` | `^11.0.5` (o `^10.0.3`) | Bridge entre Passport.js y NestJS guards | Estándar comunidad. La decisión "Passport.js" ya está cerrada en Arquitectura §2. |
| `passport` | `^0.7.0` | Núcleo Passport | Peer requerido. Estable, sin churn. |
| `passport-jwt` | `^4.0.1` | Strategy JWT (Bearer header) | Estándar. Extrae token de `Authorization: Bearer ...`. |
| `argon2` | `^0.44.0` | Hash de password | OWASP recomienda argon2id como primera opción para passwords nuevos (HIGH, fuente: OWASP Password Storage Cheat Sheet). Resistencia GPU/ASIC superior a bcrypt; node-bindings nativos sobre `libsodium`. **Alternativa:** `bcrypt@^6.0.0` si la imagen Docker no puede compilar nativos — pero la imagen `node:22-alpine` ya construye argon2 sin problema (verificado por compilación con `apk add --no-cache python3 make g++` en build stage). Coste de hash configurable; preset OWASP `m=19456, t=2, p=1`. |

### Core (validación + errores)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nestjs-zod` | `^4.3.1` | `ZodValidationPipe` global + decoradores `@ZodSerializerDto` | Soporta NestJS 10 y 11 (peer `^10.0.0 \|\| ^11.0.0`). Reusa los Zod schemas de `packages/shared-validation`. Alternativa custom (~40 líneas) viable si se quiere evitar dependencia, pero `nestjs-zod` da bonus: filtro de excepciones tipado, generador OpenAPI. |
| `zod` | ya en monorepo (`packages/shared-validation`) | Validación isomórfica | Decisión cerrada (Arquitectura §2). |

### Core (datos + audit)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mongoose` | `^9.5.0` | ODM | Decisión cerrada. Mongoose 9 es la línea actual; mantenida y compatible con Mongo 8.x. |
| `@nestjs/mongoose` | `^11.0.4` (o `^10.1.0`) | Wrapper NestJS (`@InjectModel`, `MongooseModule.forFeature`) | Estándar. |
| `@nestjs/event-emitter` | `^3.1.0` (Nest 11) o `^2.1.1` (Nest 10) | Event bus in-process para `link`/`unlink`/`generate` (audit) | Wrapper oficial sobre `eventemitter2`. Bajo coste, suficiente para MVP. Si volumen crece, se sustituye por Redis Streams sin cambiar el contrato del listener (Arquitectura §18.5). |
| `deep-object-diff` | `^1.1.9` | Calcular diff `cambios` para `auditoria` en updates | ~3 KB, sin deps. Devuelve `{ before, after }` por path modificado. |

### Soporte (cookies, seed, tests)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cookie-parser` | `^1.4.7` | Leer cookie `refresh_token` en `/auth/refresh` y `/auth/logout` | NestJS no parsea cookies por defecto. Registrar como middleware global en `main.ts`. |
| `mongodb-memory-server` | `^11.0.1` | DB en memoria para tests integración | Decisión cerrada (Arquitectura §13.1). |
| `rclone` | `>=1.66` (binario, NO npm) | Sync MinIO + dump Mongo → Google Drive | Decisión cerrada (Arquitectura §8.2). Se instala en NAS, NO en contenedor backend. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `argon2` | `bcrypt@^6.0.0` | bcrypt es 10 años más maduro y siempre compila; argon2id es la recomendación OWASP 2024 y resiste mejor GPU. Decidimos argon2 — el build Alpine ya tiene toolchain. |
| `nestjs-zod` | `ZodValidationPipe` propio (~40 líneas) | Custom evita dep, pero perdemos `@ZodSerializerDto` y la integración con Swagger. Para 1 dependencia con ~50k weekly downloads, no merece la pena reinventar. |
| `mongoose-delete` (npm) | Plugin propio | Ver §Don't Hand-Roll: en este caso el plugin propio gana por simplicidad y por la excepción `documentos` (FL-9) que necesita lógica custom. |
| Refresh token en colección dedicada `refresh_tokens` | Sub-array en `usuarios.refreshTokens[]` | Colección dedicada permite TTL index y consultas por token; sub-array es más simple, atómico (`$push`/`$pull`), suficiente para 1 usuario MVP. **Recomendado: sub-array**, con TTL gestionado en aplicación (`expiresAt`) — facilita rotación y revoca-todos. |
| `csurf` | SameSite=strict + sin formularios cross-origin | `csurf` está deprecado desde 2022 (issue #257 del repo). Con `sameSite=strict` + cookie HttpOnly + intranet del despacho, no añade protección. NO instalar. |
| Cron del sistema (NAS) para backup | Worker dentro del backend Node | Backup en host evita que el backend tenga que ejecutar `mongodump`/`rclone` (no debería). Estándar industrial. Plan 02-04 entrega scripts en `infra/scripts/` que el operador instala en cron del NAS. |

**Installation (plan 02-01 + 02-02 + 02-04):**

```bash
# Plan 02-01 (auth)
pnpm --filter backend add @nestjs/jwt @nestjs/passport passport passport-jwt argon2 cookie-parser
pnpm --filter backend add -D @types/passport-jwt @types/cookie-parser

# Plan 02-02 (bases transversales)
pnpm --filter backend add @nestjs/mongoose mongoose nestjs-zod

# Plan 02-03 (auditoría)
pnpm --filter backend add @nestjs/event-emitter deep-object-diff

# Plan 02-04 (esquemas + seed)
# (no nuevas deps; reusa @nestjs/mongoose y nestjs-zod)
```

**Version verification (npm registry, 2026-04-27):** todas las versiones anteriores fueron consultadas vía `npm view <pkg> version` y `npm view <pkg> peerDependencies` el 2026-04-27. Las peer deps confirman compatibilidad con NestJS 10 (mantener) o NestJS 11 (recomendado upgrade).

**Decision flag for planner — Nest 10 vs 11 upgrade:** El backend actualmente usa `@nestjs/common@^10.4.0`. El ecosistema vivo está en v11 (todos los `^11`). Recomendación: **plan 02-01 task 1 = bump NestJS a 11**. Coste real: cambio de versiones en `package.json`, regenerar `pnpm-lock.yaml`, verificar tests. Beneficio: alineación con `@nestjs/event-emitter@3` y `@nestjs/jwt@11`. Si el planner descarta el bump, anclar `@nestjs/jwt@^10.2.0`, `@nestjs/passport@^10.0.3`, `@nestjs/mongoose@^10.1.0`, `@nestjs/event-emitter@^2.1.1` — todas existen y funcionan, simplemente quedaremos un major detrás durante el resto del MVP.

## Architecture Patterns

### Recommended Project Structure (incremental sobre lo que ya hay)

```
apps/backend/src/
├── modules/
│   ├── health/                       # ya existe
│   ├── auth/                         # 02-01
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts        # /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   └── dto/
│   │       └── login.dto.ts          # Zod schema importado de shared-validation
│   ├── usuarios/                     # 02-01
│   │   ├── usuarios.module.ts
│   │   ├── usuarios.service.ts
│   │   ├── usuarios.repository.ts
│   │   └── schemas/usuario.schema.ts # Mongoose schema con refreshTokens[]
│   ├── esquemas/                     # 02-04
│   │   ├── esquemas.module.ts
│   │   ├── esquemas.controller.ts    # /esquemas/:tipoObjeto
│   │   ├── esquemas.service.ts
│   │   ├── esquemas.repository.ts
│   │   └── schemas/esquema.schema.ts
│   └── auditoria/                    # 02-03
│       ├── auditoria.module.ts
│       ├── auditoria.service.ts      # writeAsync(...)
│       ├── auditoria.repository.ts
│       ├── interceptors/audit.interceptor.ts
│       ├── listeners/                # @OnEvent('resource.linked') etc.
│       └── schemas/auditoria.schema.ts
├── common/
│   ├── decorators/                   # 02-01 (current-user re-export para uso global)
│   ├── filters/
│   │   └── domain-exception.filter.ts # 02-02
│   ├── pipes/                        # 02-02 (Zod via nestjs-zod global)
│   ├── plugins/
│   │   └── soft-delete.plugin.ts     # 02-02 (Mongoose plugin)
│   ├── errors/
│   │   ├── domain.error.ts           # 02-02 (clase base)
│   │   ├── not-found.error.ts
│   │   ├── conflict.error.ts
│   │   └── validation.error.ts
│   └── logger/                       # ya existe
└── ...

apps/backend/scripts/
└── seed.ts                           # 02-04 (pnpm --filter backend seed)

infra/scripts/
├── backup-mongo.sh                   # 02-04 (cron NAS)
├── backup-minio.sh                   # 02-04
└── rclone.conf.example               # 02-04 (sin secretos)
```

### Pattern 1: JWT + refresh con rotación (AUTH-01..04)

**Flujo:**

1. `POST /auth/login` `{email, password}` → `argon2.verify` → si OK:
   - Genera `accessToken` (`{sub: usuarioId, email}`, exp 15 min, HS256, secret `JWT_ACCESS_SECRET`).
   - Genera `refreshToken` (random 32 bytes hex, NO JWT — solo un opaque token).
   - Hashea el refresh con `argon2` antes de guardarlo en `usuarios.refreshTokens[{tokenHash, expiresAt, createdAt, userAgent, ip}]`.
   - `Set-Cookie: refresh_token=<plain>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800`.
   - Body: `{accessToken, expiresIn: 900, user: {id, email, nombre}}`.
2. `POST /auth/refresh` (sin Bearer, con cookie):
   - Lee cookie. Busca usuario cuyo `refreshTokens[]` matchee al hash (iterar y `argon2.verify`).
   - Si no encontrado o `expiresAt < now` → 401 + clear cookie.
   - **Rotación atómica:** en una sola operación Mongo, `$pull` el token actual y `$push` el nuevo (`findOneAndUpdate` con dos modificadores). Emitir nuevo `accessToken` y nueva cookie.
   - **Detección de reuso:** si el token ya no está en la lista pero pertenece sintácticamente a este usuario (token reuse attack), **invalidar todos los refresh del usuario** (`$set: { refreshTokens: [] }`) y devolver 401. Loggear evento `auth.refresh.reused`.
3. `POST /auth/logout` (con cookie):
   - `$pull` el token específico (no todos).
   - Clear cookie.
   - Emitir evento `auth.logout` (audit).

**Por qué refresh opaque (no JWT):**
- JWT como refresh es contradictorio: no puedes revocar un JWT firmado salvo manteniendo blacklist. Si vas a guardar estado server-side de todas formas, el JWT no aporta.
- Opaque token + hash en DB = revocación trivial (`$pull`), tamaño pequeño, sin filtración de claims si la cookie se filtrase.

**Por qué cookie (no localStorage):**
- HttpOnly bloquea XSS (`document.cookie` no la ve).
- SameSite=strict bloquea CSRF.
- `Path=/api/v1/auth` limita su exposición en `Cookie:` headers a sólo los 2 endpoints que la necesitan.

### Pattern 2: `@CurrentUser()` decorator + JwtAuthGuard (AUTH-04)

```typescript
// common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);

// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };  // se asigna a req.user
  }
}

// Uso en controller:
@UseGuards(JwtAuthGuard)
@Get('expedientes')
list(@CurrentUser('id') usuarioId: string) {  // ← inyectado, NO del body
  return this.expedientes.list(usuarioId);
}
```

**Regla de oro:** ningún DTO de la API contiene un campo `usuarioId`. El validador Zod **rechaza** payloads con esa clave (`.strict()` o `.passthrough()` controlado). El servicio recibe `usuarioId` siempre como parámetro de método.

### Pattern 3: Soft-delete plugin Mongoose (AUTH-06)

```typescript
// common/plugins/soft-delete.plugin.ts
import { Schema, Query } from 'mongoose';

export function softDeletePlugin(schema: Schema) {
  schema.add({
    activo: { type: Boolean, default: true, index: true },
    fechaInactivacion: { type: Date, default: null },
  });

  // Filtro automático en TODAS las queries de lectura
  const readOps = ['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments', 'updateOne', 'updateMany'];
  for (const op of readOps) {
    schema.pre(op as any, function (this: Query<unknown, unknown>) {
      // Escape hatch: query.setOptions({ withInactive: true })
      const opts = this.getOptions() as { withInactive?: boolean };
      if (opts.withInactive) return;
      const filter = this.getFilter();
      if (filter.activo === undefined) {
        this.where({ activo: true });
      }
    });
  }

  // Soft-delete en lugar de hard-delete
  schema.statics.softDelete = function (filter: any) {
    return this.updateMany(filter, { $set: { activo: false, fechaInactivacion: new Date() } });
  };
}
```

**Aplicación:**
- Aplicar a todos los schemas de negocio EXCEPTO `auditoria` y `esquemas` (Datos §4.8 y §4.9).
- Repositorio expone `softDelete(id)`, NO `delete(id)`.
- Endpoint `DELETE /:id` invoca `softDelete`.
- Para query-string `?incluirInactivos=true` (admin), el repositorio pasa `query.setOptions({ withInactive: true })`.

**Excepción documentos↔eventos (FL-9, F-016):** documentar en plan 06 (no aquí). El plugin no cambia; la lógica adicional vive en el servicio `documentos`.

### Pattern 4: Validación Zod global (AUTH-04 boundary)

```typescript
// main.ts
import { ZodValidationPipe } from 'nestjs-zod';
app.useGlobalPipes(new ZodValidationPipe());

// dto/login.dto.ts
import { createZodDto } from 'nestjs-zod';
import { LoginSchema } from '@lexscribe/shared-validation';
export class LoginDto extends createZodDto(LoginSchema) {}

// shared-validation/auth.ts
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
}).strict();  // ← rechaza props extra como usuarioId
```

**`.strict()`** en TODOS los schemas de DTO de entrada — bloquea inyección accidental de `usuarioId`/`activo`/`fechaCreacion`.

### Pattern 5: ExceptionFilter con errores de dominio tipados

```typescript
// common/errors/domain.error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  constructor(public readonly resource: string, public readonly id: string) {
    super(`${resource} ${id} not found`);
  }
}
export class ConflictError extends DomainError { /* 409 */ }
export class ValidationError extends DomainError { /* 400 */ }
export class UnauthorizedError extends DomainError { /* 401 */ }

// common/filters/domain-exception.filter.ts
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    res.status(exception.httpStatus).json({
      code: exception.code,
      message: exception.message,
      // NO stack en prod
    });
  }
}
// main.ts: app.useGlobalFilters(new DomainExceptionFilter());
```

**Mensajes en inglés** (decisión cerrada Arquitectura §14). El frontend mapea `code` → texto español.

### Pattern 6: Auditoría híbrida — Interceptor + EventEmitter (AUTH-07)

**División de responsabilidades:**

| Acción | Cómo se captura | Por qué |
|--------|-----------------|---------|
| `create`, `update`, `delete` | **Interceptor** sobre métodos del repository (decorador `@Audited('expediente')`) | El repository tiene el "antes" y "después" exacto del documento. Diff con `deep-object-diff`. |
| `link`, `unlink`, `generate` | **EventEmitter** (`this.events.emit('expediente.contacto.linked', {...})`) + listener `AuditListener` con `@OnEvent` | Son acciones a nivel de servicio, no de un solo repository. Disociar mantiene el repository simple. |
| `login`, `logout` | Llamada directa desde `AuthService` → `auditoria.write()` | Acciones especiales, sin recurso de dominio. |

**Asincronía:** `auditoria.service.write()` hace `setImmediate(() => this.repo.create(record).catch(logErr))`. La respuesta HTTP no se bloquea.

**Schema:**

```typescript
{
  usuarioId: ObjectId,
  accion: 'create' | 'update' | 'delete' | 'link' | 'unlink' | 'generate' | 'login' | 'logout',
  recurso: string,                  // 'expediente', 'contacto', 'documento', ...
  recursoId: ObjectId,
  cambios: object | null,           // diff (solo en update). { before: {...}, after: {...} } o estructura deep-object-diff
  contexto: object | null,          // {rol: 'cliente'} en link, {plantillaId} en generate
  ip: string | null,
  userAgent: string | null,
  timestamp: Date,                  // index { timestamp: -1 }
}
```

**SIN soft-delete.** Inmutable. Índices: `{recurso:1, recursoId:1, timestamp:-1}`, `{usuarioId:1, timestamp:-1}`, `{timestamp:-1}` (Datos §4 + Arquitectura §18).

### Pattern 7: Esquemas dinámicos — endpoints (AUTH-08)

```
GET    /api/v1/esquemas/:tipoObjeto              → { tipoObjeto, parametros: [...] }
POST   /api/v1/esquemas/:tipoObjeto/parametros   → body: { nombre, tipoDato, obligatorio }
                                                    Comportamiento: $addToSet (idempotente)
                                                    409 si nombre ya existe con tipo distinto
DELETE /api/v1/esquemas/:tipoObjeto/parametros/:nombre  → MVP: rechaza con 501 Not Implemented
                                                          (F-095 post-MVP, ver Arquitectura §14)
```

**Validación:**
- `:tipoObjeto` ∈ `{'expediente', 'contacto'}` (enum Zod).
- `nombre` cumple §5.2 reglas (regex `/^[a-zA-Z][a-zA-Z0-9_]*$/`, sin tildes).
- `tipoDato` ∈ `{'texto', 'numero', 'fecha', 'booleano'}`, default `'texto'`.

### Pattern 8: Seed idempotente (AUTH-05)

```typescript
// scripts/seed.ts
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usuariosRepo = app.get(UsuariosRepository);
  const esquemasRepo = app.get(EsquemasRepository);

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) throw new Error('SEED_USER_EMAIL/SEED_USER_PASSWORD required');

  // Upsert usuario
  let user = await usuariosRepo.findByEmail(email);  // raw, sin filtro activo
  if (!user) {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    user = await usuariosRepo.create({ email, nombre: 'Admin', rol: 'admin', passwordHash });
    log('Created seed user');
  } else {
    log('Seed user already exists, skipping');
  }

  // Upsert esquemas vacíos
  for (const tipo of ['expediente', 'contacto']) {
    await esquemasRepo.upsertEmpty(user._id, tipo);  // findOneAndUpdate({usuarioId, tipoObjeto: tipo}, {$setOnInsert: {parametros: []}}, {upsert: true})
    log(`Esquema ${tipo} ensured`);
  }

  await app.close();
}
```

**Reglas:**
- `findOneAndUpdate(..., {upsert: true, $setOnInsert: ...})` para `esquemas` — atómico y idempotente.
- Para `usuarios`: si existe, **NO sobrescribe** la password (evita romper login si el operador re-ejecuta seed con env distinto). Loggear y continuar.
- Salida exit code 0 siempre que termine sin excepción, incluyendo "ya existe".

### Pattern 9: Backup rclone — script + cron en NAS (INF-06)

```bash
#!/usr/bin/env bash
# infra/scripts/backup-daily.sh — se instala en cron del NAS, NO en contenedor
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR=/var/backups/lexscribe
mkdir -p "$BACKUP_DIR/$TS"

# 1. Mongo dump (desde dentro del compose network)
docker compose exec -T mongodb mongodump --archive --gzip > "$BACKUP_DIR/$TS/mongo.archive.gz"

# 2. MinIO sync local (snapshot consistente vía rclone)
rclone sync "minio:lexscribe" "$BACKUP_DIR/$TS/minio" --config /etc/rclone/rclone.conf

# 3. Push a Drive
rclone copy "$BACKUP_DIR/$TS" "gdrive:lexscribe-backup/$TS" --config /etc/rclone/rclone.conf

# 4. Retención
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
rclone delete --min-age 30d "gdrive:lexscribe-backup" --config /etc/rclone/rclone.conf
rclone rmdirs "gdrive:lexscribe-backup" --leave-root --config /etc/rclone/rclone.conf

# 5. Verificación
SIZE=$(rclone size "gdrive:lexscribe-backup/$TS" --json | jq .bytes)
[[ "$SIZE" -gt 0 ]] || { echo "BACKUP FAILED: empty"; exit 1; }
echo "Backup OK: $SIZE bytes uploaded for $TS"
```

**Cron:** `0 3 * * * /opt/lexscribe/infra/scripts/backup-daily.sh >> /var/log/lexscribe-backup.log 2>&1`.

**Verificabilidad (criterio aceptación 5):** abrir Google Drive → carpeta `lexscribe-backup/<fecha>` y comprobar `mongo.archive.gz` + `minio/`. Adicionalmente, el script imprime tamaño en log.

### Anti-Patterns to Avoid

- **NO** usar `mongoose-delete` v1.0.7 (publicada 2024) — `npm view` confirma que existe pero su mantenimiento es errático y su API añade `deleted: Boolean` (en inglés), incompatible con el campo `activo: Boolean` ya fijado en Datos §2.3.
- **NO** poner `usuarioId` en el body de ningún DTO. Si Zod lo recibe, `.strict()` debe rechazar.
- **NO** firmar refresh tokens como JWT — opaque token + hash en DB.
- **NO** usar `bcrypt` con cost > 12 — es lento en hardware NAS (Synology DS220+ ARM tarda >800ms con cost 14). argon2id preset OWASP es más rápido en mismo hardware.
- **NO** hacer audit síncrono — bloquearía cada request entre 5-50ms. Usar `setImmediate` o cola.
- **NO** ejecutar `mongodump`/`rclone` desde dentro del contenedor backend — el contenedor no debería tener credenciales de Drive ni acceso al socket Docker.
- **NO** instalar `csurf` — deprecado, no aporta con SameSite=strict.
- **NO** mezclar el "modelo de validación de tipo de parámetro en `esquemas`" con la "validación de los valores en instancias". Lo segundo se aplica en fase 3 (contactos) y 4 (expedientes), no aquí.

## Don't Hand-Roll

| Problema | NO construir | USAR | Por qué |
|----------|--------------|------|---------|
| Hash de password seguro | Implementación con `crypto.scrypt`/PBKDF2 | `argon2` | Constant-time, parámetros calibrados (memoria/CPU/paralelismo), formato auto-versionado. Hand-rolled scrypt suele tener parámetros ridículos. |
| JWT sign/verify | `crypto.createHmac` directo | `@nestjs/jwt` (envuelve `jsonwebtoken`) | Validación `exp`/`iat`/`nbf`, manejo de algoritmos, prevención de `alg: none` attack. |
| Cookies parsing | Regex sobre `req.headers.cookie` | `cookie-parser` | Edge cases con quoted values, encoding. |
| Validación de input | `if (!body.email || !body.password)` | Zod via `nestjs-zod` | Mensajes consistentes, derivación de tipos TS, schemas reutilizables. |
| Diff de objetos para audit | Recursivo propio | `deep-object-diff` | Maneja arrays, null, undefined correctamente; tipado. |
| Backup periódico | Worker Node.js que llame `mongodump` | `rclone` + cron del SO | rclone tiene retry, parallelism, encriptación, y es el estándar del ecosistema NAS. |

**Caso especial — soft-delete:** AQUÍ SÍ recomendamos plugin propio (~40 líneas, ver Pattern 3) porque:
1. La excepción FL-9 (documentos↔eventos) requerirá lógica específica que `mongoose-delete` no expresa limpiamente.
2. Los nombres de campo están fijados en español (`activo`, `fechaInactivacion`) por Datos §2.3; los plugins existentes usan inglés (`deleted`, `deletedAt`) y obligaríamos a mapear en cada repo.
3. 40 líneas de plugin con tests es menos riesgo que un plugin npm con changelog opaco.

**Key insight:** soft-delete es **convención de proyecto**, no librería. argon2/JWT/Zod/rclone son **criptografía/validación/I/O** — ahí siempre librería. La línea está clara.

## Runtime State Inventory

> N/A — **fase greenfield** sobre infra recién creada (fase 1 acaba de mergear). No hay estado en runtime: 0 usuarios, 0 esquemas, 0 audit, 0 backup previo. La primera ejecución de `pnpm seed` es la primera escritura de Mongo del proyecto. La primera ejecución de `backup-daily.sh` es el primer push a Drive.
>
> **Categorías verificadas:**
> - **Stored data:** ninguno (Mongo recién levantado vacío, MinIO recién creado).
> - **Live service config:** ninguno (no existe aún `gdrive:` en rclone — se crea en plan 02-04 con `rclone config`).
> - **OS-registered state:** ninguno (cron del NAS aún no tiene jobs de Lexscribe — se añaden en plan 02-04).
> - **Secrets/env vars:** `.env.example` tras fase 1 ya lista `JWT_ACCESS_SECRET`, `SEED_USER_EMAIL`, etc. — verificar y ampliar si falta `JWT_REFRESH_SECRET` (no necesario si usamos opaque tokens — confirmado: solo `JWT_ACCESS_SECRET`).
> - **Build artifacts:** ninguno relacionado con auth/audit (la fase 1 produjo Docker images `lexscribe-backend:latest` que se reconstruirán al merge de fase 2).

## Common Pitfalls

### Pitfall 1: Refresh token race condition al rotar
**Qué falla:** dos requests simultáneos `/auth/refresh` con la misma cookie llegan en paralelo (frontend con varias pestañas, retry tras timeout). Ambas pasan la validación, ambas rotan, una de ellas pierde y deja al usuario "logged out" inesperadamente.
**Por qué:** la validación + escritura no son atómicas sin precaución.
**Cómo evitar:** la rotación se hace con `findOneAndUpdate` filtrando por el hash del token actual (`{ refreshTokens: { $elemMatch: { tokenHash: hashedReceived } } }`) y `$pull` + `$push` en una sola operación. Si la operación devuelve `null`, significa que el token ya rotó (o nunca existió) → 401. El segundo request en condición de carrera fallará explícitamente y el frontend hará logout limpio.
**Señales:** logs de "refresh token not found" en bursts; usuario reporta logouts fantasmas.

### Pitfall 2: Cookie SameSite=strict bloquea redirect post-login en login externo
**Qué falla:** si el usuario hace clic en `https://lexscribe.example/expedientes/123` desde un email externo y aún no tiene sesión, el redirect a `/login` y de vuelta puede perder la cookie en algunos navegadores con SameSite=strict.
**Por qué:** `strict` no envía la cookie en navegaciones top-level cross-site iniciales.
**Cómo evitar:** en MVP intranet, esto no se da (no hay enlaces externos al despacho). Si en fase 8 se cambia: usar `SameSite=lax` para refresh (sigue protegiendo CSRF en POST) y `strict` solo si todo el tráfico es interno.
**Señales:** usuarios que hacen login pero la primera petición sale como anónima.

### Pitfall 3: Audit interceptor pierde eventos en errores 5xx
**Qué falla:** el interceptor escribe audit DESPUÉS del éxito del repository. Si el repo escribe pero la respuesta HTTP falla (timeout, error de serialización), audit no se registra → divergencia entre Mongo y `auditoria`.
**Por qué:** orden interceptor → response. Si lanza el response, ya pasó por el repo.
**Cómo evitar:** poner el `auditoria.write` en el callback `tap()` del Observable retornado por `next.handle()`, que se ejecuta tras `Mongo` confirmar pero antes de la serialización del response. Aún así puede haber pérdida en crash; aceptable para MVP. La auditoría es "best effort" — la fuente legal de verdad es el documento mismo.
**Señales:** registros sin entrada audit correspondiente al cruzar `recursoId` con `auditoria`.

### Pitfall 4: Mongoose plugin global aplicado a `auditoria`/`esquemas`
**Qué falla:** registrar el plugin con `mongoose.plugin(softDeletePlugin)` global añade `activo`/`fechaInactivacion` a `auditoria`, contradiciendo Datos §4.8 + §18 (inmutable).
**Cómo evitar:** **NUNCA** registro global. Aplicar `schema.plugin(softDeletePlugin)` por schema en los Mongoose schema files de las colecciones de negocio. `auditoria` y `esquemas` NO lo aplican.
**Señales:** registros en `auditoria` con `activo: false` (no debería existir nunca).

### Pitfall 5: Seed idempotente sobrescribe password al re-ejecutar
**Qué falla:** la segunda ejecución del seed con `SEED_USER_PASSWORD` distinto sustituye el hash, rompiendo el login con la password "antigua" que el usuario ya configuró.
**Cómo evitar:** la lógica del seed es "create if not exists, else skip". NO `findOneAndUpdate` con `$set` sobre password. Loggear "user exists, skipped" y salir 0.
**Señales:** "no puedo entrar después de redeploy".

### Pitfall 6: rclone token caduca silenciosamente
**Qué falla:** `rclone` usa OAuth refresh para Drive. Si el operador no marca el remoto como `team_drive` o el token de refresh caduca tras meses sin uso, los backups dejan de subir y nadie se entera.
**Cómo evitar:**
1. Configurar `rclone` con scope `drive` (full) — más estable que `drive.file`.
2. El script de backup hace `rclone about gdrive:` antes de copiar; si falla, exit code != 0 y cron envía email (instalar `mailx` en NAS).
3. Healthcheck mensual manual: revisar carpeta Drive y confirmar fecha del último backup.
**Señales:** script termina ok pero la carpeta Drive no se actualiza desde hace días — siempre exit-code-fail si el upload falla.

### Pitfall 7: argon2 build falla en imagen Alpine
**Qué falla:** `node:22-alpine` no incluye toolchain C; `argon2` falla al instalar.
**Cómo evitar:** multi-stage Dockerfile (ya en fase 1). En el `builder` stage añadir `RUN apk add --no-cache python3 make g++`. En el `runner` stage no hace falta — el binario ya está compilado en `node_modules`. Verificar tras instalar que `node -e "require('argon2')"` no falla en el contenedor final.
**Señales:** `docker compose up backend` falla con `Error: Could not load the binding file`.

### Pitfall 8: Esquema `esquemas` confunde `usuarioId` único vs `tipoObjeto` único
**Qué falla:** Datos §4.8 dice "una entrada por `tipoObjeto` y por `usuarioId`" → índice único `{usuarioId:1, tipoObjeto:1}`. Si el seed se ejecuta antes de que el índice exista, puede crear duplicados, y al añadir el índice falla.
**Cómo evitar:** definir el índice en el `@Schema` Mongoose (`@Index({usuarioId: 1, tipoObjeto: 1}, {unique: true})`); Mongoose lo crea al primer connect. Y el seed usa `upsert: true` con ese filter.
**Señales:** error `E11000 duplicate key` al re-ejecutar seed.

## Code Examples

### Ejemplo 1: Login con argon2

```typescript
// auth.service.ts (extracto)
async login(dto: LoginDto, ip: string, userAgent: string) {
  const user = await this.usuarios.findByEmail(dto.email);
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const ok = await argon2.verify(user.passwordHash, dto.password);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const accessToken = await this.jwt.signAsync(
    { sub: user._id.toString(), email: user.email },
    { expiresIn: '15m' },
  );

  const refreshPlain = randomBytes(32).toString('hex');
  const refreshHash = await argon2.hash(refreshPlain, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await this.usuarios.pushRefreshToken(user._id, { tokenHash: refreshHash, expiresAt, ip, userAgent });

  this.events.emit('auth.login', { usuarioId: user._id, ip, userAgent });

  return { accessToken, refreshPlain, expiresIn: 900, user: { id: user._id, email: user.email, nombre: user.nombre } };
}
```

### Ejemplo 2: Audit interceptor

```typescript
// auditoria/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService, private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const usuarioId = req.user?.id;

    return next.handle().pipe(
      tap((result) => {
        this.auditoria.writeAsync({
          usuarioId,
          accion: meta.accion,
          recurso: meta.recurso,
          recursoId: result?._id ?? result?.id,
          cambios: meta.diff?.(req.body, result) ?? null,
          contexto: meta.contexto?.(req) ?? null,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
        });
      }),
    );
  }
}
```

### Ejemplo 3: Esquema dinámico add-parametro idempotente

```typescript
// esquemas.service.ts
async addParametro(usuarioId: ObjectId, tipoObjeto: TipoObjeto, dto: AddParametroDto) {
  const result = await this.esquemas.model.findOneAndUpdate(
    { usuarioId, tipoObjeto, 'parametros.nombre': { $ne: dto.nombre } },
    {
      $addToSet: { parametros: { nombre: dto.nombre, tipoDato: dto.tipoDato ?? 'texto', obligatorio: dto.obligatorio ?? false, fechaCreacion: new Date() } },
      $set: { fechaActualizacion: new Date() },
    },
    { new: true },
  );
  if (!result) {
    // o ya existe (idempotencia OK), o no encuentra el esquema (error de seed)
    const existing = await this.esquemas.model.findOne({ usuarioId, tipoObjeto });
    if (!existing) throw new NotFoundError('esquema', tipoObjeto);
    const param = existing.parametros.find(p => p.nombre === dto.nombre);
    if (param && param.tipoDato !== (dto.tipoDato ?? 'texto')) {
      throw new ConflictError(`Parametro ${dto.nombre} ya existe con tipoDato distinto`);
    }
    return existing;
  }
  return result;
}
```

## State of the Art

| Old | Current | Cambió | Impacto |
|-----|---------|--------|---------|
| `bcrypt` para passwords | `argon2id` | OWASP 2024 update | Mayor resistencia GPU. Usar argon2 si build lo permite. |
| `csurf` para CSRF | `SameSite=strict` cookies | Express dejó `csurf` deprecated 2022 | NO instalar csurf. SameSite + sin formularios cross-origin = suficiente. |
| JWT como refresh | Opaque token + hash en DB | Comunidad Auth0/Okta 2023 | Permite revocación inmediata, detecta reuse. |
| `passport-local` para login | Endpoint custom + `argon2.verify` | NestJS comunidad 2024 | passport-local añade indirección sin valor para 1 estrategia. Login custom con `argon2.verify` es ~10 líneas más limpio. JWT strategy sí merece Passport. |
| Mongoose 7 | Mongoose 9 | 2024 | Soporte Mongo 8.x, mejoras tipos TS. |

**Deprecated/outdated:**
- `csurf` — no usar.
- `bcrypt` cost > 12 — demasiado lento en NAS ARM.
- `passport-local` — innecesario.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 LTS | backend dev | ✓ (asumido tras fase 1) | — | — |
| pnpm 9 | monorepo | ✓ | 9.12.0 (lock) | — |
| MongoDB 8.x | backend persistence | ✓ via docker-compose | imagen oficial | — |
| MinIO | storage (no toca esta fase, sí backup) | ✓ via docker-compose | — | — |
| Docker / docker compose | dev + NAS | ✓ | 24.x | — |
| `rclone` | backup en NAS | ✗ en máquina dev del researcher (Windows) | — | **Required en NAS solamente.** Plan 02-04 documenta instalación. Verificación local: dev no necesita rclone — tests del backup usan mocks o se saltan en CI (`skip in non-Linux env`). |
| Build toolchain (python3, make, g++) | argon2 build en Docker | ✓ (se añadirá al builder stage Dockerfile en plan 02-01) | — | Si falla: pivotar a `bcrypt@^6.0.0` (precompiled, sin build deps). |
| OAuth Drive token | rclone backup | ✗ (configuración manual del operador) | — | Se hace `rclone config` en NAS antes del primer cron. Documentar en plan 02-04 README. Sin esto, INF-06 no es testeable end-to-end — fallback: validar el script en local con `rclone:local` remoto (smoke test). |

**Missing dependencies with no fallback:** ninguna que bloquee la fase. La OAuth de Drive es manual — se documenta como tarea del operador en `Pending Todos` de STATE.md tras la fase.

**Missing dependencies with fallback:** rclone OAuth Drive (smoke con local remote en CI / manual config en NAS prod).

## Validation Architecture

> `.planning/config.json` no existe → tratar `nyquist_validation` como **enabled** (default).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 + Supertest 7 (backend, ya instalados fase 1) |
| Config file | `apps/backend/jest.config.ts` (existe) y `apps/backend/jest.e2e.config.ts` (NO existe — Wave 0) |
| Quick run command | `pnpm --filter backend test` |
| Full suite command | `pnpm --filter backend test && pnpm --filter backend test:e2e` |
| DB en tests | `mongodb-memory-server@^11` (Wave 0 add) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTH-01 | Login con creds válidas devuelve `accessToken` + setea cookie `refresh_token` | e2e | `pnpm --filter backend test:e2e -t "auth login"` | ❌ Wave 0 (`test/auth/login.e2e-spec.ts`) |
| AUTH-01 | Login con creds inválidas devuelve 401 sin pista (timing safe) | e2e | mismo file | ❌ Wave 0 |
| AUTH-01 | Cookie tiene atributos `HttpOnly Secure SameSite=Strict Path=/api/v1/auth Max-Age=604800` | e2e | mismo file | ❌ Wave 0 |
| AUTH-02 | `/auth/refresh` con cookie válida → nueva cookie distinta + nuevo accessToken | e2e | `pnpm --filter backend test:e2e -t "refresh rotation"` | ❌ Wave 0 (`test/auth/refresh.e2e-spec.ts`) |
| AUTH-02 | Reusar refresh ya rotado → 401 + invalida todos los tokens del usuario | e2e | mismo file | ❌ Wave 0 |
| AUTH-03 | `/auth/logout` con cookie → cookie cleared + token removed de DB | e2e | `pnpm --filter backend test:e2e -t "logout"` | ❌ Wave 0 |
| AUTH-04 | Endpoint protegido sin Bearer → 401 | e2e | `pnpm --filter backend test:e2e -t "guards"` | ❌ Wave 0 (`test/common/guards.e2e-spec.ts`) |
| AUTH-04 | Endpoint protegido con Bearer válido inyecta `usuarioId`; body con `usuarioId` es ignorado/rechazado | e2e | mismo file | ❌ Wave 0 |
| AUTH-05 | `pnpm seed` desde DB vacía crea 1 usuario + 2 esquemas vacíos | unit/integration | `pnpm --filter backend test -t "seed idempotent"` | ❌ Wave 0 (`test/scripts/seed.spec.ts`) |
| AUTH-05 | Re-ejecutar seed: 0 cambios, exit 0, password no se sobrescribe | integration | mismo file | ❌ Wave 0 |
| AUTH-06 | Soft-delete plugin: `delete()` resulta en `activo:false`; `find()` excluye | unit | `pnpm --filter backend test -t "soft delete plugin"` | ❌ Wave 0 (`test/common/soft-delete.plugin.spec.ts`) |
| AUTH-06 | `find({}, {withInactive: true})` incluye los inactivos | unit | mismo file | ❌ Wave 0 |
| AUTH-07 | Crear recurso → registro `auditoria` con accion=create, recursoId, timestamp | integration | `pnpm --filter backend test -t "audit interceptor"` | ❌ Wave 0 (`test/auditoria/interceptor.spec.ts`) |
| AUTH-07 | Update produce `cambios` con diff de campos modificados | integration | mismo file | ❌ Wave 0 |
| AUTH-07 | Eventos `link`/`unlink`/`generate`/`login`/`logout` producen registros | integration | `pnpm --filter backend test -t "audit events"` | ❌ Wave 0 (`test/auditoria/events.spec.ts`) |
| AUTH-08 | `GET /api/v1/esquemas/expediente` devuelve `{tipoObjeto, parametros: []}` tras seed | e2e | `pnpm --filter backend test:e2e -t "esquemas"` | ❌ Wave 0 (`test/esquemas/esquemas.e2e-spec.ts`) |
| AUTH-08 | `POST /api/v1/esquemas/expediente/parametros` añade y es idempotente | e2e | mismo file | ❌ Wave 0 |
| AUTH-08 | `:tipoObjeto` distinto de `expediente`/`contacto` → 400 Zod validation | e2e | mismo file | ❌ Wave 0 |
| INF-06 | Script `backup-daily.sh` con `RCLONE_REMOTE=local` produce snapshot consistente | manual smoke | `bash infra/scripts/backup-daily.sh` (en NAS-like env, NO en CI Windows) | ❌ Wave 0 (`infra/scripts/backup-daily.sh` + README de verificación manual) |
| INF-06 | Script verifica tamaño > 0 tras subida (exit code distinto si vacío) | manual smoke | mismo | ❌ Wave 0 |
| INF-06 | Retención: archivos > 7 d en local borrados; > 30 d en remote borrados | manual / unit del helper | unit del helper si lo separamos | manual |

### Sampling Rate

- **Per task commit:** `pnpm --filter backend test --findRelatedTests <changed files>` o `pnpm --filter backend test -t <suite del task>`.
- **Per wave merge:** `pnpm --filter backend test && pnpm --filter backend test:e2e`.
- **Phase gate:** suite full backend + verificación manual de backup-daily.sh contra remote local + smoke `pnpm seed` contra Mongo limpio. Antes de `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `apps/backend/jest.e2e.config.ts` — config Jest e2e (no existe; el `package.json` la referencia).
- [ ] `apps/backend/test/setup-e2e.ts` — bootstrap con `mongodb-memory-server`, app NestJS test, helpers `loginAndGetTokens()`, `clearDb()`.
- [ ] `apps/backend/test/auth/login.e2e-spec.ts` — AUTH-01.
- [ ] `apps/backend/test/auth/refresh.e2e-spec.ts` — AUTH-02 (rotación + reuse detection).
- [ ] `apps/backend/test/auth/logout.e2e-spec.ts` — AUTH-03.
- [ ] `apps/backend/test/common/guards.e2e-spec.ts` — AUTH-04 (incluyendo body con `usuarioId` rechazado).
- [ ] `apps/backend/test/common/soft-delete.plugin.spec.ts` — AUTH-06 (unit).
- [ ] `apps/backend/test/auditoria/interceptor.spec.ts` — AUTH-07 (interceptor + diff).
- [ ] `apps/backend/test/auditoria/events.spec.ts` — AUTH-07 (event listeners).
- [ ] `apps/backend/test/esquemas/esquemas.e2e-spec.ts` — AUTH-08.
- [ ] `apps/backend/test/scripts/seed.spec.ts` — AUTH-05.
- [ ] `infra/scripts/backup-daily.sh` + `infra/scripts/README.md` — INF-06 + procedimiento de verificación manual.
- [ ] Install: `pnpm --filter backend add -D mongodb-memory-server`.
- [ ] Frontend (login form): si plan 02-01 incluye UI login/logout, añadir Vitest spec en `apps/frontend/app/(auth)/login/__tests__/` (no obligatorio para esta fase si la UI se difiere — confirmar con planner).

## Project Constraints (from CLAUDE.md)

Directivas extraídas de `./CLAUDE.md` que el planner debe verificar en cada plan:

- **Documentos fuente de verdad:** toda decisión funcional/datos/arquitectura debe alinearse con `docs/FUNCIONAL.md`, `docs/DATOS.md`, `docs/ARQUITECTURA.md`. Conflicto → mandan los docs (orden: FUNCIONAL > DATOS > ARQUITECTURA). Esta investigación ya se ancla en ellos.
- **Trazabilidad por F-XXX/AUTH-XX:** commits y PRs referencian la feature/req. Plan debe asignar IDs por task.
- **NO inventar info:** si falta algo, registrar como pregunta abierta en `FUNCIONAL.md §8`. (Esta fase no tiene preguntas abiertas — ver §Open Questions.)
- **Cambios funcionales → changelog:** cualquier modificación de los 3 docs añade entrada con fecha YYYY-MM-DD. AUTH-08 puede requerir nota en `DATOS.md §4.8` si añadimos endpoints precisos.
- **Behavioral:** "Do what has been asked; nothing more, nothing less." NO tareas extra. NO crear documentación gratuita.
- **File Organization:** NO root. `/src` para código, `/tests` para tests, `/docs` para markdown, `/scripts` para utilidades. (Tests de backend van en `apps/backend/test/`, no en root `/tests`.)
- **Architecture:** DDD bounded contexts (un módulo por dominio); archivos < 500 líneas; interfaces TS tipadas para APIs públicas; TDD London (mock-first); event sourcing para state changes (encaja con audit event-driven).
- **Build & Test:** SIEMPRE `pnpm test` y `pnpm build` tras cambios. Verificar antes de commit.
- **Security:**
  - NO hardcodear secrets. `JWT_ACCESS_SECRET`, `SEED_USER_PASSWORD`, `RCLONE_*` van en env.
  - NO commit `.env`.
  - Validar input en boundaries (Zod).
  - Sanitizar paths (relevante si esquemas exponen `:tipoObjeto` — validar enum).
- **Concurrency:** 1 mensaje = todas las operaciones relacionadas (lo aplica el agente ejecutor).
- **NO crear `*.md` proactivamente:** este RESEARCH.md SÍ es solicitado por el orquestador. El planner debe NO crear docs adicionales salvo `02-PLAN-XX.md` que `/gsd:plan-phase` espera.

## Open Questions

Ninguna bloqueante. Puntos donde el planner DEBE tomar decisión explícita en plan 02-01:

1. **NestJS 10 → 11 upgrade en plan 02-01.**
   - Recomendación firme: SÍ, antes de instalar auth.
   - Si el planner descarta: anclar versiones v10 documentadas en §Standard Stack.

2. **Refresh token storage: sub-array `usuarios.refreshTokens[]` vs colección dedicada.**
   - Recomendación: sub-array. Atómico via `findOneAndUpdate`, suficiente para mono-usuario MVP.

3. **Login UI en plan 02-01 o se difiere?**
   - Roadmap dice "frontend login/logout" en 02-01. Confirmar que sí.
   - Implica: spec Vitest en frontend, formulario con React Hook Form + Zod, llamada `/auth/login`, almacenar `accessToken` en memoria + Authorization header automático en `lib/api/`, redirect tras login. Esto añade ~3-4 tasks al plan 02-01.

4. **`@nestjs/swagger` para OpenAPI auto en esta fase?**
   - Arquitectura §6.2 lo menciona como deseable. Coste bajo (decorador `@ApiTags`/`@ApiOperation`). `nestjs-zod` v4 integra con swagger 7+. Recomendación: añadir en plan 02-04 cuando esté el módulo `esquemas` para tener al menos un módulo con docs autogenerados, y completarlo en fases siguientes. NO bloquear esta fase si el planner lo difiere.

5. **CSRF en endpoints autenticados POST/PATCH/DELETE.**
   - Recomendación: NO. SameSite=strict + cookie sólo en `/auth/*` + Bearer header en endpoints de negocio = cero superficie CSRF. Documentar la decisión en plan 02-01 README.

## Sources

### Primary (HIGH confidence)
- `docs/FUNCIONAL.md` (rev 2026-04-26) — features F-014, F-090–F-096, FL-13.
- `docs/DATOS.md` (rev 2026-04-26) — convenciones §2 (soft-delete §2.3, validación §2.7), colecciones `usuarios` §4.9, `auditoria` (referenciada §3 + §18 ARQUITECTURA), `esquemas` §4.8.
- `docs/ARQUITECTURA.md` (rev 2026-04-26) — auth §9, soft-delete §6.1, audit §18, seed §16, backup §8.2, runtime §15.
- `.planning/STATE.md`, `.planning/ROADMAP.md` (rev 2026-04-27) — fase 1 completada.
- `apps/backend/package.json` — versiones reales instaladas (`@nestjs/common@^10.4.0`).
- npm registry (`npm view <pkg> version peerDependencies`, ejecutado 2026-04-27) — `@nestjs/jwt@11.0.2`, `@nestjs/passport@11.0.5`, `@nestjs/mongoose@11.0.4`, `mongoose@9.5.0`, `nestjs-zod@4.3.1` (peer Nest 10 OK), `argon2@0.44.0`, `@nestjs/event-emitter@3.1.0` (Nest 11) / `2.1.1` (Nest 10), `cookie-parser@1.4.7`, `mongodb-memory-server@11.0.1`. Versiones v10-compatibles confirmadas.

### Secondary (MEDIUM confidence)
- OWASP Password Storage Cheat Sheet — argon2id es la primera recomendación 2024 (training data + práctica industrial).
- NestJS docs (autenticación + guards + interceptors) — patrones estándar comunidad.
- Auth0/Okta blog — refresh token rotation + reuse detection pattern (training data).
- `csurf` deprecation notice (npm) — paquete archivado, sin commits desde 2022 (training data).

### Tertiary (LOW confidence — flagged)
- Performance argon2 vs bcrypt en ARM NAS — extrapolación de benchmarks generales. Validar con un test rápido en el primer despliegue (ejecutar `argon2.hash` en backend Docker y medir latencia; si > 500 ms, ajustar params).
- `mongoose-delete` mantenimiento "errático" — basado en histórico de issues sin verificación reciente. La recomendación de plugin propio se sostiene por OTROS motivos (campos español, FL-9), así que esta debilidad no afecta la decisión.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas las versiones verificadas en registry hoy; peer dependencies confirmadas.
- Architecture patterns: HIGH — alineados con decisiones cerradas en `docs/`.
- Pitfalls: MEDIUM-HIGH — race condition de rotación y argon2 build son riesgos reales y conocidos.
- Backup (rclone): MEDIUM — el script propuesto sigue el patrón estándar pero la verificabilidad end-to-end depende de OAuth Drive del operador, no testeable en CI.
- Open questions: HIGH — se identificaron 5, todas con recomendación clara.

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 días — stack maduro y estable).
