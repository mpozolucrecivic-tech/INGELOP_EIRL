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

- **Datos de contacto:** teléfono, correo, dirección y horario.
- **`intranet_url`:** dirección de la intranet. Cámbiala al publicar.
- **`SERVICIOS`** y **`ESPECIALIDADES_OSCE`:** textos de servicios y especialidades.
- **`PROYECTOS`:** agrega aquí los proyectos reales. Las fotos van en `assets/img/proyectos/`. Mientras la lista esté vacía, la página muestra los tipos de proyecto que desarrolla la empresa.

## Formulario de contacto

- Envía el mensaje con `mail()` al correo de `config.php`. La mayoría de hostings compartidos lo permiten.
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
3. En `includes/config.php`, pon la dirección real de la intranet en `intranet_url`.
4. Activa **HTTPS** (Let's Encrypt suele ser gratuito en cPanel).
5. Recomendado: crea un correo del dominio (ej. `contacto@tudominio.pe`) y úsalo en `config.php`.
