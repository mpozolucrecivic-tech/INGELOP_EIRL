# Web informativa en PHP 8.3 + Apache, con msmtp para que mail() envíe por SMTP
# Contexto de build: raíz del repositorio

FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends msmtp ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && a2enmod headers expires rewrite remoteip \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 # IP real del visitante detrás de Caddy
 && printf 'RemoteIPHeader X-Forwarded-For\nRemoteIPTrustedProxy 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16\n' > /etc/apache2/conf-enabled/remoteip.conf \
 && printf 'sendmail_path = "/usr/bin/msmtp -t"\nexpose_php = Off\ndisplay_errors = Off\nlog_errors = On\n' > /usr/local/etc/php/conf.d/ingelop.ini

COPY web/ /var/www/html/
COPY deploy/web-entrypoint.sh /usr/local/bin/web-entrypoint.sh
RUN chmod +x /usr/local/bin/web-entrypoint.sh \
 && rm -f /var/www/html/storage/*.csv \
 && chown -R www-data:www-data /var/www/html/storage

ENTRYPOINT ["web-entrypoint.sh"]
CMD ["apache2-foreground"]
