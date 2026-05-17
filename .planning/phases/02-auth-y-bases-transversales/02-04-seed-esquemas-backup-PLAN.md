---
phase: 02-auth-y-bases-transversales
plan: 04
type: execute
wave: 3
depends_on: ["02-01", "02-02"]
files_modified:
  - apps/backend/package.json
  - apps/backend/scripts/seed.ts
  - apps/backend/src/modules/esquemas/esquemas.module.ts
  - apps/backend/src/modules/esquemas/esquemas.controller.ts
  - apps/backend/src/modules/esquemas/esquemas.service.ts
  - apps/backend/src/modules/esquemas/esquemas.repository.ts
  - apps/backend/src/modules/esquemas/schemas/esquema.schema.ts
  - apps/backend/src/modules/esquemas/dto/add-parametro.dto.ts
  - apps/backend/src/modules/esquemas/dto/tipo-objeto.ts
  - apps/backend/src/modules/usuarios/usuarios.repository.ts
  - apps/backend/src/app.module.ts
  - packages/shared-validation/src/esquemas.ts
  - packages/shared-validation/src/index.ts
  - apps/backend/test/scripts/seed.e2e-spec.ts
  - apps/backend/test/esquemas/esquemas.e2e-spec.ts
  - infra/scripts/backup-daily.sh
  - infra/scripts/rclone.conf.example
  - infra/scripts/README.md
  - .env.example
  - package.json
autonomous: true
requirements:
  - INF-06
  - AUTH-05
  - AUTH-08

must_haves:
  truths:
    - "`pnpm seed` ejecutado contra Mongo limpia crea 1 usuario (desde SEED_USER_*) y 2 esquemas vacíos (`expediente`, `contacto`)"
    - "`pnpm seed` ejecutado por segunda vez NO duplica nada y NO sobrescribe la password del usuario; exit 0"
    - "GET /api/v1/esquemas/expediente devuelve `{tipoObjeto:'expediente', parametros: []}` tras seed (autenticado)"
    - "POST /api/v1/esquemas/expediente/parametros con `{nombre:'honorariosBase', tipoDato:'numero'}` añade el parámetro; segunda llamada idéntica es idempotente"
    - "POST con `tipoObjeto` distinto de `expediente`/`contacto` → 400 (Zod enum)"
    - "POST con mismo nombre y `tipoDato` distinto → 409 ConflictError"
    - "DELETE /api/v1/esquemas/:tipoObjeto/parametros/:nombre → 501 Not Implemented (post-MVP F-095)"
    - "`infra/scripts/backup-daily.sh --dry-run` ejecuta sin error y muestra los pasos sin tocar Drive"
    - "Existe `infra/scripts/rclone.conf.example` (sin secretos) y `infra/scripts/README.md` con procedimiento de instalación cron en NAS"
    - "Tras `POST /api/v1/esquemas/expediente/parametros` (autenticado) existe en la colección `auditoria` un documento con `accion='create'`, `recurso='esquema'` (cierre del bucle interceptor → write)"
  artifacts:
    - path: "apps/backend/scripts/seed.ts"
      provides: "Idempotent seed (NestFactory.createApplicationContext)"
    - path: "apps/backend/src/modules/esquemas/esquemas.controller.ts"
      provides: "GET/POST/DELETE /esquemas/:tipoObjeto"
      exports: ["EsquemasController"]
    - path: "apps/backend/src/modules/esquemas/schemas/esquema.schema.ts"
      provides: "Mongoose schema con índice único {usuarioId,tipoObjeto}"
      contains: "unique: true"
    - path: "infra/scripts/backup-daily.sh"
      provides: "Bash script de backup MinIO+Mongo→Drive con retención"
      contains: "rclone"
    - path: "package.json"
      provides: "Script root `pnpm seed`"
      contains: "\"seed\""
  key_links:
    - from: "apps/backend/scripts/seed.ts"
      to: "esquemas.repository.upsertEmpty + usuarios.repository.create"
      via: "findOneAndUpdate upsert + argon2.hash"
      pattern: "upsert: true"
    - from: "apps/backend/src/modules/esquemas/esquemas.service.ts"
      to: "EsquemaModel.findOneAndUpdate $addToSet"
      via: "atomic add-parametro"
      pattern: "\\$addToSet"
    - from: "infra/scripts/backup-daily.sh"
      to: "rclone copy gdrive:lexscribe-backup"
      via: "cron del NAS"
      pattern: "rclone (copy|sync)"
