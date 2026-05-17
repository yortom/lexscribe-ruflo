# Lexscribe — Arquitectura del Sistema

> Documento técnico. Describe **el stack y la estructura del sistema** que da soporte a las funcionalidades definidas en [`FUNCIONAL.md`](FUNCIONAL.md) y al modelo definido en [`DATOS.md`](DATOS.md).
>
> Filosofía: **profesional desde el día 1**, pero sin overengineering. Stack maduro, mantenible, con ecosistema grande, listo para escalar a varios desarrolladores cuando llegue el momento.

---

## 1. Visión general

```
┌──────────────────────────────────────────────────────────────────┐
│                    NAS del despacho (privado)                    │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐       │
│  │  Frontend    │←→│   Backend    │←→│    MongoDB      │       │
│  │  Next.js     │   │   NestJS     │   │   (Mongoose)    │       │
│  └──────────────┘   └──────┬───────┘   └─────────────────┘       │
│         ↑                  │                                     │
│         │                  ↓                                     │
│         │           ┌──────────────┐                             │
│         │           │    MinIO     │  ← S3-compatible            │
│         │           │  (Storage)   │     binarios                │
│         │           └──────┬───────┘                             │
│         │                  │                                     │
│  ┌──────────────┐          │                                     │
│  │    Nginx     │          ↓                                     │
│  │ Reverse Proxy│   ┌──────────────┐                             │
│  └──────────────┘   │ Google Drive │  ← backup automático        │
│                     │  (rclone)    │     (cron diario)           │
│                     └──────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
                              ↑
                              │ HTTPS
                              │
                       ┌──────────────┐
                       │   Usuario    │
                       │   (abogado)  │
                       └──────────────┘
```

**Capas:**
1. **Cliente web** — Next.js servido al navegador.
2. **API REST** — NestJS con autenticación JWT.
3. **Persistencia** — MongoDB para datos estructurados.
4. **Storage** — MinIO (S3-compatible) para binarios `.docx`/`.pdf`/`.txt`.
5. **Backup** — sync programado a Google Drive del despacho.

---

## 2. Stack tecnológico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| **Lenguaje** | TypeScript end-to-end | Tipado fuerte, mismo lenguaje cliente/servidor, ecosistema enorme. |
| **Frontend** | Next.js 14+ (App Router) + React | Maduro, SSR/SSG/CSR a demanda, despliegue trivial, comunidad gigante. |
| **Estilos** | Tailwind CSS + shadcn/ui | Velocidad y consistencia. shadcn/ui ofrece componentes copiados al repo (control total, sin lock-in). |
| **Estado/datos cliente** | TanStack Query | Cache, revalidación, mutaciones de API REST con sincronización automática. |
| **Formularios** | React Hook Form + Zod | Validación tipada que se reusa en cliente y servidor. |
| **Editor plantillas** | CodeMirror 6 | Highlight de `{{...}}`, validación en vivo. Detalle en sección 4.3. |
| **Backend** | Node.js + NestJS | Arquitectura modular, DI, decoradores, encaja con módulos del modelo (expedientes, contactos…). Pensado para equipos. |
| **ORM/ODM** | Mongoose | Estándar para MongoDB en Node. Schemas + validación + middlewares. |
| **Validación** | Zod (compartido) + `class-validator` (NestJS DTO) | Reutilizar Zod en cliente y servidor cuando sea posible. |
| **Auth** | Passport.js + JWT (access + refresh) | Estándar, multi-estrategia, listo para añadir OAuth/SSO en el futuro. |
| **Generación `.docx`** | `docxtemplater` (core MIT) | Sintaxis `{{variable}}` nativa, soporta loops, mantiene formato del Word original. **Solo se usa el core gratuito.** |
| **Conversión `.txt`/pegado → `.docx`** | `docx` (npm `docx`) | Genera `.docx` desde código cuando la plantilla no tuvo origen Word. |
| **Storage de archivos** | MinIO (en NAS) | S3-compatible, self-hosted, libre. Compatible con AWS SDK estándar — si mañana se mueve a AWS S3 solo cambia el endpoint. |
| **SDK Storage** | `@aws-sdk/client-s3` (v3) | Cliente oficial S3 que habla nativamente con MinIO. |
| **Backup** | `rclone` con cron en el NAS | Sync de buckets MinIO a Google Drive. Gratuito, robusto, estándar en infraestructuras NAS. |
| **Logs** | Pino (backend) + Pino-pretty (dev) | Logs estructurados JSON, alto rendimiento. Compatible con cualquier agregador. |
| **Errores** | Sentry (free tier) | Captura cliente y servidor con stack traces. |
| **Tests backend** | Jest + Supertest | Unitarios y e2e de API. |
| **Tests frontend** | Vitest + Testing Library | Rápido, encaja con Vite/Next. |
| **Tests E2E** | Playwright | Multi-navegador, fiable, soporta autenticación. |
| **Containerización** | Docker + Docker Compose | Reproducibilidad, despliegue idéntico dev/prod. |
| **Reverse proxy** | Nginx | TLS, gzip, routing. |
| **CI/CD** | GitHub Actions | Estándar, gratis para repos privados pequeños, integración con todo. |
| **Gestor monorepo** *(opcional)* | pnpm workspaces o Turborepo | Si conviene compartir tipos/Zod entre frontend y backend. |

