#!/usr/bin/env bash
# ==========================================================================
# Copia de seguridad de INGELOP: base de datos + planos/documentos + mensajes de la web.
# Guarda en /var/backups/ingelop y conserva los últimos DIAS_RETENCION días.
#
# Uso manual:   sudo /opt/ingelop/deploy/backup.sh
# Automático (todos los días a las 2:30 a. m.), con "sudo crontab -e":
#   30 2 * * * /opt/ingelop/deploy/backup.sh >> /var/log/ingelop-backup.log 2>&1
# ==========================================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${DESTINO:-/var/backups/ingelop}"
DIAS_RETENCION="${DIAS_RETENCION:-14}"
FECHA="$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose -f $REPO/deploy/docker-compose.prod.yml --env-file $REPO/deploy/.env"

mkdir -p "$DESTINO"
echo "[$(date)] Iniciando copia de seguridad…"

# 1) Base de datos (formato comprimido de pg_dump)
$COMPOSE exec -T db pg_dump -U ingelop -d ingelop -Fc > "$DESTINO/db_$FECHA.dump"

# 2) Archivos subidos a la intranet (planos, documentos)
$COMPOSE run --rm --no-deps --user root -v "$DESTINO:/respaldo" --entrypoint sh api \
  -c "tar czf /respaldo/uploads_$FECHA.tar.gz -C /app uploads"

# 3) Mensajes del formulario de contacto de la web
$COMPOSE exec -T web tar czf - -C /var/www/html storage > "$DESTINO/web_mensajes_$FECHA.tar.gz"

# Elimina copias antiguas
find "$DESTINO" -type f -mtime +"$DIAS_RETENCION" -delete

echo "[$(date)] Listo:"
ls -lh "$DESTINO" | tail -n 3