---

<objective>
Cerrar Phase 2 con los tres entregables restantes:
1. **Seed idempotente** (`pnpm seed`) que crea usuario + 2 esquemas vacíos — AUTH-05.
2. **Módulo `esquemas`** con CRUD por `tipoObjeto` (`GET`/`POST`/`DELETE`) — AUTH-08.
3. **Backup diario rclone** (script + cron + procedimiento) — INF-06.

Purpose: Tras este plan, la fase 2 está completa: hay usuario default, esquema dinámico operativo (sobre el que las fases 3+ añadirán parámetros), y los datos están respaldados a Google Drive automáticamente.
Output: `pnpm seed` operativo, endpoints `/esquemas/:tipoObjeto` verificados por e2e, script de backup ejecutable en NAS con instrucciones de instalación cron.
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
@.planning/phases/02-auth-y-bases-transversales/02-02-SUMMARY.md
@apps/backend/src/app.module.ts
@apps/backend/src/modules/usuarios/usuarios.repository.ts
@infra/docker-compose.yml
@.env.example

<interfaces>
<!-- Contratos -->

TipoObjeto enum (este plan crea):
```typescript
export const TIPO_OBJETO = ['expediente', 'contacto'] as const;
export type TipoObjeto = (typeof TIPO_OBJETO)[number];
export const TipoObjetoSchema = z.enum(TIPO_OBJETO);
```

Esquema schema (Mongoose):
```typescript
{
  _id, usuarioId: ObjectId, tipoObjeto: 'expediente'|'contacto',
  parametros: [{ nombre: string, tipoDato: 'texto'|'numero'|'fecha'|'booleano', obligatorio: boolean, fechaCreacion: Date }],
  fechaCreacion: Date, fechaActualizacion: Date,
}
// Index unique: { usuarioId: 1, tipoObjeto: 1 }
// NO soft-delete (Datos §4.8)
```

AddParametro Zod (shared-validation):
```typescript
export const NombreParametroSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);
export const TipoDatoSchema = z.enum(['texto','numero','fecha','booleano']);
export const AddParametroSchema = z.object({
  nombre: NombreParametroSchema,
  tipoDato: TipoDatoSchema.default('texto'),
  obligatorio: z.boolean().default(false),
}).strict();
```

Endpoints (autenticados con JwtAuthGuard, `usuarioId` desde `@CurrentUser`):
- `GET /api/v1/esquemas/:tipoObjeto` → 200 `{tipoObjeto, parametros: []}` (404 si no existe — pero el seed garantiza existencia para los 2 tipos)
- `POST /api/v1/esquemas/:tipoObjeto/parametros` body AddParametro → 200/201 esquema actualizado; 409 si nombre existe con tipoDato distinto
- `DELETE /api/v1/esquemas/:tipoObjeto/parametros/:nombre` → 501 Not Implemented (post-MVP F-095)