---

## 3. Estructura de repositorio

Propuesta inicial: **monorepo** con `pnpm workspaces`. Permite compartir tipos y validadores entre cliente y servidor.

```
ruflo-Lexscribe/
├── apps/
│   ├── frontend/                # Next.js
│   └── backend/                 # NestJS
├── packages/
│   ├── shared-types/            # interfaces TS comunes (Expediente, Contacto…)
│   └── shared-validation/       # esquemas Zod compartidos
├── infra/
│   ├── docker-compose.yml       # MVP
│   ├── nginx/                   # config reverse proxy
│   └── scripts/                 # seed, backup, etc.
├── docs/
│   ├── FUNCIONAL.md
│   ├── DATOS.md
│   └── ARQUITECTURA.md          # este documento
├── .github/workflows/           # CI/CD
└── README.md
```

### 3.1 Compilación de packages compartidos

Los packages `shared-types` y `shared-validation` se **compilan a `dist/`
(CommonJS)** antes de ser consumidos por las apps. No se importan como TS source
directo. Esto garantiza compatibilidad estable con:

- **Backend NestJS** — `nest start --watch` ejecuta `apps/backend/dist/`
  (CommonJS) y resuelve `@lexscribe/shared-validation` a `dist/index.js`.
- **Frontend Next.js 14 (webpack)** — consume el package como dependencia
  externa normal (sin `transpilePackages`). Webpack bundlea el CJS sin inyectar
  HMR ESM.

**Configuración de cada package compartido (`packages/shared-*/package.json`):**

```json
{
  "type": "commonjs",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch --preserveWatchOutput"
  }
}
```

El `pnpm dev` raíz invoca en paralelo el `dev` de cada workspace, así que
`tsc --watch` recompila los packages cuando cambian sus `src/*.ts` y los
consumidores reciben los cambios sin reiniciar.

**Ciclo en local:** `pnpm install` → `pnpm --filter "./packages/*" build` (una
vez) → `pnpm dev` (mantiene watch).

---

## 4. Frontend (Next.js)

### 4.1 Organización

App Router (Next.js 14+). Routing por carpetas con layout segregado por área.

```
apps/frontend/
├── app/
│   ├── (auth)/login/            # rutas públicas
│   ├── (app)/                   # rutas protegidas
│   │   ├── expedientes/
│   │   ├── contactos/
│   │   ├── plantillas/
│   │   ├── clausulas/
│   │   ├── calendario/
│   │   └── facturacion/
│   └── layout.tsx
├── components/                  # UI reusable
├── lib/
│   ├── api/                     # cliente HTTP tipado por dominio
│   ├── auth/                    # gestión token + refresh
│   └── hooks/                   # React Query hooks
└── types/                       # importa de packages/shared-types
```

