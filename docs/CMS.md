# CMS de INGELOP

La intranet incluye un editor de páginas conectado a la web PHP. Los módulos de proyectos, clientes, planos y presupuestos conservan su función de gestión interna.

## Activación

Con PostgreSQL disponible, desde la raíz:

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:deploy
npm run build
```

Reinicia la API y la intranet. En `backend/.env`, configura `CMS_WEB_URL` con la dirección pública de la web PHP; en local es `http://localhost:8080`. Esta dirección se utiliza para las vistas previas, las URLs canónicas y `sitemap.php`. El despliegue Docker de producción toma el valor de `DOMINIO_WEB` automáticamente y aplica las migraciones al arrancar la API.

La migración agrega tres tablas y el permiso `Usuario.puedeEditarWeb`; no borra ni transforma los datos operativos existentes. Aplica primero la migración y arranca después la nueva API, porque la autenticación ahora consulta ese campo.

## Preparar y publicar contenido

1. Entra en **Página web → Editor de páginas**. Hay documentos iniciales para las cinco páginas actuales y para **Marca y menú**.
2. Edita títulos, descripciones para buscadores y secciones. Cada sección puede contener texto e imagen, servicios, proyectos realizados o el formulario de contacto. El formulario solo se permite en la página `contacto`.
3. Ordena las secciones, oculta las que no quieras mostrar y configura botones con enlaces HTTPS o páginas locales `.php`.
4. Pulsa **Guardar borrador**. La versión publicada sigue siendo la misma.
5. Pulsa **Vista previa** y abre el enlace. Dura diez minutos y deja de ser válido si cambia el documento o se revoca el acceso de su autor.
6. La jefatura pulsa **Publicar**. La web mostrará las secciones del documento editorial en lugar del cuerpo de la plantilla original.

Los documentos iniciales ofrecen textos de partida; no son una copia visual exacta de las plantillas PHP originales. Revisa las secciones en vista previa antes de su primera publicación. Hasta publicar, las páginas originales conservan su cuerpo anterior.

Para crear una página, escribe una URL como `equipo` o `preguntas-frecuentes`, pulsa **Crear página**, añade sus secciones y guarda. Su dirección será `pagina.php?slug=equipo`. Publica primero la página y después añádela al documento **Marca y menú**. Los enlaces a páginas nuevas sin publicar no se muestran en la navegación pública.

**Marca y menú** permite cambiar nombre, subtítulo, descripción, logo y etiquetas, orden y destinos del menú. La razón social, RUC y datos registrales de las plantillas originales siguen definidos en `web/includes/config.php`.

**Retirar publicación** conserva el borrador y el historial. Las páginas nuevas dejan de estar disponibles; las cinco páginas originales recuperan su plantilla anterior. No equivale a eliminar la ruta original del sitio.

## Historial y cambios simultáneos

Cada guardado, publicación, retirada y restauración conserva contenido, acción, fecha y autor. El editor muestra las últimas cien revisiones. **Restaurar como borrador** recupera una revisión sin reemplazar automáticamente lo publicado.

Las operaciones incluyen la versión que el editor abrió. Si otro usuario modificó el documento, la API responde `409` para impedir una sobrescritura silenciosa. Copia tus cambios pendientes, recarga y combínalos con la versión nueva.

## Biblioteca de imágenes

En **Biblioteca de imágenes**, sube JPG, PNG o WEBP y añade un texto alternativo. Puedes reutilizar cada imagen en varias secciones, como logo o como imagen social. El tamaño máximo se configura con `MAX_FOTO_MB` (5 MB por defecto); se comprueba extensión, MIME y firma del archivo.

Las imágenes se guardan en el almacenamiento existente (`uploads/cms`). Las miniaturas administrativas requieren autenticación. Una imagen solo se sirve públicamente cuando algún documento publicado la utiliza; las vistas previas autorizadas también pueden mostrar sus imágenes de borrador. No se incluye eliminación de imágenes para preservar las referencias de las revisiones históricas.

## Permisos

- **Jefatura (`ADMIN`):** editar, revisar, publicar, retirar y gestionar accesos.
- **Usuario con “Puede preparar páginas…”:** editar páginas y marca, restaurar borradores, generar vistas previas y gestionar la biblioteca; no puede publicar ni acceder a la administración de usuarios.
- **Usuario sin ese permiso:** conserva su acceso habitual a los proyectos asignados.

La jefatura asigna el permiso en **Accesos a la intranet**. El usuario debe recargar su sesión para que aparezcan las nuevas opciones del menú. Los permisos del servidor y la desactivación de cuentas se verifican en cada petición autenticada; no es necesario esperar a que expire el JWT para retirar su acceso.

Los módulos existentes **Servicios**, **Proyectos realizados** y **Datos de la empresa** mantienen sus controles de visibilidad y sus cambios directos. El flujo de borrador, historial y publicación del nuevo editor se aplica a páginas y configuración de marca/menú, no a los registros de esos módulos. Por ello, cambiar un servicio actualiza su listado en todas las páginas que lo muestran.

## Web pública y respaldo

El PHP lee `GET /api/v1/web` antes de generar HTML. La respuesta contiene datos de contacto, proyectos, servicios, documentos publicados, imágenes referenciadas y URL pública. Los servicios también se renderizan en el servidor, incluidas sus fotos; ya no dependen de un reemplazo posterior por JavaScript.

Una respuesta con `servicios: []` muestra cero servicios. Si la API está configurada pero no responde y no hay copia vigente, no se restauran los servicios fijos. Estos solo se usan cuando `API_URL` se deja vacío para operar la web original sin conexión a la API.

La última respuesta buena puede utilizarse durante un máximo de cinco minutos si la API falla. En ese intervalo puede seguir apareciendo una publicación que se acaba de retirar. Los borradores de vista previa nunca se escriben en esa copia: usan una respuesta privada sin caché, con `noindex` y `Referrer-Policy: no-referrer`.

`sitemap.php` incluye las páginas originales y las páginas adicionales publicadas. No acepta vista previa. Los títulos, descripciones, imagen social y URL canónica se generan en PHP.

## Verificación

```powershell
npm run build
npm run test:cms
# PHP debe estar en PATH, o indicar su ejecutable:
$env:PHP_BIN = 'C:\xampp\php\php.exe'
npm run test:cms:web
```

`test:cms` prueba validación de contenido e imágenes y el flujo HTTP de permisos, publicación, borradores, conflictos, restauración y vistas previas con persistencia simulada. No prueba PostgreSQL ni aplica migraciones.

`test:cms:web` levanta PHP contra una API de prueba y usa una copia temporal de `web/`. Comprueba renderizado, escape de textos, formulario y CSRF, SEO, sitemap, lista vacía de servicios, caducidad de caché y aislamiento de vistas previas. No envía correos ni toca mensajes o caché reales.

Con la API y PostgreSQL disponibles, ejecuta además la colección existente con `npm run test:e2e` en una base de pruebas. La comprobación de despliegue debe incluir aplicar la migración y recorrer el editor con una cuenta administrativa y otra con permiso de editor.
