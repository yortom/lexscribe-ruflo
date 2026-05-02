---
phase: 02-auth-y-bases-transversales
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/backend/package.json
  - pnpm-lock.yaml
  - apps/backend/jest.e2e.config.ts
  - apps/backend/test/setup-e2e.ts
  - apps/backend/test/auth/login.e2e-spec.ts
  - apps/backend/test/auth/refresh.e2e-spec.ts
  - apps/backend/test/auth/logout.e2e-spec.ts
  - apps/backend/test/common/guards.e2e-spec.ts
  - apps/backend/src/app.module.ts
  - apps/backend/src/main.ts
  - apps/backend/src/modules/usuarios/usuarios.module.ts
  - apps/backend/src/modules/usuarios/usuarios.service.ts
  - apps/backend/src/modules/usuarios/usuarios.repository.ts
  - apps/backend/src/modules/usuarios/schemas/usuario.schema.ts
  - apps/backend/src/modules/auth/auth.module.ts
  - apps/backend/src/modules/auth/auth.controller.ts
  - apps/backend/src/modules/auth/auth.service.ts
  - apps/backend/src/modules/auth/strategies/jwt.strategy.ts
  - apps/backend/src/modules/auth/guards/jwt-auth.guard.ts
  - apps/backend/src/modules/auth/dto/login.dto.ts
  - apps/backend/src/common/decorators/current-user.decorator.ts
  - apps/backend/src/common/types/jwt-payload.ts
  - packages/shared-validation/src/auth.ts
  - packages/shared-validation/src/index.ts
  - apps/frontend/app/(auth)/login/page.tsx
  - apps/frontend/lib/api/auth.ts
  - apps/frontend/lib/auth/session.ts
  - apps/frontend/middleware.ts
  - .env.example
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04

must_haves:
  truths:
    - "El usuario abre /login, introduce email/password y obtiene accessToken + cookie refresh_token"
    - "POST /api/v1/auth/refresh con cookie válida emite nuevo accessToken y rota la cookie"
    - "Reusar un refresh ya rotado devuelve 401 e invalida todos los tokens del usuario"
    - "POST /api/v1/auth/logout elimina el refresh server-side y limpia la cookie"
    - "Endpoint protegido sin Authorization header devuelve 401"
    - "Endpoint protegido con JWT inyecta usuarioId desde el token; un body con usuarioId es rechazado por Zod .strict()"
  artifacts:
    - path: "apps/backend/jest.e2e.config.ts"
      provides: "Jest e2e config (Wave 0)"
      contains: "setup-e2e"
    - path: "apps/backend/test/setup-e2e.ts"
      provides: "mongodb-memory-server bootstrap + helpers"
      contains: "MongoMemoryServer"
    - path: "apps/backend/src/modules/auth/auth.controller.ts"
      provides: "POST /auth/login, /auth/refresh, /auth/logout"
      exports: ["AuthController"]
    - path: "apps/backend/src/modules/auth/strategies/jwt.strategy.ts"
      provides: "PassportStrategy(Strategy) con secret JWT_ACCESS_SECRET"
    - path: "apps/backend/src/common/decorators/current-user.decorator.ts"
      provides: "@CurrentUser() param decorator extrayendo req.user"
    - path: "apps/backend/src/modules/usuarios/schemas/usuario.schema.ts"
      provides: "Mongoose schema con refreshTokens[] subdoc"
      contains: "refreshTokens"
    - path: "apps/frontend/app/(auth)/login/page.tsx"
      provides: "Formulario login mínimo Next.js (RHF + Zod)"
  key_links:
    - from: "apps/backend/src/modules/auth/auth.service.ts"
      to: "apps/backend/src/modules/usuarios/usuarios.repository.ts"
      via: "argon2.verify + pushRefreshToken"
      pattern: "argon2\\.verify"
    - from: "apps/backend/src/modules/auth/strategies/jwt.strategy.ts"
      to: "request.user"
      via: "validate() returns {id, email}"
      pattern: "PassportStrategy"
    - from: "apps/frontend/app/(auth)/login/page.tsx"
      to: "/api/v1/auth/login"
      via: "fetch POST con credentials: 'include'"
      pattern: "credentials.*include"
---

