# infra/scripts

- `generate-self-signed-cert.sh` — genera un certificado autofirmado en `infra/nginx/certs/lexscribe.{crt,key}` para desarrollo local. Ejecutar UNA vez antes de `docker compose up` la primera vez.
- `backup-daily.sh` — backup diario de MinIO + MongoDB a Google Drive vía rclone. Ver sección Backup más abajo.
- `rclone.conf.example` — plantilla de configuración rclone (sin secretos). Copiar a `/etc/rclone/rclone.conf` en el NAS.

## Local stack

From repo root:
1. cp .env.example .env  (then fill secrets)
2. ./infra/scripts/generate-self-signed-cert.sh
3. docker compose -f infra/docker-compose.yml --env-file .env up --build
4. open https://localhost (accept self-signed warning)

---

# Lexscribe — Backup diario a Google Drive (rclone)

Script de backup automático: MinIO + MongoDB → Google Drive, con retención local (7 días) y remota (30 días).

## Matriz de ejecución por entorno

**Producción: NAS Linux con cron diario; Dev (Windows): bash -n y --dry-run validan en Git-Bash; el script no se ejecuta en CI.**

> El script requiere `docker compose` en el host para acceder a MongoDB y `rclone` configurado con OAuth para Google Drive. Estas dependencias no están disponibles en CI (GitHub Actions), por lo que el script se valida mediante `bash -n` (verificación de sintaxis) y `--dry-run` (verificación de flujo sin efecto) únicamente en el entorno de desarrollo.

## Pre-requisitos

- `rclone` ≥ 1.66 instalado en el NAS ([https://rclone.org/install/](https://rclone.org/install/))
- Acceso SSH al NAS
- Cuenta de Google Drive del despacho con suficiente espacio
- `docker compose` disponible en el NAS host (ya instalado como parte del despliegue)

## Pasos de instalación

### 1. Copiar la plantilla de configuración rclone

```bash
cp infra/scripts/rclone.conf.example /etc/rclone/rclone.conf
```

### 2. Configurar el remote de Google Drive

```bash
rclone config
```

Selecciona `n` (new remote) → nombre: `gdrive` → tipo: `drive` → sigue el wizard OAuth.

**Importante:** Usar `scope = drive` (NO `drive.file`) para poder leer y escribir cualquier archivo.

### 3. Verificar conectividad

```bash
rclone --config /etc/rclone/rclone.conf about gdrive:
```

Debe responder con la cuota y espacio disponible del Drive. Si falla, ejecuta `rclone config reconnect gdrive:`.

### 4. Hacer el script ejecutable

```bash
chmod +x /opt/lexscribe/infra/scripts/backup-daily.sh
```

> **Nota Windows:** Tras `git clone` en Windows, ejecutar este `chmod +x` en el NAS antes del primer uso.

### 5. Test en modo dry-run (sin tocar Drive)

```bash
/opt/lexscribe/infra/scripts/backup-daily.sh --dry-run
```

Debe imprimir todos los pasos con el prefijo `[dry-run]` sin error y sin ejecutar nada real.

### 6. Test real (primera vez)

```bash
/opt/lexscribe/infra/scripts/backup-daily.sh
```

Verificar que aparece la carpeta `lexscribe-backup/<TS>/` en el Google Drive del despacho.

### 7. Instalar en cron del NAS

```bash
crontab -e
```

Añadir la siguiente línea (backup diario a las 3:00 UTC):

```
0 3 * * * /opt/lexscribe/infra/scripts/backup-daily.sh >> /var/log/lexscribe-backup.log 2>&1
```

## Variables de entorno (opcional)

El script usa estas variables con valores por defecto razonables:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BACKUP_DIR` | `/var/backups/lexscribe` | Directorio local de backups |
| `RCLONE_CONFIG` | `/etc/rclone/rclone.conf` | Ruta al config rclone |
| `REMOTE_DRIVE` | `gdrive:lexscribe-backup` | Remote + carpeta en Drive |
| `REMOTE_MINIO` | `minio:lexscribe` | Remote rclone para MinIO |
| `LOCAL_RETENTION_DAYS` | `7` | Días de retención local |
| `REMOTE_RETENTION_DAYS` | `30` | Días de retención en Drive |

## Procedimiento de verificación mensual

1. Abrir Google Drive del despacho.
2. Navegar a `lexscribe-backup/`.
3. Comprobar que la carpeta más reciente tiene fecha de hoy o ayer.
4. Comprobar que contiene `mongo.archive.gz` y la carpeta `minio/`.

## Pitfall: token OAuth de rclone caduca

El token de Google Drive puede caducar después de 6 meses de inactividad. Síntomas: el backup falla con "oauth token expired" en el log.

**Solución:**

```bash
rclone config reconnect gdrive:
```

Seguir el wizard OAuth de nuevo. Considerar instalar `mailx` para alertas automáticas por email.
