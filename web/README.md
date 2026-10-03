# Web informativa – INGELOP (PHP)

Sitio público de **INGELOP Consultores y Ejecutores E.I.R.L.** (Chiclayo), hecho en PHP puro. No necesita base de datos ni instalar dependencias.

## Páginas

| Archivo | Contenido |
|---|---|
| `index.php` | Inicio: servicios, especialidades del OSCE, forma de trabajo |
| `nosotros.php` | Quiénes somos, datos de la empresa (RUC, RNP) y especialidades con su categoría |
| `servicios.php` | Detalle de los 6 servicios y componentes de un expediente técnico |
| `proyectos.php` | Proyectos realizados (o tipos de proyecto mientras no se carguen) |
| `contacto.php` | Formulario, WhatsApp, teléfono, correo, dirección y horario |
| `404.php` | Página de error |

## Editar contenido

Todo lo que cambia con frecuencia está en **`includes/config.php`**:

- **Datos de contacto y proyectos realizados:** ya no se editan aquí, sino en la intranet (**Página web → Datos de la empresa / Proyectos realizados**). Solo se muestra lo que esté marcado como *Publicar en la web*; si el WhatsApp está oculto, desaparecen todos sus botones. `email_formulario` es el correo que recibe los mensajes del respaldo PHP (no se publica).
- La web **no enlaza a la intranet** (se quitó "Acceso del personal"): el personal entra directamente con la dirección de la intranet.
- **`includes/api.php`:** dirección de la API (`API_URL`). Es el único lugar donde se cambia. Ver "Conexión con la API".
- **`SERVICIOS`** y **`ESPECIALIDADES_OSCE`:** textos de servicios y especialidades.

## Conexión con la API

- **Servicios:** las páginas muestran primero los servicios fijos de `config.php` (`SERVICIOS`), y `assets/js/servicios.js` los reemplaza por los que se gestionan en la intranet. Si la API no responde, se quedan los fijos. Conviene mantener `SERVICIOS` parecido a lo que hay en la intranet.
- **Foto de servicio:** si el servicio tiene foto, se muestra en lugar del ícono (`assets/css/conexion-api.css`).
- **Formulario:** `assets/js/contacto.js` lo envía a la API y los mensajes se leen en la intranet (**Mensajes de la web**).
- Si `API_URL` se deja vacío en `includes/api.php`, la web funciona como antes, solo con PHP.
- El dominio de la web debe estar en `CORS_ORIGIN` del backend.

- **Datos y proyectos realizados:** el PHP los pide a la API antes de enviar la página (máximo 3 s) y guarda una copia en `storage/cache/web.json`. Si la API no responde, usa la copia y espera 60 s antes de reintentar. La carpeta `storage/` está bloqueada al navegador: comprueba que `storage/cache/web.json` responda 403 en el hosting.

## Formulario de contacto (respaldo por PHP)

Se usa cuando la API no responde o el navegador no tiene JavaScript:

- Envía el mensaje con `mail()` al correo `email_formulario` de `config.php`. La mayoría de hostings compartidos lo permiten.
- Además, **siempre** lo guarda en `storage/mensajes.csv`, por si el correo falla. La carpeta está bloqueada al público y el archivo se abre con Excel.
- Protecciones: token CSRF, campo trampa contra bots, límite de un envío cada 30 segundos y validación de todos los campos.

## Probar en local

No hace falta instalar PHP: desde la carpeta raíz del proyecto, con Docker Desktop abierto:

```powershell
docker compose up -d web
```

Luego abre **http://localhost:8080**. En local, `mail()` no envía correos, pero los mensajes quedan en `storage/mensajes.csv`.

## Publicar en un hosting (cPanel u otro con PHP 8.1+)

1. Sube **todo el contenido de la carpeta `web/`** a `public_html/`, incluidos `.htaccess` y `storage/.htaccess`.
2. Verifica que `storage/` tenga permisos de escritura (755, o 775 según el hosting).
3. En `includes/api.php`, pon la dirección de la API (`API_URL`).
4. Activa **HTTPS** (Let's Encrypt suele ser gratuito en cPanel).
5. Recomendado: crea un correo del dominio (ej. `contacto@tudominio.pe`) y úsalo en `config.php`.