<objective>
Implementar el módulo de autenticación end-to-end: bump NestJS 10→11, instalar deps, crear infra de tests e2e (Wave 0), modelar `usuarios` con `refreshTokens[]`, exponer `/auth/login|refresh|logout`, JwtStrategy + JwtAuthGuard + `@CurrentUser()`, y un formulario login mínimo en Next.js.

Purpose: Cierra AUTH-01..AUTH-04 — primera fase con dominio. Sienta el "raíl" de identidad sobre el que el resto del MVP cuelga.
Output: Login funcional vía HTTPS, JWT 15 min + refresh cookie 7 d con rotación, logout server-side, decorador `@CurrentUser` operativo, suite e2e en verde.
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
@.planning/phases/02-auth-y-bases-transversales/02-VALIDATION.md
@apps/backend/package.json
@apps/backend/src/app.module.ts
@apps/backend/src/main.ts
@.env.example

<interfaces>
<!-- Contratos clave que el executor consumirá. Importar/usar directamente — no explorar -->

JWT Payload (apps/backend/src/common/types/jwt-payload.ts — este plan lo crea):
```typescript
export interface JwtPayload {
  sub: string;   // usuarioId
  email: string;
  iat?: number;
  exp?: number;
}
```

Login Zod schema (packages/shared-validation/src/auth.ts — este plan lo crea):
```typescript
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
}).strict();
export type LoginInput = z.infer<typeof LoginSchema>;
```

Usuario schema (Mongoose, este plan lo crea):
```typescript
{
  _id: ObjectId,
  email: string,            // unique
  nombre: string,
  rol: 'admin',
  passwordHash: string,     // argon2id
  refreshTokens: [{
    tokenHash: string,      // argon2id del random hex
    expiresAt: Date,
    createdAt: Date,
    ip: string | null,
    userAgent: string | null,
  }],
  fechaCreacion: Date,
  fechaActualizacion: Date,
}
```

Auth endpoints contract (NestJS):
- POST /api/v1/auth/login   body {email,password}  → 200 {accessToken, expiresIn:900, user:{id,email,nombre}} + Set-Cookie refresh_token
- POST /api/v1/auth/refresh (cookie only)          → 200 {accessToken, expiresIn:900} + new Set-Cookie
- POST /api/v1/auth/logout  (cookie only)          → 204 + Clear-Cookie

