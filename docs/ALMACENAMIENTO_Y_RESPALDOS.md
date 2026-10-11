# Archivos en Cloudflare R2 y copias de seguridad

## Por qué R2

En el plan gratuito de **Render el disco se borra en cada despliegue o reinicio**: los planos, documentos y fotos subidos se perderían. Por eso, en producción los archivos se guardan en **Cloudflare R2** (compatible con S3; gratis hasta 10 GB y sin costo por descarga). En local se sigue usando el disco (`backend/uploads`).

La API funciona igual en los dos modos (la base de datos guarda la misma "key" del archivo). El cambio es solo de configuración: `STORAGE_DRIVER=local` o `STORAGE_DRIVER=s3`.

Garantías que se mantienen en R2:
- **Subida:** el archivo se sube al bucket **antes** de guardar el registro; si algo falla (formato falso, permisos, base de datos), se borra del bucket y del disco temporal.
- **Eliminación de documentos:** el archivo pasa a `papelera/`; si falla la base de datos vuelve a su lugar, si no, se borra.
- **Descargas:** siempre por la API, con permisos y auditoría. El bucket **no** es público.

## Configurar R2 (una sola vez)

1. Crea una cuenta en <https://dash.cloudflare.com> y entra a **R2 Object Storage** (pide registrar un medio de pago, pero el plan gratuito no cobra hasta 10 GB).
2. **Create bucket** → nombre, por ejemplo `ingelop-archivos`. Déjalo **privado** (no actives el acceso público).
3. **Manage R2 API Tokens → Create API token**:
   - Permisos: **Object Read & Write**.
   - Alcance: solo el bucket `ingelop-archivos`.
   - Copia el **Access Key ID**, el **Secret Access Key** y el **endpoint** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (solo se muestran una vez).
4. En **Render → Environment**, agrega:

   ```
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=ingelop-archivos
   S3_ACCESS_KEY_ID=<access key id>
   S3_SECRET_ACCESS_KEY=<secret access key>
   ```

   Si falta alguna con `STORAGE_DRIVER=s3`, la API no arranca y dice cuál.
5. Despliega y prueba: sube un documento en la intranet, revisa que aparezca en el bucket (Cloudflare → R2 → tu bucket) y descárgalo.

> Probado en local con un servidor compatible con S3: las 277 pruebas e2e pasan en modo `s3`, los archivos quedan en el bucket, se descargan idénticos y un archivo rechazado no deja nada.

## Copias de seguridad

`deploy/respaldo.ps1` copia **la base de datos (Neon)** y **los archivos (R2)** a un `.zip` en tu PC. Usa Docker Desktop (no hay que instalar PostgreSQL ni rclone).

### Configurar

1. Copia `deploy/respaldo.env.example` a `deploy/respaldo.env` (no se sube a Git) y completa:
   - `DATABASE_URL`: la cadena de conexión de Neon (panel de Neon → **Connection string**, con `sslmode=require`).
   - `RESPALDO_IMAGEN_PG`: imagen de PostgreSQL **de la misma versión o mayor** que la de Neon (Neon la muestra en el panel; por defecto `postgres:17-alpine`).
   - Datos de R2: los mismos que usa la API. Puedes crear un token de **solo lectura** para el respaldo.
2. Ejecuta (con Docker Desktop abierto):

   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy\respaldo.ps1
   ```

   Resultado: `backups\ingelop_respaldo_AAAAMMDD_HHMM.zip` con `base-de-datos.dump` y la carpeta `archivos\`. Conserva las últimas `RESPALDO_CONSERVAR` copias (14 por defecto) y escribe un registro en `backups\respaldo.log`. Si algo falla, termina con error y **no** deja una copia incompleta.

3. **Guarda una copia fuera de tu PC** (un disco externo o una nube personal): el `.zip` contiene datos personales y documentos de proyectos.

### Programarlo (Programador de tareas de Windows)

Una vez por semana, los lunes a las 8:00 (con la PC encendida y Docker Desktop abierto):

```powershell
schtasks /Create /TN "INGELOP respaldo" /SC WEEKLY /D MON /ST 08:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\lucre\Ingelop_EIRL\deploy\respaldo.ps1"
```

Para revisarla o quitarla: **Programador de tareas → Biblioteca → INGELOP respaldo**.

> Neon guarda además su propio historial de cambios por un tiempo limitado según el plan (restauración a un momento anterior desde su panel). No reemplaza a estas copias.

## Restaurar

> Restaurar **reemplaza** los datos actuales. Hazlo primero en una base de prueba si no estás segura.

1. Descomprime el `.zip`, por ejemplo en `C:\restaurar`.
2. **Base de datos.** Usa la **misma imagen** de PostgreSQL con la que se hizo la copia (`pg_restore` no lee copias de una versión más nueva):

   ```powershell
   # a) En una base nueva y vacía (recomendado: crea una base o rama nueva en Neon y usa su URL)
   docker run --rm -v "C:\restaurar:/r" postgres:17-alpine pg_restore --no-owner -d "<URL de la base destino>" /r/base-de-datos.dump

   # b) Sobre la base existente, borrando y recreando sus objetos
   docker run --rm -v "C:\restaurar:/r" postgres:17-alpine pg_restore --no-owner --clean --if-exists -d "<URL de la base destino>" /r/base-de-datos.dump
   ```

   Se restauran también las protecciones de la auditoría (los triggers que impiden modificarla). Si restauras sobre un PostgreSQL más antiguo puede aparecer un aviso sobre `transaction_timeout`: es inofensivo.

3. **Archivos.** Súbelos de nuevo al bucket con rclone (mismos datos de R2, con un token de lectura y escritura):

   ```powershell
   docker run --rm -v "C:\restaurar\archivos:/archivos" `
     -e RCLONE_S3_PROVIDER=Cloudflare -e RCLONE_S3_ENDPOINT=<endpoint> `
     -e RCLONE_S3_ACCESS_KEY_ID=<id> -e RCLONE_S3_SECRET_ACCESS_KEY=<secreto> `
     rclone/rclone copy /archivos :s3:ingelop-archivos
   ```

   Si usas disco local (`STORAGE_DRIVER=local`), copia el contenido de `archivos\` a `backend\uploads\`.
4. Verifica la integridad de la auditoría restaurada:

   ```powershell
   node dist/scripts/verificarAuditoria.js    # en Render: desde la consola Shell
   ```

> Probado: una copia generada con este script se restauró en una base temporal con los mismos registros (clientes, proyectos, documentos, auditoría y usuarios) y con la protección de la auditoría activa.

**VPS con Docker:** si la empresa usa el despliegue de `deploy/docker-compose.prod.yml`, sigue disponible `deploy/backup.sh` (base de datos, volumen de archivos y mensajes de la web).