Seed contract:
- Lee `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` (throw si faltan).
- Crea usuario si no existe (argon2id `m=19456,t=2,p=1`).
- Si existe → loggea "skipped", NO sobrescribe password.
- Para cada `tipoObjeto` ∈ `['expediente','contacto']`: `findOneAndUpdate({usuarioId, tipoObjeto}, {$setOnInsert: {parametros: [], fechaCreacion: new Date()}}, {upsert: true, new: true})`.
- Exit 0 al terminar.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Módulo `esquemas` (schema + service idempotente + controller + e2e)</name>
  <files>
    apps/backend/src/modules/esquemas/esquemas.module.ts,
    apps/backend/src/modules/esquemas/esquemas.controller.ts,
    apps/backend/src/modules/esquemas/esquemas.service.ts,
    apps/backend/src/modules/esquemas/esquemas.repository.ts,
    apps/backend/src/modules/esquemas/schemas/esquema.schema.ts,
    apps/backend/src/modules/esquemas/dto/add-parametro.dto.ts,
    apps/backend/src/modules/esquemas/dto/tipo-objeto.ts,
    apps/backend/src/app.module.ts,
    packages/shared-validation/src/esquemas.ts,
    packages/shared-validation/src/index.ts,
    apps/backend/test/esquemas/esquemas.e2e-spec.ts
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 7 + §Code Examples 3 + §Pitfall 8),
    docs/DATOS.md §4.8 (`esquemas`),
    docs/ARQUITECTURA.md §6.2 (endpoints `/esquemas/:tipoObjeto`),
    apps/backend/src/modules/auth/auth.module.ts (patrón módulo),
    apps/backend/src/common/errors/index.ts (errores tipados creados en 02-02)
  </read_first>
  <action>
    1) `packages/shared-validation/src/esquemas.ts`: definir `TIPO_OBJETO`, `TipoObjetoSchema`, `NombreParametroSchema`, `TipoDatoSchema`, `AddParametroSchema`. Re-exportar desde `index.ts`.
    2) `esquemas/dto/tipo-objeto.ts`: re-exportar el enum y tipo. Usado por el ParamPipe.
    3) `esquemas/dto/add-parametro.dto.ts`: `class AddParametroDto extends createZodDto(AddParametroSchema) {}`.
    4) `esquemas/schemas/esquema.schema.ts`:
       ```ts
       @Schema({ collection: 'esquemas', timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' } })
       export class Esquema {
         @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true }) usuarioId: Types.ObjectId;
         @Prop({ required: true, enum: ['expediente','contacto'] }) tipoObjeto: TipoObjeto;
         @Prop({ type: [{ nombre: String, tipoDato: { type: String, enum: ['texto','numero','fecha','booleano'], default: 'texto' }, obligatorio: { type: Boolean, default: false }, fechaCreacion: { type: Date, default: Date.now } }], default: [] }) parametros: any[];
       }
       export const EsquemaSchema = SchemaFactory.createForClass(Esquema);
       EsquemaSchema.index({ usuarioId: 1, tipoObjeto: 1 }, { unique: true });
       // NO softDeletePlugin (Datos §4.8 — esquemas inmutables a soft-delete)
       ```
    5) `esquemas/esquemas.repository.ts`: métodos:
       - `findByUsuarioAndTipo(usuarioId, tipoObjeto)`.
       - `upsertEmpty(usuarioId, tipoObjeto)` → `findOneAndUpdate({usuarioId, tipoObjeto}, {$setOnInsert: {parametros: []}}, {upsert: true, new: true, setDefaultsOnInsert: true})`.
       - `addParametro(usuarioId, tipoObjeto, dto)` siguiendo §Code Examples 3 RESEARCH (atomic con guarda `$ne`).
    6) `esquemas/esquemas.service.ts`:
       - `getByTipo(usuarioId, tipoObjeto)` → si no encuentra, throw `NotFoundError('esquema', tipoObjeto)`.
       - `addParametro(usuarioId, tipoObjeto, dto)` → llama repo; si retorna `null` Y existe el esquema, comprueba si el `nombre` ya existe con otro `tipoDato` → throw `ConflictError(\`Parameter ${nombre} already exists with different tipoDato\`)` (mensaje en inglés, coherente con §14 ARQUITECTURA y con el shape de DomainError de 02-02). Si existe con mismo `tipoDato` → idempotente, retorna el esquema actual (200).
       - `deleteParametro(usuarioId, tipoObjeto, nombre)` → throw `new NotImplementedError('Not Implemented (post-MVP F-095)')`. Crear `NotImplementedError extends DomainError {code='NOT_IMPLEMENTED', httpStatus=501}` en `common/errors/not-implemented.error.ts` y exportar desde `errors/index.ts`.
    7) `esquemas/esquemas.controller.ts`:
       ```ts
       @UseGuards(JwtAuthGuard)
       @Controller('esquemas')
       export class EsquemasController {
         @Get(':tipoObjeto')
         get(@Param('tipoObjeto') tipo: string, @CurrentUser('id') uid: string) {
           const validated = TipoObjetoSchema.parse(tipo); // throws ZodError → handle
           return this.service.getByTipo(uid, validated);
         }
         @Post(':tipoObjeto/parametros')
         add(@Param('tipoObjeto') tipo: string, @Body() dto: AddParametroDto, @CurrentUser('id') uid) {...}
         @Delete(':tipoObjeto/parametros/:nombre')
         delete(...) { return this.service.deleteParametro(...); } // → 501
       }
       ```
       **Pin (decisión cerrada):** Validar `tipoObjeto` con `TipoObjetoSchema.parse()` **dentro del handler** y traducir `ZodError` capturado a `ValidationError` del módulo `common/errors` (so que el `DomainExceptionFilter` global de 02-02 lo mapee a 400 con `{code:'VALIDATION', message}`). NO confiar en que el filter de `nestjs-zod` capture ZodError fuera de DTOs.
    8) `esquemas/esquemas.module.ts`: registra MongooseModule.forFeature, controller, service, repository. Exporta `EsquemasService` y `EsquemasRepository` (el seed los consume).
    9) `app.module.ts`: importar `EsquemasModule`.
    10) Aplicar `@Audited('esquema', 'create')` al método `addParametro` del controller (para registrar adiciones en auditoría usando el interceptor del Plan 02-03). Importar `AuditInterceptor` y `@UseInterceptors(AuditInterceptor)` a nivel controller.
    11) `test/esquemas/esquemas.e2e-spec.ts`: helper login + bearer; tests:
        - GET tras seed manual del esquema (preparar en `beforeAll`) → 200 + `{tipoObjeto:'expediente', parametros:[]}`.
        - POST `{nombre:'honorariosBase', tipoDato:'numero'}` → 200 + parametros.length === 1.
        - **Cierre del bucle de auditoría:** tras el POST anterior, esperar a que `setImmediate` complete (`await new Promise(r => setImmediate(r))` o pequeño `setTimeout`) y consultar la colección `auditoria` directamente (vía `app.get(getModelToken('Auditoria'))` o conexión mongoose nativa). Asertar:
          ```ts
          const auditDoc = await AuditoriaModel.findOne({ recurso: 'esquema' }).sort({ timestamp: -1 });
          expect(auditDoc).toBeTruthy();
          expect(auditDoc.accion).toBe('create');
          expect(auditDoc.recurso).toBe('esquema');
          ```
        - POST mismo body → idempotente, parametros.length sigue siendo 1.
        - POST `{nombre:'honorariosBase', tipoDato:'texto'}` (mismo nombre, tipo distinto) → 409 + `code: 'CONFLICT'` + `message` matching `/already exists with different tipoDato/`.
        - GET `/esquemas/factura` (no en enum) → 400 + `code:'VALIDATION'`.
        - DELETE `/esquemas/expediente/parametros/honorariosBase` → 501 + `code:'NOT_IMPLEMENTED'`.
        - Sin Bearer → 401.
  </action>
  <verify>
    <automated>pnpm --filter backend test:e2e -- esquemas</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "TipoObjeto" packages/shared-validation/src/esquemas.ts` exits 0.
    - `grep -q "z.enum" packages/shared-validation/src/esquemas.ts` exits 0.
    - `grep -q "unique: true" apps/backend/src/modules/esquemas/schemas/esquema.schema.ts` exits 0.
    - `grep -q "\\$addToSet" apps/backend/src/modules/esquemas/esquemas.repository.ts` exits 0.
    - `grep -q "JwtAuthGuard" apps/backend/src/modules/esquemas/esquemas.controller.ts` exits 0.
    - `grep -q "501" apps/backend/src/common/errors/not-implemented.error.ts` exits 0.
    - `grep -q "TipoObjetoSchema.parse" apps/backend/src/modules/esquemas/esquemas.controller.ts` exits 0.
    - `grep -q "ValidationError" apps/backend/src/modules/esquemas/esquemas.controller.ts` exits 0 (traducción ZodError → DomainError).
    - `grep -q "already exists with different tipoDato" apps/backend/src/modules/esquemas/esquemas.service.ts` exits 0 (mensaje en inglés).
    - `! grep -q "ya existe con tipoDato" apps/backend/src/modules/esquemas/esquemas.service.ts` (mensaje español NO debe quedar).
    - `grep -RIn "softDeletePlugin" apps/backend/src/modules/esquemas/` returns NO matches.
    - `apps/backend/test/esquemas/esquemas.e2e-spec.ts` contains `expect(auditDoc.accion).toBe('create')` (literal grep).
    - `pnpm --filter backend test:e2e -- esquemas` shows 8+ passing tests, 0 failures.
  </acceptance_criteria>
  <done>
    AUTH-08 cumplido. CRUD operativo con idempotencia (`$addToSet`), validación enum vía `TipoObjetoSchema.parse`, errores tipados (404/400/409/501), bucle de auditoría cerrado y verificado e2e.
  </done>
</task>

<task type="auto">
  <name>Task 2: Seed idempotente + script `pnpm seed` + e2e</name>
  <files>
    apps/backend/scripts/seed.ts,
    apps/backend/package.json,
    package.json,
    apps/backend/src/modules/usuarios/usuarios.repository.ts,
    apps/backend/test/scripts/seed.e2e-spec.ts,
    .env.example
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 8 + §Pitfall 5 + §Pitfall 8),
    apps/backend/src/app.module.ts,
    apps/backend/src/modules/usuarios/usuarios.repository.ts,
    apps/backend/src/modules/esquemas/esquemas.repository.ts (creado en Task 1)
  </read_first>
  <action>
    1) Asegurar que `UsuariosRepository.findByEmail` existe (creado en 02-01) y añadir si falta `create({email, nombre, rol, passwordHash})` que retorna el doc.
    2) `apps/backend/scripts/seed.ts`:
       ```ts
       import { NestFactory } from '@nestjs/core';
       import { Logger } from '@nestjs/common';
       import * as argon2 from 'argon2';
       import { AppModule } from '../src/app.module';
       import { UsuariosRepository } from '../src/modules/usuarios/usuarios.repository';
       import { EsquemasRepository } from '../src/modules/esquemas/esquemas.repository';

       async function bootstrap() {
         const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log','error','warn'] });
         const log = new Logger('seed');
         const email = process.env.SEED_USER_EMAIL;
         const password = process.env.SEED_USER_PASSWORD;
         if (!email || !password) { log.error('SEED_USER_EMAIL and SEED_USER_PASSWORD are required'); process.exit(1); }

         const usuarios = app.get(UsuariosRepository);
         const esquemas = app.get(EsquemasRepository);

         let user = await usuarios.findByEmail(email);
         if (!user) {
           const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
           user = await usuarios.create({ email, nombre: 'Admin', rol: 'admin', passwordHash });
           log.log(`Created seed user ${email}`);
         } else {
           log.log(`Seed user ${email} already exists, skipping (password not overwritten)`);
         }

         for (const tipo of ['expediente', 'contacto'] as const) {
           await esquemas.upsertEmpty(user._id, tipo);
           log.log(`Esquema ${tipo} ensured`);
         }

         await app.close();
       }

       bootstrap().catch(err => { console.error(err); process.exit(1); });
       ```
    3) `apps/backend/package.json` scripts: añadir `"seed": "ts-node -r tsconfig-paths/register scripts/seed.ts"`.
    4) Root `package.json` scripts: añadir `"seed": "pnpm --filter backend seed"`.
    5) Verificar `.env.example` (añadido en 02-01 ya tiene `SEED_USER_EMAIL` y `SEED_USER_PASSWORD`).
    6) `test/scripts/seed.e2e-spec.ts`: usa el global setup-e2e (mongodb-memory-server). Approach:
       - Importa `bootstrap` exportándolo del seed (refactor: en el script, separar `export async function runSeed() {...}` y `if (require.main === module) runSeed()...`). NO ejecutar `process.exit` dentro de `runSeed`; throw en su lugar.
       - Test 1 (creación): set env, ejecutar `runSeed()`, asserta que `usuarios.find()` length === 1, `esquemas.find()` length === 2 con `parametros: []`.
       - Test 2 (idempotencia): ejecutar segunda vez `runSeed()` (mismo env), asserta length sigue === 1 y === 2.
       - Test 3 (no overwrite password): cambiar `SEED_USER_PASSWORD` a otro valor, ejecutar `runSeed()`, asserta que el `passwordHash` NO ha cambiado (`expect(usuario.passwordHash).toBe(originalHash)`).
       - Test 4 (env faltante): borrar env, esperar que `runSeed()` throw.
  </action>
  <verify>
    <automated>pnpm --filter backend test:e2e -- seed</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/backend/scripts/seed.ts` exits 0.
    - `grep -q '"seed":' apps/backend/package.json` exits 0.
    - `grep -q '"seed":' package.json` exits 0 (root).
    - `grep -q "argon2id" apps/backend/scripts/seed.ts` exits 0.
    - `grep -q "upsertEmpty" apps/backend/scripts/seed.ts` exits 0.
    - `grep -q "skipping" apps/backend/scripts/seed.ts` exits 0 (idempotencia).
    - `pnpm --filter backend test:e2e -- seed` shows 4 passing tests including "does not overwrite password".
  </acceptance_criteria>
  <done>
    AUTH-05 cumplido. `pnpm seed` operativo, idempotente, seguro frente a re-ejecución con password distinta.
  </done>