### 4.2 Patrones clave

- **Cliente HTTP tipado:** un módulo por dominio (`api/expedientes.ts`, `api/contactos.ts`…) que devuelve tipos compartidos.
- **TanStack Query** para todo el fetching: cache, optimistic updates, invalidación coordinada.
- **Auth context** que inyecta el token en cada request y refresca automáticamente al expirar.
- **Validación con Zod** en formularios → mismo schema reutilizado en el backend.
- **i18n:** el frontend traduce al español los mensajes de error que vienen del backend en inglés (mapping centralizado en `lib/i18n/errors.ts`).

### 4.3 Editor de plantillas

> Soporta el flujo crítico FL-2 (crear/editar plantilla con detección automática de variables `{{objeto.campo}}`).

**Tecnología:** [CodeMirror 6](https://codemirror.net/) (gratuito, MIT, mantenido).

**Por qué CodeMirror y no rich-text:**
- El contenido base es **texto plano con marcadores** — un rich-text (TipTap, Lexical) añade complejidad innecesaria para el MVP.
- CodeMirror permite **highlight personalizado** sobre `{{...}}` sin pelear con un DOM rico.
- Tamaño de bundle pequeño, rendimiento excelente con documentos grandes.
- El día que se quiera evolucionar a chips visuales, se puede migrar a TipTap sin romper el modelo de datos (siempre se persiste texto plano).

**Funcionalidades del editor:**
- Resaltado en color de cada variable `{{objeto.campo}}`.
- Validación en vivo: variables con `tipoObjeto` desconocido se marcan en rojo (F-030b).
- Panel lateral con **lista de variables detectadas**, agrupadas por tipo de objeto. Click en una variable ↔ posiciona el cursor.
- Botón "Insertar cláusula" abre un modal con la biblioteca filtrable por label (FL-7).
- Atajos: `Ctrl+S` guarda (genera nueva versión, F-090).

---

## 5. Backend (NestJS)

### 5.1 Organización por módulos de dominio

Cada módulo del catálogo funcional tiene su carpeta. Aprovechamos la modularidad de NestJS.

```
apps/backend/src/
├── modules/
│   ├── auth/                    # login, refresh, guards
│   ├── usuarios/                # F-090 multi-usuario ready
│   ├── expedientes/             # F-001..F-008
│   ├── contactos/               # F-050..F-055
│   ├── plantillas/              # F-020..F-029 + versionado
│   ├── clausulas/               # F-040..F-046
│   ├── documentos/              # F-010..F-018
│   │   ├── generation/          # uso de docxtemplater
│   │   └── storage/             # cliente MinIO
│   ├── eventos/                 # F-060..F-066
│   ├── facturacion/             # F-070..F-075
│   └── esquemas/                # F-090..F-096 (esquema dinámico)
├── common/
│   ├── decorators/              # @CurrentUser, etc.
│   ├── guards/                  # JwtAuthGuard
│   ├── filters/                 # exception filters
│   ├── interceptors/            # logging, soft-delete, usuarioId injection
│   └── pipes/                   # validación Zod
├── config/                      # config tipada por env
└── main.ts
```

### 5.2 Estructura de un módulo

Cada módulo sigue el patrón estándar NestJS:

```
expedientes/
├── expedientes.module.ts
├── expedientes.controller.ts    # HTTP endpoints
├── expedientes.service.ts       # lógica de negocio
├── expedientes.repository.ts    # acceso a Mongoose
├── dto/                         # CreateExpedienteDto, UpdateExpedienteDto
├── schemas/                     # Mongoose schema
└── tests/                       # unitarios + e2e
```

### 5.3 Convenciones transversales

- **`usuarioId`** se inyecta automáticamente en cada request via interceptor a partir del JWT — el código de dominio no lo manipula manualmente.
- **Soft delete** se aplica en el `repository` mediante middleware Mongoose: las queries de lectura excluyen `activo: false` por defecto.
- **Validación Zod** sobre los DTOs en un `ZodValidationPipe` global.
- **Errores de dominio** son clases tipadas (`ExpedienteNotFoundError`, `RolDuplicadoError`) que un `ExceptionFilter` traduce a códigos HTTP apropiados.

---

## 6. API REST

### 6.1 Convenciones

- **Base URL:** `/api/v1/...` (el prefijo `v1` permite romper compatibilidad sin migrar todo de golpe).
- **Auth:** todos los endpoints excepto `/auth/login` y `/auth/refresh` requieren `Authorization: Bearer <token>`.
- **Códigos:** `200`/`201` éxito, `400` validación, `401` no autenticado, `403` no autorizado, `404` no encontrado, `409` conflicto, `500` error servidor.
- **Paginación:** `?page=1&limit=20`. Respuesta incluye `{ items, total, page, limit }`.
- **Filtrado de soft delete:** transparente — los endpoints solo retornan `activo: true` salvo que se pase `?incluirInactivos=true` (operación admin).

### 6.2 Endpoints clave (resumen)

| Recurso | Métodos | Notas |
|---------|---------|-------|
| `/auth/login` `/auth/refresh` `/auth/logout` | POST | JWT + refresh |
| `/expedientes` | GET POST PATCH DELETE | DELETE = soft delete |
| `/expedientes/:id/contactos` | POST DELETE | Asociar/desasociar (FL-12) |
| `/expedientes/:id/documentos` | GET POST | POST genera o sube |
| `/expedientes/:id/facturas` | GET POST | F-072 |
| `/contactos` | GET POST PATCH DELETE | |
| `/plantillas` | GET POST PATCH | PATCH = nueva versión (F-090 versionado) |
| `/plantillas/:id/versions` | GET | Historial |
| `/clausulas` | GET POST PATCH DELETE | |
| `/documentos/:id` | GET DELETE | DELETE pregunta sobre eventos (FL-9) |
| `/documentos/:id/download` | GET | Devuelve binario desde Storage |
| `/eventos` | GET POST PATCH DELETE | Vista calendario |
| `/esquemas/:tipoObjeto` | GET POST DELETE | Gestión esquema dinámico |

> El detalle exhaustivo (request/response) vivirá en una **OpenAPI spec** generada automáticamente por NestJS (`@nestjs/swagger`).

---

## 7. Generación de documentos

> Es **el corazón funcional** del producto. Esta sección detalla el pipeline completo.

### 7.1 Subir / crear plantilla (FL-2)

```
input: archivo (.txt/.docx) o texto pegado
   │
   ↓
┌────────────────────────────────────┐
│ 1. Si es .docx: extraer texto plano│  (usa "mammoth" o lectura de Open XML)
│ 2. Si es .txt/pegado: ya es texto  │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 3. Detectar variables {{...}} con  │
│    regex sobre el texto            │  → array variablesDetectadas[]
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 4. Validar contra esquemas[]       │  ← F-030b (error controlado)
│    - tipoObjeto válido?            │
│    - campo existe en esquema?      │
│      (si no: ofrecer crearlo)      │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 5. Guardar en Mongo                │
│    + binario .docx en Storage      │
└────────────────────────────────────┘
```

### 7.2 Generar documento (FL-6)

```
input: plantillaId + expedienteId + asignaciones de roles + valores nuevos
   │
   ↓
┌────────────────────────────────────┐
│ 1. Construir JSON de contexto:     │
│    {                               │
│      expediente: { ... },          │
│      contacto: { vendedor:{}, ... },
│      clausula: { primera:{}, ... } │
│    }                               │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 2. Validar que TODAS las variables │
│    {{...}} de la plantilla         │
│    se resuelven en el JSON         │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 3. Render con docxtemplater        │
│    (sobre .docx original o sobre   │
│     un .docx generado desde texto) │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│ 4. Subir .docx final a Storage     │
│ 5. Crear registro `documentos`     │
│    con datosCongelados = JSON      │  ← F-015 inmutabilidad
└────────────────────────────────────┘
```

### 7.3 Decisión: cómo se guarda el contenido de plantilla

- **Origen `.docx`:** se guarda el `.docx` en Storage **+** texto plano en `contenido` (para detección y previsualización rápidas).
- **Origen `.txt` / pegado:** se convierte a un `.docx` mínimo con `docx` (npm) y se guarda en Storage. Esto unifica el pipeline de generación: **siempre** existe un `.docx` base sobre el que `docxtemplater` opera.

> Beneficio: una sola ruta de generación. Coste: las plantillas pegadas pierden formato rico (negritas, tablas) salvo que el usuario las añada en un editor que lo soporte. Para el MVP es aceptable.

---

## 8. Storage (MinIO)

### 8.1 Setup

- MinIO se instala como contenedor Docker en el NAS (paquete oficial disponible para Synology / QNAP / TrueNAS).
- Bucket único `lexscribe` con prefijos por tipo:
  ```
  /lexscribe/plantillas/{plantillaId}/...
  /lexscribe/documentos/generados/{documentoId}/...
  /lexscribe/documentos/subidos/{documentoId}/...
  ```
- Acceso desde el backend mediante `@aws-sdk/client-s3` apuntando al endpoint del NAS.
- Credenciales (`accessKey`/`secretKey`) en variables de entorno, no en código.

### 8.2 Backup a Google Drive

- `rclone` configurado en el NAS con remoto Google Drive del despacho.
- Cron job diario: `rclone sync minio:lexscribe gdrive:lexscribe-backup`.
- Backup de MongoDB con `mongodump` también enviado a Drive.
- Retención: 30 días en Drive, 7 días incrementales locales.

### 8.3 Servir archivos al cliente

- El backend expone `/api/v1/documentos/:id/download` autenticado.
- Internamente genera un **presigned URL** de MinIO con expiración corta (5 min) y devuelve el binario streamado o redirige.
- Esto evita exponer MinIO directamente al exterior.

---

## 9. Autenticación y autorización

### 9.1 Estrategia

- **JWT access token** — corto (15 min), firmado con HS256 (clave en env).
- **Refresh token** — largo (7 días), almacenado en cookie `httpOnly` `secure` `sameSite=strict`.
- **Rotación de refresh tokens** — al usar uno se invalida y se emite uno nuevo.
- Endpoint `/auth/refresh` no requiere access token, sí cookie refresh.
- Logout = invalidar refresh token en servidor.

### 9.2 Inyección de `usuarioId`

- Todo controlador con `@UseGuards(JwtAuthGuard)` recibe `req.user`.
- Decorador custom `@CurrentUser()` extrae el `_id` y lo inyecta como argumento.
- El servicio nunca acepta `usuarioId` desde el body — siempre lo recibe del guard. Esto evita que un usuario manipule recursos de otro.

### 9.3 MVP mono-usuario

- En el seed inicial se crea un único registro en `usuarios`.
- Todas las consultas filtran por `usuarioId` igual al del JWT — código idéntico al multi-usuario futuro.

---

## 10. Despliegue

### 10.1 MVP — `docker-compose` en el NAS

```yaml
services:
  frontend:    # Next.js standalone build
  backend:     # NestJS
  mongodb:     # con volumen persistente en NAS
  minio:       # bucket con volumen persistente
  nginx:       # TLS + reverse proxy → frontend y backend
```

- Acceso interno desde la LAN del despacho.
- TLS con certificado Let's Encrypt vía DNS-01 (o autofirmado si la app no se expone fuera).
- Variables de entorno en archivo `.env` no versionado (template `.env.example` sí versionado).

### 10.2 Escalado futuro

Cuando el producto crezca:
- Mover `docker-compose` a un VPS / cloud privado sin cambios.
- Si llega el momento, separar servicios en Kubernetes o Render/Railway para gestión sencilla.
- MinIO se puede sustituir por AWS S3 cambiando solo el endpoint.

---

## 11. CI/CD

GitHub Actions con tres pipelines:

### 11.1 Pull request → `pr.yml`
1. Lint (ESLint + Prettier check).
2. Type check (tsc --noEmit).
3. Tests unitarios + e2e (Jest + Vitest).
4. Build dry-run.

### 11.2 Merge a `main` → `deploy-staging.yml`
1. Todo lo anterior.
2. Build imágenes Docker.
3. Push a registry (GitHub Container Registry).
4. Webhook al NAS de staging que hace `docker compose pull && up`.

### 11.3 Tag `v*` → `deploy-prod.yml`
1. Mismo flujo.
2. Despliega en NAS de producción.
3. Notificación.

> Por ahora todo apunta al mismo NAS pero con namespaces distintos (`lexscribe-staging` vs `lexscribe-prod`). Cuando haya entornos separados, se separa.

---

## 12. Observabilidad

| Área | Herramienta | Alcance MVP |
|------|-------------|-------------|
| **Logs estructurados** | Pino → ficheros rotativos en NAS | Sí |
| **Errores** | Sentry (free tier) | Sí — frontend + backend |
| **Healthchecks** | NestJS Terminus | `/health` y `/health/ready` |
| **Métricas runtime** | Prometheus + Grafana | Post-MVP |
| **Trazas distribuidas** | OpenTelemetry | Post-MVP |
| **Auditoría de acciones** | Colección `auditoria` (`usuarioId`, acción, timestamp, payload) | Considerar P1 — útil en sector legal |

---

## 13. Tests

### 13.1 Pirámide

- **Unitarios** (mayoría) — servicios, repositorios mockeando Mongo, utils de generación de variables.
- **Integración** — controladores con base de datos en memoria (`mongodb-memory-server`).
- **E2E** — flujos completos contra entorno docker-compose efímero, con Playwright para frontend.

### 13.2 Cobertura mínima sugerida

- 80% en servicios y utils críticos (parser de variables, render de plantilla).
- Tests E2E obligatorios para los 13 flujos `FL-*` definidos en `FUNCIONAL.md`.

---

## 14. Decisiones cerradas

- ✅ **Editor de plantillas** — **CodeMirror 6** con highlight personalizado para `{{objeto.campo}}` + panel lateral con variables detectadas en tiempo real. Razón: experiencia tipo "textarea inteligente" sin la complejidad de un editor rich-text. Gratuito, mantenido, integra bien en React. Detalle en sección 4.3.
- ✅ **Notificaciones por email** — post-MVP.
- ✅ **Idioma de la API** — **inglés**. Mensajes de error y nombres de error en inglés. La UI hace de capa de traducción al español. Esto facilita i18n futuro y es estándar industrial.
- ✅ **Versiones runtime** — última estable LTS: **Node 22 LTS o superior**, **MongoDB 8.x o superior**. Fijadas en `package.json` (`"engines"`) y en imágenes Docker.
- ✅ **Seed inicial** — script que crea: 1 usuario por defecto con credenciales en `.env` (para login real desde el día 1), entradas vacías de `esquemas` para `expediente` y `contacto`. Detalle en sección 16.
- ✅ **Cifrado en reposo** — estrategia en 3 capas. Detalle en sección 17.
- ✅ **Log de acciones (auditoría)** — incluido en MVP. Detalle en sección 18.

### Pendientes futuras

*(Sin decisiones abiertas relevantes en este momento.)*

---

## 15. Versiones runtime fijadas

| Componente | Versión mínima | Notas |
|------------|---------------|-------|
| Node.js | 22 LTS | Pinned en `engines` (`>=22.0.0`) y `.nvmrc` (`22`). **No usar Node 24** — su `--experimental-strip-types` por defecto rompe la resolución CJS de los packages compartidos. |
| MongoDB | 8.x | Imagen oficial. |
| pnpm | 9.12.0 | Gestor monorepo. Fijado en `package.json` (`packageManager: "pnpm@9.12.0"`). Activado vía `corepack enable && corepack prepare pnpm@9.12.0 --activate`. |
| Docker | 24.x | Engine en el NAS. |
| Docker Compose | v2 | Plugin moderno. |

Política: revisar bumps de versión cada 6 meses como parte del ciclo de mantenimiento.

---

## 16. Seed inicial

> Script idempotente (`pnpm seed`) que inicializa una base de datos vacía. Se ejecuta una vez tras el primer despliegue y opcionalmente en CI para entornos efímeros de tests.

**Qué crea:**
1. **Usuario por defecto** (`usuarios`):
   - `email` y `passwordHash` derivados de variables de entorno: `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`.
   - `rol: "admin"`, `activo: true`.
   - Permite hacer login real desde el día 1.
2. **Esquemas dinámicos vacíos** (`esquemas`):
   - Un documento por `tipoObjeto` (`expediente`, `contacto`) con `parametros: []`.
   - Vinculados al `usuarioId` del usuario por defecto.
3. **Bucket MinIO** `lexscribe` con la estructura de prefijos definida en sección 8.1.

**Lo que NO crea:**
- Plantillas, contactos, expedientes, cláusulas — la plataforma arranca vacía (F-014).

**Reproducibilidad:** el script comprueba si los registros ya existen antes de insertarlos; ejecutarlo dos veces no duplica nada.

**Ubicación:** `apps/backend/scripts/seed.ts` + comando `pnpm --filter backend seed`.

---

## 17. Cifrado y datos sensibles

> Estrategia en **3 capas** complementarias. Cada una protege un vector distinto.

### 17.1 Capa 1 — Cifrado en reposo del NAS

- **Volumen cifrado** del NAS donde residen los datos de Mongo, MinIO y backups.
- Synology, QNAP y TrueNAS soportan cifrado AES-256 a nivel de volumen.
- Si un disco es robado o desechado, los datos no son legibles sin la passphrase.
- **Trade-off:** la passphrase debe introducirse al arrancar el NAS — recuperación tras corte eléctrico requiere intervención manual o solución de almacenamiento de clave.

### 17.2 Capa 2 — Cifrado en tránsito (TLS)

- **HTTPS** obligatorio entre navegador y Nginx (Let's Encrypt o certificado interno).
- **TLS interno** entre backend y MongoDB / MinIO si se separan en hosts distintos.
- En LAN del despacho con un solo host, basta con HTTPS público + comunicación local en `localhost`.

### 17.3 Capa 3 — Cifrado a nivel de aplicación para PII crítica

- Campos especialmente sensibles (`documentacionFiscal`, `documentoIdentidad`) se cifran con **AES-256-GCM** antes de persistirse en Mongo.
- Clave maestra en variable de entorno (`APP_ENCRYPTION_KEY`), gestionada como secreto.
- La aplicación descifra al leer; transparente para el resto del código.
- Implementación con un **subscriber Mongoose** sobre los campos marcados, no a mano en cada repositorio.
- **Beneficio:** aunque alguien acceda al dump de Mongo (backup, error de configuración), los identificadores fiscales no son legibles.
- **Coste:** no se puede buscar por estos campos con `$regex` directamente — se almacena un hash determinista paralelo (`documentacionFiscalHash`) si se necesita búsqueda exacta.

### 17.4 Rotación de claves

- Las claves AES y de JWT viven en `.env` cifrado o en un gestor de secretos (Doppler, AWS Secrets Manager) cuando se escale.
- Política de rotación: anual o tras cualquier sospecha de compromiso.
- La rotación de claves AES requiere reescritura de campos (job de mantenimiento, post-MVP).

---

## 18. Log de acciones (auditoría)

> Sector legal exige trazabilidad. Toda operación de creación / edición / vinculación queda registrada de forma inmutable.

### 18.1 Colección `auditoria`

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                 // quién hizo la acción
  accion: "create" | "update" | "delete" | "link" | "unlink" | "generate" | "login" | "logout",
  recurso: String,                     // "expediente" | "contacto" | "documento" | ...
  recursoId: ObjectId,                 // sobre qué objeto se actuó
  cambios: Object | null,              // diff de campos modificados (solo en update)
  contexto: Object | null,             // info adicional: rol asignado al vincular,
                                       // plantillaId al generar, etc.
  ip: String | null,                   // IP del cliente
  userAgent: String | null,            // navegador
  timestamp: ISODate,                  // momento exacto
}
```

**Índices:**
- `{ recurso: 1, recursoId: 1, timestamp: -1 }` — historial de un objeto.
- `{ usuarioId: 1, timestamp: -1 }` — actividad de un usuario.
- `{ timestamp: -1 }` — vista global cronológica.

**Inmutabilidad:** los registros de `auditoria` **no** llevan `activo`/`fechaInactivacion`. Nunca se editan ni se borran. Si se necesita expurgar (RGPD), se hace con un job administrativo controlado y queda registrado a su vez.

### 18.2 Cómo se captura

- **Interceptor NestJS** que envuelve los métodos del repositorio: tras un `create`, `update` o `delete` exitoso, escribe un registro en `auditoria` con el diff calculado.
- **Eventos de dominio** para acciones de mayor nivel (`link`, `unlink`, `generate`) emitidos desde los servicios; un listener los persiste.
- **Login/logout** capturados en el módulo de auth.

### 18.3 Acciones registradas en MVP

| Acción | Recursos | Captura |
|--------|----------|---------|
| `create` | todos | Repositorio |
| `update` | todos | Repositorio (con diff) |
| `delete` | todos (soft delete) | Repositorio |
| `link` | expediente↔contacto, documento↔plantilla | Servicio |
| `unlink` | expediente↔contacto | Servicio |
| `generate` | documento desde plantilla | Servicio |
| `login` | usuario | Módulo auth |
| `logout` | usuario | Módulo auth |

### 18.4 Vista en frontend

- **Vista de detalle de cada recurso** incluye una pestaña "Historial" con los eventos de auditoría que le aplican.
- **Vista global de actividad** (P1) accesible desde menú de configuración — útil para ver qué se ha hecho recientemente en la plataforma.

### 18.5 Performance

- La auditoría se escribe **asíncrona** (`setImmediate` o cola en memoria) — no bloquea la respuesta al cliente.
- Si la cola falla, se loggea como error pero la acción ya está confirmada en negocio.
- Para volúmenes altos (post-MVP) se puede mover a una cola persistente (Redis Streams, RabbitMQ).

---

## 19. Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-26 | Creación inicial. Stack TypeScript end-to-end con Next.js (frontend), NestJS (backend), MongoDB + Mongoose, MinIO en NAS con backup a Google Drive, JWT + refresh, docxtemplater para generación. Despliegue con Docker Compose en NAS, CI/CD con GitHub Actions. Observabilidad básica (Pino + Sentry). 13 secciones + decisiones abiertas + diagrama de capas. |
| 2026-04-26 | Cerradas decisiones abiertas. Editor de plantillas: **CodeMirror 6** (sección 4.3). Idioma de API: inglés. Versiones runtime: Node 22 LTS, MongoDB 8.x (sección 15). Nuevas secciones: **16 Seed inicial** (usuario por defecto + esquemas vacíos), **17 Cifrado** (3 capas: volumen NAS / TLS / AES por campo de PII), **18 Log de acciones** (colección `auditoria` inmutable, capturada por interceptor + eventos). Notificaciones por email descartadas para MVP. |
| 2026-05-10 | **Sección 3.1 nueva** — `packages/shared-*` se compilan a `dist/` (CJS) en lugar de consumirse como TS source directo. Cambios: `main: "./dist/index.js"`, `tsconfig` con `module: commonjs`, scripts `build`/`dev` con `tsc --watch`. Frontend Next.js NO usa `transpilePackages` (causa HMR injection inválido en archivos CJS). Sección 15 actualizada: prohibir Node 24 (rompe la resolución), pnpm 9.12.0 vía corepack. |
