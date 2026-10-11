# Web informativa – INGELOP (PHP)

Sitio público de **INGELOP Consultores y Ejecutores E.I.R.L.** (Chiclayo), hecho en PHP puro. Consume el CMS de la API; no se conecta directamente a la base de datos ni necesita dependencias PHP adicionales. Puede operar con las plantillas originales al desactivar la API.

## Páginas

| Archivo | Contenido |
|---|---|
| `index.php` | Inicio: servicios, especialidades del OSCE, forma de trabajo |
| `nosotros.php` | Quiénes somos, datos de la empresa (RUC, RNP) y especialidades con su categoría |
| `servicios.php` | Detalle de los 6 servicios y componentes de un expediente técnico |
| `proyectos.php` | Proyectos realizados (o tipos de proyecto mientras no se carguen) |
| `contacto.php` | Formulario, WhatsApp, teléfono, correo, dirección y horario |
| `404.php` | Página de error |
| `pagina.php?slug=equipo` | Páginas adicionales publicadas desde el CMS |
| `sitemap.php` | Sitemap de páginas originales y páginas CMS publicadas |

## Editar contenido

Las páginas, sus textos e imágenes, los metadatos, la marca y el menú se preparan desde **Página web → Editor de páginas**, con borradores, vista previa y publicación separada. Las imágenes se reutilizan desde **Biblioteca de imágenes**. Ver [`../docs/CMS.md`](../docs/CMS.md).

**`includes/config.php`** conserva los datos registrales y las plantillas de respaldo:

- **Datos de contacto y proyectos realizados:** ya no se editan aquí, sino en la intranet (**Página web → Datos de la empresa / Proyectos realizados**). Solo se muestra lo que esté marcado como *Publicar en la web*; si el WhatsApp está oculto, desaparecen todos sus botones. `email_formulario` es el correo que recibe los mensajes del respaldo PHP (no se publica).
- La web **no enlaza a la intranet** (se quitó "Acceso del personal"): el personal entra directamente con la dirección de la intranet.
- **`includes/api.php`:** dirección de la API (`API_URL`). Es el único lugar donde se cambia. Ver "Conexión con la API".
- **`SERVICIOS`:** la lista procede de la API; los valores fijos solo se utilizan con `API_URL` vacío. **`ESPECIALIDADES_OSCE`:** datos de las plantillas originales.

## Conexión con la API

- **Servicios:** se generan en PHP con la lista de la API, incluidas las fotos. Una lista vacía muestra cero servicios. Si la API falla, se usa la última copia; sin copia se muestran los servicios fijos de `config.php`.
- **Foto de servicio:** si el servicio tiene foto, se muestra en lugar del ícono (`assets/css/conexion-api.css`).
- **Formulario:** `assets/js/contacto.js` lo envía a la API y los mensajes se leen en la intranet (**Mensajes de la web**).
- Si `API_URL` se deja vacío en `includes/api.php`, la web funciona como antes, solo con PHP.
- El dominio de la web debe estar en `CORS_ORIGIN` del backend.

- **Contenido público:** el PHP pide datos, proyectos, servicios y documentos publicados a la API antes de enviar la página (máximo 3 s) y guarda una copia en `storage/cache/web.json`. Si la API no responde, usa la copia (sin vencimiento) y espera 60 s antes de reintentar. Las vistas previas nunca se guardan en esta copia. La carpeta `storage/` está bloqueada al navegador: comprueba que `storage/cache/web.json` responda 403 en el hosting.

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
