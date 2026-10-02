# Guía de despliegue – INGELOP en un VPS

Esta guía publica **la web informativa y la intranet** en un solo servidor, con HTTPS automático. El resultado:

| Dirección | Qué muestra |
|---|---|
| `https://ingelop.pe` | Web informativa (PHP) |
| `https://intranet.ingelop.pe` | Intranet (sistema interno) |

> Usa tus dominios reales en lugar de `ingelop.pe`. Tiempo estimado: 1 hora.

---

## 1. Lo que necesitas antes de empezar

- **Un VPS** con **Ubuntu 24.04**, al menos **2 GB de RAM** y 40–50 GB de disco (DigitalOcean, Hetzner, Contabo, Hostinger VPS, etc.). Anota su **IP pública**.
- **Un dominio** comprado (punto.pe, Namecheap, GoDaddy, etc.) con acceso a su panel de **DNS**.
- **Un correo** para los avisos de los certificados HTTPS.
- Opcional: datos **SMTP** de un correo para que el formulario de contacto envíe emails. Pueden ser los del correo corporativo o una cuenta de Gmail con "contraseña de aplicación".

## 2. Apuntar el dominio al servidor (DNS)

En el panel DNS del dominio crea tres registros **A** con la IP del VPS:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | IP del VPS |
| A | `www` | IP del VPS |
| A | `intranet` | IP del VPS |

La propagación puede tardar desde minutos hasta unas horas. Para comprobarla: `ping intranet.ingelop.pe` debe responder con la IP del VPS.

## 3. Preparar el servidor

Conéctate por SSH (en Windows, desde PowerShell):

```bash
ssh root@IP_DEL_VPS
```

Instala Docker y activa el firewall:

```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Docker (script oficial)
curl -fsSL https://get.docker.com | sh

# Firewall: solo SSH, HTTP y HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# Zona horaria de Perú (para las fechas de los respaldos y registros)
timedatectl set-timezone America/Lima
```

## 4. Descargar el proyecto

```bash
apt install -y git
git clone https://github.com/mpozolucrecivic-tech/INGELOP_EIRL.git /opt/ingelop
cd /opt/ingelop
```

> Si el repositorio es **privado**, GitHub te pedirá usuario y un *token* en lugar de contraseña (GitHub → Settings → Developer settings → Personal access tokens).

## 5. Configurar

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Completa:

- `DOMINIO_WEB` y `DOMINIO_INTRANET`: tus dominios, **sin** `https://`.
- `EMAIL_ACME`: tu correo.
- `POSTGRES_PASSWORD`: generalo con `openssl rand -hex 24`.
- `JWT_SECRET`: generalo con `openssl rand -hex 48`.
- `SMTP_*`: opcionales. Si los dejas vacíos, los mensajes del formulario solo se guardan en el servidor.

Guarda con `Ctrl+O`, `Enter` y sal con `Ctrl+X`. Luego protege el archivo:

```bash
chmod 600 deploy/.env
```

## 6. Levantar todo

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

La primera vez tarda unos minutos, porque compila las imágenes. Para ver que todo esté arriba:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
```

Los 4 servicios (`db`, `api`, `web`, `caddy`) deben aparecer como `running`. Las migraciones de la base de datos se aplican solas al arrancar la API.

Abre `https://TU_DOMINIO` y `https://intranet.TU_DOMINIO`. El candado HTTPS aparece solo; si no, espera un par de minutos a que Caddy obtenga los certificados.

## 7. Crear el administrador

En producción **no** se cargan datos de demostración. Crea tu usuario administrador (usa una contraseña de al menos 10 caracteres):

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec \
  -e ADMIN_PASSWORD='<clave-segura>' api \
  node dist/scripts/crearAdmin.js gerencia@ingelop.pe "Nombre Apellido"
```

Entra a la intranet con ese correo y contraseña. Desde ahí:

1. Crea las cuentas del equipo en **Usuarios**.
2. Registra a los **Clientes** y al **Equipo técnico**.
3. Crea los proyectos.

Si olvidas la contraseña del administrador, vuelve a ejecutar el mismo comando con una nueva.

## 8. Copias de seguridad automáticas

```bash
chmod +x /opt/ingelop/deploy/backup.sh
/opt/ingelop/deploy/backup.sh          # prueba manual
crontab -e                             # elige "nano" si pregunta
```

Agrega esta línea al final (respaldo todos los días a las 2:30 a. m.):

```
30 2 * * * /opt/ingelop/deploy/backup.sh >> /var/log/ingelop-backup.log 2>&1
```

Los respaldos quedan en `/var/backups/ingelop`: base de datos, planos y documentos, y mensajes de la web, de los últimos 14 días.

**Importante:** si el servidor falla, esos respaldos se pierden con él. Descárgalos a tu PC de vez en cuando (desde PowerShell):

```powershell
scp -r root@IP_DEL_VPS:/var/backups/ingelop C:\Respaldos\ingelop
```

También puedes activar los *snapshots* automáticos del proveedor del VPS.

### Restaurar un respaldo

```bash
cd /opt/ingelop
C="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"
# Base de datos (reemplaza el contenido actual)
$C exec -T db pg_restore -U ingelop -d ingelop --clean --if-exists < /var/backups/ingelop/db_FECHA.dump
# Planos y documentos
$C run --rm --no-deps --user root -v /var/backups/ingelop:/respaldo --entrypoint sh api \
  -c "tar xzf /respaldo/uploads_FECHA.tar.gz -C /app"
```

## 9. Actualizar a una nueva versión

Cuando subas cambios a GitHub:

```bash
cd /opt/ingelop
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Los datos (base de datos, planos y certificados) están en volúmenes de Docker y **no se pierden** al actualizar.

## 10. Comandos útiles

```bash
C="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"
$C logs -f api            # registros de la API
$C logs -f caddy          # certificados / HTTPS
$C logs -f web            # web PHP
$C restart api            # reiniciar un servicio
$C exec web cat /var/www/html/storage/mensajes.csv   # mensajes del formulario
```

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El navegador dice "no seguro" o no carga | El DNS aún no apunta al VPS, o los puertos 80/443 están cerrados en el firewall del proveedor |
| `Define POSTGRES_PASSWORD…` al levantar | Falta completar `deploy/.env` |
| Error 413 al subir un plano | El archivo supera `MAX_UPLOAD_MB` (50 MB por defecto) |
| El formulario no envía correos | Revisa los datos `SMTP_*` y `$C exec web cat /var/log/msmtp.log`; los mensajes igual quedan en `mensajes.csv` |
| Cambié `deploy/.env` y no hace efecto | Ejecuta de nuevo el comando `up -d` del paso 6 |