</task>

<task type="auto">
  <name>Task 3: Backup rclone — script + config example + README de instalación cron en NAS</name>
  <files>
    infra/scripts/backup-daily.sh,
    infra/scripts/rclone.conf.example,
    infra/scripts/README.md,
    .env.example
  </files>
  <read_first>
    .planning/phases/02-auth-y-bases-transversales/02-RESEARCH.md (§Pattern 9 + §Pitfall 6),
    docs/ARQUITECTURA.md §8.2 (backup),
    infra/docker-compose.yml (nombre del servicio mongodb + minio),
    .env.example
  </read_first>
  <action>
    1) `infra/scripts/backup-daily.sh` — extender §Pattern 9 RESEARCH con `--dry-run` y verificación pre-vuelo:
       ```bash
       #!/usr/bin/env bash
       # Lexscribe — Backup diario MinIO + Mongo a Google Drive (rclone)
       # Instalar en cron del NAS: 0 3 * * * /opt/lexscribe/infra/scripts/backup-daily.sh >> /var/log/lexscribe-backup.log 2>&1
       set -euo pipefail

       DRY_RUN=0
       [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

       TS=$(date -u +%Y%m%dT%H%M%SZ)
       BACKUP_DIR="${BACKUP_DIR:-/var/backups/lexscribe}"
       RCLONE_CONFIG="${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
       REMOTE_DRIVE="${REMOTE_DRIVE:-gdrive:lexscribe-backup}"
       REMOTE_MINIO="${REMOTE_MINIO:-minio:lexscribe}"
       LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
       REMOTE_RETENTION_DAYS="${REMOTE_RETENTION_DAYS:-30}"

       run() { if [[ $DRY_RUN -eq 1 ]]; then echo "[dry-run] $*"; else eval "$*"; fi }

       echo "[$(date -u +%FT%TZ)] Backup start (TS=$TS, dry-run=$DRY_RUN)"

       # Pre-vuelo: rclone alcanzable
       if [[ $DRY_RUN -eq 0 ]]; then
         rclone --config "$RCLONE_CONFIG" about "${REMOTE_DRIVE%%:*}:" >/dev/null \
           || { echo "FATAL: cannot reach $REMOTE_DRIVE (token expired? rclone config?)"; exit 2; }
       fi

       run "mkdir -p '$BACKUP_DIR/$TS'"

       # 1. Mongo dump
       run "docker compose exec -T mongodb mongodump --archive --gzip > '$BACKUP_DIR/$TS/mongo.archive.gz'"

       # 2. MinIO snapshot local
       run "rclone --config '$RCLONE_CONFIG' sync '$REMOTE_MINIO' '$BACKUP_DIR/$TS/minio'"

       # 3. Push a Drive
       run "rclone --config '$RCLONE_CONFIG' copy '$BACKUP_DIR/$TS' '$REMOTE_DRIVE/$TS'"

       # 4. Retención local
       run "find '$BACKUP_DIR' -mindepth 1 -maxdepth 1 -type d -mtime +$LOCAL_RETENTION_DAYS -exec rm -rf {} +"

       # 5. Retención remota
       run "rclone --config '$RCLONE_CONFIG' delete --min-age ${REMOTE_RETENTION_DAYS}d '$REMOTE_DRIVE'"
       run "rclone --config '$RCLONE_CONFIG' rmdirs --leave-root '$REMOTE_DRIVE'"

       # 6. Verificación (skip en dry-run)
       if [[ $DRY_RUN -eq 0 ]]; then
         SIZE=$(rclone --config "$RCLONE_CONFIG" size "$REMOTE_DRIVE/$TS" --json | python3 -c 'import sys, json; print(json.load(sys.stdin)["bytes"])')
         [[ "$SIZE" -gt 0 ]] || { echo "BACKUP FAILED: empty remote"; exit 3; }
         echo "[$(date -u +%FT%TZ)] Backup OK: $SIZE bytes uploaded for $TS"
       else
         echo "[dry-run] Backup script validated."
       fi
       ```
       `chmod +x` mediante `git update-index --chmod=+x` o documentar en README. (En Windows el agente no puede chmod fácilmente — añadir nota en README "tras `git pull` ejecutar `chmod +x infra/scripts/backup-daily.sh` en el NAS").

       **Nota OS / matriz de ejecución (documentar en `infra/scripts/README.md`):**
       > "Producción: NAS Linux con cron diario; Dev (Windows): `bash -n` y `--dry-run` validan sintaxis y flujo en Git-Bash; el script no se ejecuta en CI (requiere docker compose en host + rclone con OAuth real)."
    2) `infra/scripts/rclone.conf.example`:
       ```
       # Plantilla rclone — copiar a /etc/rclone/rclone.conf en el NAS y completar con `rclone config`
       [gdrive]
       type = drive
       scope = drive
       # Tras 'rclone config' se rellenan automáticamente:
       # client_id =
       # client_secret =
       # token = {"access_token":"...","refresh_token":"..."}
       # team_drive =

       [minio]
       type = s3
       provider = Minio
       env_auth = false
       access_key_id = ${MINIO_ACCESS_KEY}
       secret_access_key = ${MINIO_SECRET_KEY}
       endpoint = http://minio:9000
       acl = private
       ```
    3) `infra/scripts/README.md`: procedimiento corto pero ejecutable. **Debe incluir explícitamente la sección "Matriz de ejecución por entorno"** con el siguiente texto literal (para que la verificación post-execute pueda greparlo):

       > **Matriz de ejecución por entorno:** "Producción: NAS Linux con cron diario; Dev (Windows): bash -n y --dry-run validan en Git-Bash; el script no se ejecuta en CI."

       Resto del README:
       - Pre-requisitos: rclone ≥ 1.66 instalado en NAS; acceso SSH; cuenta Google Drive del despacho.
       - Pasos:
         1. `cp infra/scripts/rclone.conf.example /etc/rclone/rclone.conf`
         2. `rclone config` → seleccionar `gdrive` → seguir wizard OAuth (recordar `scope = drive`, NO `drive.file`).
         3. `rclone --config /etc/rclone/rclone.conf about gdrive:` debe responder con cuota.
         4. `chmod +x /opt/lexscribe/infra/scripts/backup-daily.sh`.
         5. Test manual: `/opt/lexscribe/infra/scripts/backup-daily.sh --dry-run` (debe imprimir todos los pasos sin error).
         6. Test real: `/opt/lexscribe/infra/scripts/backup-daily.sh` (verificar carpeta `lexscribe-backup/<TS>/` aparece en Drive).
         7. Instalar cron: `crontab -e` → `0 3 * * * /opt/lexscribe/infra/scripts/backup-daily.sh >> /var/log/lexscribe-backup.log 2>&1`.
       - Procedimiento de verificación mensual: abrir Drive, comprobar que la fecha de la carpeta más reciente es de hoy/ayer.
       - Pitfall token caduca: §Pitfall 6 del RESEARCH (instalar `mailx` para alerta).
    4) `.env.example`: añadir docs (commented):
       ```
       # Backup (NAS host, no contenedor)
       # BACKUP_DIR=/var/backups/lexscribe
       # RCLONE_CONFIG=/etc/rclone/rclone.conf
       # REMOTE_DRIVE=gdrive:lexscribe-backup
       # REMOTE_MINIO=minio:lexscribe
       ```
  </action>
  <verify>
    <automated>bash -n infra/scripts/backup-daily.sh &amp;&amp; test -f infra/scripts/rclone.conf.example &amp;&amp; test -f infra/scripts/README.md &amp;&amp; bash infra/scripts/backup-daily.sh --dry-run</automated>
  </verify>
  <acceptance_criteria>
    - `bash -n infra/scripts/backup-daily.sh` exits 0 (script syntactically valid).
    - `bash infra/scripts/backup-daily.sh --dry-run` exits 0 and prints `[dry-run]` lines for mkdir/mongodump/rclone steps.
    - `grep -q "rclone" infra/scripts/backup-daily.sh` exits 0.
    - `grep -q "min-age" infra/scripts/backup-daily.sh` exits 0 (retención remota).
    - `grep -q "mtime" infra/scripts/backup-daily.sh` exits 0 (retención local).
    - `grep -q "rclone config" infra/scripts/README.md` exits 0.
    - `grep -q "crontab" infra/scripts/README.md` exits 0.
    - `grep -q "Matriz de ejecución" infra/scripts/README.md` exits 0 (nota OS dev/prod/CI presente).
    - `grep -q "no se ejecuta en CI" infra/scripts/README.md` exits 0.
    - `grep -q "scope = drive" infra/scripts/rclone.conf.example` exits 0.
    - `grep -RIn "client_secret\|access_key_id.*=.*[A-Z0-9]\{16\}" infra/scripts/rclone.conf.example` returns NO real secrets (only placeholders/env vars).
  </acceptance_criteria>
  <done>
    INF-06 cumplido a nivel script + procedimiento. Verificación end-to-end (Drive real) requiere acción manual del operador del NAS — documentada en `Pending Todos` post-fase y registrada como "Known gap" en el SUMMARY.
  </done>
