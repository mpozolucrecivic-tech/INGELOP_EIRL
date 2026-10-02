#!/bin/sh
# Configura el envío de correos (msmtp) con las variables SMTP_* y arranca Apache.
set -e

if [ -n "$SMTP_HOST" ]; then
  cat > /etc/msmtprc <<EOF
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        principal
host           $SMTP_HOST
port           ${SMTP_PORT:-587}
from           ${SMTP_FROM:-$SMTP_USER}
user           $SMTP_USER
password       $SMTP_PASSWORD

account default : principal
EOF
  chown www-data:www-data /etc/msmtprc
  chmod 600 /etc/msmtprc
  touch /var/log/msmtp.log && chown www-data:www-data /var/log/msmtp.log
  echo "Correo SMTP configurado ($SMTP_HOST)."
else
  echo "SMTP no configurado: los mensajes del formulario solo se guardarán en storage/mensajes.csv."
fi

# El volumen de mensajes puede llegar vacío: asegura permisos y protección
mkdir -p /var/www/html/storage
[ -f /var/www/html/storage/.htaccess ] || echo 'Require all denied' > /var/www/html/storage/.htaccess
chown -R www-data:www-data /var/www/html/storage

exec docker-php-entrypoint "$@"