Cookie attributes (decisión cerrada):
`refresh_token=<plain>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 (Wave 0): Bump NestJS 10→11, instalar deps auth, crear infra Jest e2e</name>
  <files>
    apps/backend/package.json,
    pnpm-lock.yaml,
    apps/backend/jest.e2e.config.ts,
    apps/backend/test/setup-e2e.ts,
    apps/backend/test/auth/login.e2e-spec.ts,
    apps/backend/test/auth/refresh.e2e-spec.ts,
    apps/backend/test/auth/logout.e2e-spec.ts,
    apps/backend/test/common/guards.e2e-spec.ts,
    .env.example
  </files>
  <read_first>
    apps/backend/package.json,
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Standard Stack + §Validation Architecture),
    .env.example,
    apps/backend/src/main.ts (para no romper el bootstrap actual)
  </read_first>
  <action>
    1) En `apps/backend/package.json` actualizar a NestJS 11:
       - `@nestjs/common@^11.0.0`, `@nestjs/core@^11.0.0`, `@nestjs/platform-express@^11.0.0`
       - `@nestjs/terminus@^11.0.0`, `@nestjs/config@^4.0.0`, `@nestjs/testing@^11.0.0` (devDep)
       - `@nestjs/cli@^11.0.0`, `@nestjs/schematics@^11.0.0` (devDep)
    2) Añadir deps de auth (todas en `dependencies`):
       `@nestjs/jwt@^11.0.2`, `@nestjs/passport@^11.0.5`, `passport@^0.7.0`, `passport-jwt@^4.0.1`,
       `argon2@^0.44.0`, `cookie-parser@^1.4.7`, `nestjs-zod@^4.3.1`, `@nestjs/mongoose@^11.0.4`,
       `mongoose@^9.5.0`.
       En `devDependencies`: `@types/passport-jwt@^4.0.0`, `@types/cookie-parser@^1.4.7`,
       `mongodb-memory-server@^11.0.1`.
    3) Ejecutar `pnpm install` desde la raíz para regenerar `pnpm-lock.yaml`.
    4) Crear `apps/backend/jest.e2e.config.ts` (referenciado por `package.json` script `test:e2e` pero
       inexistente):
       ```ts
       import type { Config } from 'jest';
       const config: Config = {
         rootDir: '.',
         testRegex: '.*\\.e2e-spec\\.ts$',
         transform: { '^.+\\.(t|j)s$': 'ts-jest' },
         moduleFileExtensions: ['ts', 'js', 'json'],
         testEnvironment: 'node',
         setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
         testTimeout: 30000,
       };
       export default config;
       ```
    5) Crear `apps/backend/test/setup-e2e.ts` con bootstrap de `mongodb-memory-server`:
       ```ts
       import { MongoMemoryServer } from 'mongodb-memory-server';
       let mongo: MongoMemoryServer;
       beforeAll(async () => {
         mongo = await MongoMemoryServer.create();
         process.env.MONGO_URI = mongo.getUri();
         process.env.JWT_ACCESS_SECRET = 'test-secret-32-chars-minimum-aaaa';
         process.env.NODE_ENV = 'test';
       });
       afterAll(async () => { await mongo?.stop(); });
       ```
    6) Crear stubs e2e (un `describe.skip` placeholder por suite — el siguiente task los llena):
       - `apps/backend/test/auth/login.e2e-spec.ts` — `describe.skip('AUTH-01 login', () => { it('TODO', ()=>{}) })`
       - `apps/backend/test/auth/refresh.e2e-spec.ts` — AUTH-02
       - `apps/backend/test/auth/logout.e2e-spec.ts` — AUTH-03
       - `apps/backend/test/common/guards.e2e-spec.ts` — AUTH-04
    7) Añadir a `.env.example` las claves nuevas (sin valores reales):
       ```
       JWT_ACCESS_SECRET=change-me-min-32-chars
       SEED_USER_EMAIL=admin@lexscribe.local
       SEED_USER_PASSWORD=change-me-min-12-chars
       ```
    8) Ajustar `apps/backend/src/main.ts` para registrar `cookie-parser` global ANTES de cualquier
       guard: `app.use(cookieParser());`. Importar `import cookieParser from 'cookie-parser';`.
    9) Verificar que `pnpm --filter backend build` y `pnpm --filter backend test` siguen verdes
       después del bump (ningún breaking change real entre Nest 10 y 11 para el código existente —
       Pino+Terminus ya soportan v11).
  </action>
  <verify>
    <automated>pnpm install --frozen-lockfile=false &amp;&amp; pnpm --filter backend build &amp;&amp; pnpm --filter backend test &amp;&amp; pnpm --filter backend test:e2e</automated>
  </verify>
  <acceptance_criteria>
    - `grep -E '"@nestjs/common":\s*"\^11' apps/backend/package.json` matches.
    - `grep -E '"argon2"' apps/backend/package.json` matches.
    - `grep -E '"@nestjs/jwt"' apps/backend/package.json` matches.
    - `grep -E '"mongodb-memory-server"' apps/backend/package.json` matches.
    - `test -f apps/backend/jest.e2e.config.ts` exits 0.
    - `test -f apps/backend/test/setup-e2e.ts` exits 0.
    - `grep -q "MongoMemoryServer" apps/backend/test/setup-e2e.ts` exits 0.
    - `grep -q "cookieParser" apps/backend/src/main.ts` exits 0.
    - `grep -q "JWT_ACCESS_SECRET" .env.example` exits 0.
    - `pnpm --filter backend test:e2e` runs without import errors (suites skipped is OK).
  </acceptance_criteria>
  <done>
    Backend en NestJS 11 con todas las deps auth instaladas; `pnpm --filter backend test:e2e` arranca, crea Mongo en memoria y cierra limpio aunque las suites estén skip.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Modelo `usuarios`, AuthModule completo (login/refresh/logout) + JwtStrategy + @CurrentUser</name>
  <files>
    apps/backend/src/modules/usuarios/usuarios.module.ts,
    apps/backend/src/modules/usuarios/usuarios.service.ts,
    apps/backend/src/modules/usuarios/usuarios.repository.ts,
    apps/backend/src/modules/usuarios/schemas/usuario.schema.ts,
    apps/backend/src/modules/auth/auth.module.ts,
    apps/backend/src/modules/auth/auth.controller.ts,
    apps/backend/src/modules/auth/auth.service.ts,
    apps/backend/src/modules/auth/strategies/jwt.strategy.ts,
    apps/backend/src/modules/auth/guards/jwt-auth.guard.ts,
    apps/backend/src/modules/auth/dto/login.dto.ts,
    apps/backend/src/common/decorators/current-user.decorator.ts,
    apps/backend/src/common/types/jwt-payload.ts,
    apps/backend/src/app.module.ts,
    packages/shared-validation/src/auth.ts,
    packages/shared-validation/src/index.ts,
    apps/backend/test/auth/login.e2e-spec.ts,
    apps/backend/test/auth/refresh.e2e-spec.ts,
    apps/backend/test/auth/logout.e2e-spec.ts,
    apps/backend/test/common/guards.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 1–2, §Code Examples 1, §Pitfalls 1),
    docs/ARQUITECTURA.md §9 (auth) + §14 (idioma API),
    docs/DATOS.md §4.9 (usuarios) y §2.5 (auditoría mínima),
    apps/backend/src/app.module.ts (registrar MongooseModule + AuthModule),
    packages/shared-validation/src/index.ts (extender export),
    apps/backend/test/setup-e2e.ts
  </read_first>
  <scope_note>
    Esta tarea modifica **19 archivos** (alto para un único task), pero es **internamente cohesiva**: un solo bounded context (auth) cuyo split rompería la atomicidad de los tests e2e (cualquier subset deja la suite roja). El executor DEBE commitear por sub-step para que el PR sea revisable, en este orden:

    1. `commit 1` — `packages/shared-validation/src/auth.ts` + `index.ts` (LoginSchema)
    2. `commit 2` — `common/types/jwt-payload.ts` + `common/decorators/current-user.decorator.ts`
    3. `commit 3` — `usuarios/schemas/usuario.schema.ts` + `usuarios/usuarios.repository.ts` + `usuarios.service.ts` + `usuarios.module.ts`
    4. `commit 4` — `auth/strategies/jwt.strategy.ts` + `auth/guards/jwt-auth.guard.ts` + `auth/dto/login.dto.ts`
    5. `commit 5` — `auth/auth.service.ts` (login/refresh/logout + reuse detection + cookie helpers)
    6. `commit 6` — `auth/auth.controller.ts` + `auth/auth.module.ts` + `app.module.ts` (wiring)
    7. `commit 7` — las 4 suites e2e (`auth/{login,refresh,logout}.e2e-spec.ts` + `common/guards.e2e-spec.ts`) — quitar `.skip`

    El SUMMARY de este plan debe registrar este orden de commits para futuros revisores.
  </scope_note>
  <behavior>
    - Test login.e2e:
      · Seed user (argon2 hash de 'P@ssw0rd1234') → POST /api/v1/auth/login con creds correctas → 200 + body `{accessToken, expiresIn:900, user:{id,email,nombre}}` + Set-Cookie con flags HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth, Max-Age=604800.
      · Creds inválidas → 401 con body `{code:'UNAUTHORIZED', message:'Invalid credentials'}` (mismo mensaje para "user not found" y "wrong password" — timing safe).
      · Body con campo extra `usuarioId` → 400 (Zod .strict()).
    - Test refresh.e2e:
      · Login → extraer cookie → POST /auth/refresh con cookie → 200 + nueva cookie distinta + nuevo accessToken.
      · Reusar la cookie original (ya rotada) → 401 + `usuarios[].refreshTokens` queda vacío (reuse detection).
    - Test logout.e2e:
      · Login → POST /auth/logout con cookie → 204 + Clear-Cookie. El refreshTokens del usuario decrementa en 1.
    - Test guards.e2e:
      · GET /api/v1/usuarios/me sin Bearer → 401.
      · Con Bearer válido → 200 con `{id, email}` (extraído del JWT, no del body).
      · Con Bearer y body `{usuarioId: 'malicioso'}` en un POST de prueba (endpoint de test bajo `@UseGuards(JwtAuthGuard)`) → request.user.id se mantiene del JWT, no se sobreescribe.
  </behavior>
  <action>
    1) `packages/shared-validation/src/auth.ts`: exportar `LoginSchema = z.object({email:z.string().email(), password:z.string().min(8).max(128)}).strict()` y `LoginInput = z.infer<typeof LoginSchema>`. Re-exportar desde `index.ts`.
    2) `apps/backend/src/common/types/jwt-payload.ts`: `export interface JwtPayload { sub: string; email: string; iat?: number; exp?: number; }`.
    3) `apps/backend/src/common/decorators/current-user.decorator.ts`:
       ```ts
       export const CurrentUser = createParamDecorator(
         (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
           const req = ctx.switchToHttp().getRequest();
           return data ? req.user?.[data] : req.user;
         },
       );
       export type JwtUser = { id: string; email: string };
       ```
    4) `usuarios/schemas/usuario.schema.ts`: Mongoose `@Schema({timestamps:{createdAt:'fechaCreacion', updatedAt:'fechaActualizacion'}})` con campos `email` (unique index), `nombre`, `rol` (default `'admin'`), `passwordHash`, `refreshTokens` (sub-array `[{tokenHash, expiresAt, createdAt, ip, userAgent}]`). NO aplicar soft-delete plugin aquí (auth es transversal — además, plugin se introduce en plan 02-02; este schema vivirá sin él en plan 01).
    5) `usuarios/usuarios.repository.ts`: métodos:
       - `findByEmail(email): Promise<UsuarioDoc | null>` — `findOne({email})`, sin filtro `activo` (no aplicado aún).
       - `findById(id): Promise<UsuarioDoc | null>`.
       - `create({email, nombre, rol, passwordHash})`.
       - `pushRefreshToken(userId, {tokenHash, expiresAt, ip, userAgent})` → `$push`.
       - `rotateRefreshToken(userId, oldTokenHash, newToken)` → `findOneAndUpdate` con `$pull` + `$push` atómico filtrando `refreshTokens.tokenHash: oldTokenHash`. Si devuelve `null` → reuse o ya rotado.
       - `clearAllRefreshTokens(userId)` → `$set: {refreshTokens: []}`.
       - `pullRefreshToken(userId, tokenHash)` (logout específico).
    6) `auth/dto/login.dto.ts`: `export class LoginDto extends createZodDto(LoginSchema) {}` (importar `LoginSchema` del shared-validation).
    7) `auth/strategies/jwt.strategy.ts`: ver §Pattern 2 RESEARCH. Secret `JWT_ACCESS_SECRET` via `ConfigService.getOrThrow`. `validate(payload)` retorna `{id: payload.sub, email: payload.email}`.
    8) `auth/guards/jwt-auth.guard.ts`: `export class JwtAuthGuard extends AuthGuard('jwt') {}`.
    9) `auth/auth.service.ts`: implementar `login(dto, ip, ua)` (ver §Code Examples 1), `refresh(plainToken, ip, ua)` con rotación atómica e iteración de `argon2.verify` sobre `refreshTokens[]` para encontrar match (ver §Pitfall 1 — usar `findOneAndUpdate` con condición sobre `tokenHash` exacto), y `logout(plainToken)`.
       - **Reuse detection:** si en refresh no encuentra el hash en ningún token activo del usuario PERO el plain token decodificable apunta a un usuario válido, llamar `clearAllRefreshTokens` y devolver `UnauthorizedError('Invalid refresh token')`.
       - **Cookie helpers:** método `setRefreshCookie(res, plain)` con `res.cookie('refresh_token', plain, {httpOnly:true, secure:process.env.NODE_ENV!=='test', sameSite:'strict', path:'/api/v1/auth', maxAge:604800000})`. En tests, `secure:false` para que supertest reciba la cookie.
       - Mensajes en inglés.
    10) `auth/auth.controller.ts`:
        - `@Post('login')` `login(@Body() dto: LoginDto, @Req() req, @Res({passthrough:true}) res)`.
        - `@Post('refresh')` lee `req.cookies['refresh_token']`.
        - `@Post('logout')` `@HttpCode(204)` lee cookie, llama service, `res.clearCookie('refresh_token', {path:'/api/v1/auth'})`.
        - Base path: el módulo se registra con prefix global `/api/v1` en `main.ts` (verificar que existe `app.setGlobalPrefix('api/v1')`); sumado al `@Controller('auth')` resulta en `/api/v1/auth/*`.
    11) `auth/auth.module.ts`: registra `JwtModule.registerAsync` con secret de config y `signOptions:{expiresIn:'15m'}`. Importa `PassportModule.register({defaultStrategy:'jwt'})` y `UsuariosModule`. Provee `AuthService`, `JwtStrategy`, `JwtAuthGuard`.
    12) `app.module.ts`: importar `MongooseModule.forRootAsync` (URI `MONGO_URI`), `AuthModule`, `UsuariosModule`. Mantener `HealthModule` y logger Pino.
    13) Endpoint dummy protegido para tests `usuarios/me`: añadir en `UsuariosController` (crear si no existe) un `@UseGuards(JwtAuthGuard) @Get('me') me(@CurrentUser() u) { return u; }` ruta `/api/v1/usuarios/me`.
    14) Implementar las 4 suites e2e (quitar `.skip`) según `<behavior>` usando `supertest(app.getHttpServer())`. Helper `loginAndExtractCookie(server, email, password)` en `setup-e2e.ts` o local al test.
  </action>
  <verify>
    <automated>pnpm --filter backend test &amp;&amp; pnpm --filter backend test:e2e -- auth login refresh logout guards</automated>
  </verify>
  <acceptance_criteria>
    - `grep -RIn "argon2.verify" apps/backend/src/modules/auth/auth.service.ts` matches.
    - `grep -RIn "PassportStrategy" apps/backend/src/modules/auth/strategies/jwt.strategy.ts` matches.
    - `grep -RIn "@CurrentUser" apps/backend/src/common/decorators/current-user.decorator.ts` matches `createParamDecorator`.
    - `grep -RIn "Path=/api/v1/auth" apps/backend/src/modules/auth/auth.service.ts` (or controller) matches.
    - `grep -RIn "sameSite.*strict" apps/backend/src/modules/auth/auth.service.ts` matches (case-insensitive: -i).
    - `grep -RIn "\.strict()" packages/shared-validation/src/auth.ts` matches.
    - `pnpm --filter backend test:e2e` shows the four describe blocks (`AUTH-01 login`, `AUTH-02 refresh`, `AUTH-03 logout`, `AUTH-04 guards`) all green.
    - Reuse detection test passes: a second `/auth/refresh` with a rotated cookie returns 401 AND `refreshTokens.length === 0` after the call.
  </acceptance_criteria>
  <done>
    AUTH-01..04 verificables vía e2e. Login, refresh con rotación, logout y guards funcionan; cookie con flags correctos; `usuarioId` solo viene del JWT.
  </done>
</task>

<task type="auto">
  <name>Task 3: Frontend Next.js — formulario login/logout mínimo + middleware redirect</name>
  <files>
    apps/frontend/app/(auth)/login/page.tsx,
    apps/frontend/lib/api/auth.ts,
    apps/frontend/lib/auth/session.ts,
    apps/frontend/middleware.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Open Questions Q3),
    docs/ARQUITECTURA.md §4.1 (estructura frontend),
    apps/frontend/app/layout.tsx (para no romper),
    packages/shared-validation/src/auth.ts (LoginSchema)
  </read_first>
  <action>
    1) `apps/frontend/lib/api/auth.ts`: cliente HTTP tipado.
       ```ts
       const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
       export async function login(email: string, password: string) {
         const res = await fetch(`${API}/auth/login`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           credentials: 'include', // refresh cookie
           body: JSON.stringify({ email, password }),
         });
         if (!res.ok) throw new Error((await res.json()).message ?? 'Login failed');
         return res.json() as Promise<{ accessToken: string; expiresIn: number; user: {id:string;email:string;nombre:string} }>;
       }
       export async function logout() {
         await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
       }
       export async function refresh() {
         const res = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
         if (!res.ok) return null;
         return res.json() as Promise<{ accessToken: string; expiresIn: number }>;
       }
       ```
    2) `apps/frontend/lib/auth/session.ts`: estado en memoria del accessToken (NO localStorage por XSS — Arquitectura §9.1).
       ```ts
       'use client';
       let accessToken: string | null = null;
       export const session = {
         get: () => accessToken,
         set: (t: string | null) => { accessToken = t; },
       };
       ```
       Nota: persistencia entre recargas se delega a refresh cookie + llamada a `/auth/refresh` en montaje del layout protegido (se afina en fases siguientes; aquí basta con la sesión efímera).
    3) `apps/frontend/app/(auth)/login/page.tsx`: client component minimal.
       - Form con dos `<input>` (email, password) y un botón "Iniciar sesión".
       - Validar con `LoginSchema` de `@lexscribe/shared-validation` (parse en submit; errores en español traducidos en cliente).
       - On submit: `await login(email, password)`, `session.set(res.accessToken)`, `router.push('/')`.
       - Botón "Cerrar sesión" SOLO si `session.get()` existe (componente extra), llama `logout()` y redirige a `/login`.
       - Texto UI en español: "Correo electrónico", "Contraseña", "Iniciar sesión", "Credenciales inválidas".
       - Estilos: usar las clases Tailwind ya disponibles (sin shadcn aún — minimal).
    4) `apps/frontend/middleware.ts`: redirección server-side básica:
       ```ts
       import { NextResponse, type NextRequest } from 'next/server';
       export function middleware(req: NextRequest) {
         const isAuth = req.cookies.get('refresh_token');
         if (!isAuth && !req.nextUrl.pathname.startsWith('/login')) {
           return NextResponse.redirect(new URL('/login', req.url));
         }
         return NextResponse.next();
       }
       export const config = { matcher: ['/((?!_next|api|favicon|login).*)'] };
       ```
       (Heurística: la presencia de la cookie refresh_token = "podría tener sesión". El backend valida; el middleware solo da UX.)
    5) Extender `apps/frontend/.env.example` con `NEXT_PUBLIC_API_URL=/api/v1` si no existe.
  </action>
  <verify>
    <automated>pnpm --filter frontend build &amp;&amp; pnpm --filter frontend test</automated>
  </verify>
  <acceptance_criteria>
    - `test -f "apps/frontend/app/(auth)/login/page.tsx"` exits 0.
    - `grep -q "credentials: 'include'" apps/frontend/lib/api/auth.ts` exits 0.
    - `grep -q "LoginSchema" "apps/frontend/app/(auth)/login/page.tsx"` exits 0.
    - `grep -q "refresh_token" apps/frontend/middleware.ts` exits 0.
    - `pnpm --filter frontend build` succeeds.
  </acceptance_criteria>
  <done>
    Página `/login` con formulario funcional; al submit con creds del seed (Plan 02-04) loguea, guarda accessToken en memoria y redirige. Logout limpia. Middleware redirige no-auth → `/login`.
  </done>
</task>

</tasks>

<verification>
1. `pnpm --filter backend test:e2e` → 4 suites verdes (login, refresh, logout, guards).
2. Manual smoke (post Plan 02-04): `pnpm seed && pnpm dev`, navegar a `https://localhost/login`, credenciales del seed → redirige a `/`. DevTools → cookie `refresh_token` con HttpOnly + Secure + SameSite=Strict + Path=/api/v1/auth.
3. `grep -R "usuarioId" apps/backend/src/modules/*/dto/ 2>/dev/null` debe estar VACÍO (ningún DTO acepta usuarioId del body).
</verification>

<success_criteria>
- AUTH-01: login devuelve accessToken (15 min) + cookie refresh (7 d).
- AUTH-02: refresh rota cookie; reuse detection invalida todos los tokens.
- AUTH-03: logout server-side limpia el refresh.
- AUTH-04: endpoint protegido sin Bearer = 401; con Bearer inyecta usuarioId via `@CurrentUser`; body con `usuarioId` rechazado por Zod `.strict()`.
- Toda la suite backend (`pnpm --filter backend test && test:e2e`) en verde.
</success_criteria>

<output>
After completion, create `.planning/phases/02-auth-y-bases-transversales/02-01-SUMMARY.md`.

**SUMMARY MUST include the following note verbatim under "Implementation notes":**
> "Task 2 modifies 19 files but is internally cohesive (one bounded context: auth). Executor committed by sub-step (schema → strategy → service → controller → tests) for reviewability. See `<scope_note>` in plan for the 7-commit order."
</output>
