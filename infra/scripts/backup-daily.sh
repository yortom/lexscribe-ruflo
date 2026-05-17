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

# Pre-vuelo: rclone alcanzable (skip in dry-run)
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

# 4. Retención local (eliminar backups locales más antiguos que LOCAL_RETENTION_DAYS)
run "find '$BACKUP_DIR' -mindepth 1 -maxdepth 1 -type d -mtime +$LOCAL_RETENTION_DAYS -exec rm -rf {} +"

# 5. Retención remota (eliminar backups en Drive más antiguos que REMOTE_RETENTION_DAYS)
run "rclone --config '$RCLONE_CONFIG' delete --min-age ${REMOTE_RETENTION_DAYS}d '$REMOTE_DRIVE'"
run "rclone --config '$RCLONE_CONFIG' rmdirs --leave-root '$REMOTE_DRIVE'"

# 6. Verificación del upload (skip en dry-run)
if [[ $DRY_RUN -eq 0 ]]; then
  SIZE=$(rclone --config "$RCLONE_CONFIG" size "$REMOTE_DRIVE/$TS" --json | python3 -c 'import sys, json; print(json.load(sys.stdin)["bytes"])')
  [[ "$SIZE" -gt 0 ]] || { echo "BACKUP FAILED: empty remote at $REMOTE_DRIVE/$TS"; exit 3; }
  echo "[$(date -u +%FT%TZ)] Backup OK: $SIZE bytes uploaded for $TS"
else
  echo "[dry-run] Backup script validated. All steps would execute in production."
fi