</task>

</tasks>

<verification>
1. `pnpm --filter backend test && pnpm --filter backend test:e2e` — todo verde (incluye seed + esquemas + cierre del bucle de auditoría).
2. `pnpm seed` (con .env y Mongo levantado vía docker-compose) crea 1 usuario y 2 esquemas; segunda ejecución no duplica.
3. `bash infra/scripts/backup-daily.sh --dry-run` ejecuta sin error.
4. Documentar en SUMMARY que la verificación end-to-end de INF-06 (subida real a Drive) requiere paso manual del operador en NAS.
</verification>

<success_criteria>
- AUTH-05: `pnpm seed` idempotente, password no se sobrescribe.
- AUTH-08: GET/POST/DELETE de `/api/v1/esquemas/:tipoObjeto` operativos con validación enum (Zod parse + traducción a `ValidationError`) + idempotencia + error tipado en conflicto + 501 en delete + auditoría verificada e2e.
- INF-06: script de backup con retención + dry-run + procedimiento de instalación cron en NAS.
- Suite backend completa verde tras los 3 tasks.
</success_criteria>

<output>
After completion, create `.planning/phases/02-auth-y-bases-transversales/02-04-SUMMARY.md`.

**SUMMARY MUST include the following lines verbatim:**

> **Known gap (INF-06):** "Real-Drive verification deferred to operator manual step per VALIDATION.md (rclone OAuth not testable in CI)."

Add to STATE.md `Pending Todos`:
- "User must run `rclone config` on NAS and configure `gdrive` remote (see `infra/scripts/README.md`)"
- "User must install backup-daily.sh in cron of NAS (see `infra/scripts/README.md` step 7)"
</output>
