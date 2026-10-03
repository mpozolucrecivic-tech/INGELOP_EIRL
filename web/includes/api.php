<?php
/**
 * Conexión de la web con la API de INGELOP. ÚNICO lugar donde se define su dirección.
 *
 *   Local:       http://localhost:4000/api/v1
 *   Producción:  https://<tu-servicio>.onrender.com/api/v1   (siempre HTTPS si la web usa HTTPS)
 *
 * En el servidor también se puede definir con la variable de entorno API_URL (tiene prioridad).
 * Dejar vacío ('') para no usar la API: la web muestra los servicios fijos de config.php
 * y el formulario se procesa solo con PHP.
 *
 * Importante: el dominio de esta web debe estar en CORS_ORIGIN del backend.
 */

declare(strict_types=1);

/** Íconos que se pueden asignar a un servicio desde la intranet (nombres de includes/iconos.php) */
const ICONOS_SERVICIO = ['lupa', 'carpeta', 'compas', 'casco', 'check', 'chat', 'edificio', 'agua', 'via', 'rayo', 'represa', 'escudo', 'regla', 'usuario', 'flecha'];

define('API_URL', rtrim(getenv('API_URL') !== false ? (string) getenv('API_URL') : 'http://localhost:4000/api/v1', '/'));

// Dirección que usa el PROPIO SERVIDOR PHP para leer la API. Normalmente es la misma (InfinityFree, Render).
// Solo cambia dentro de Docker, donde "localhost" es el contenedor: ver docker-compose.yml.
define('API_URL_SERVIDOR', rtrim(getenv('API_URL_SERVIDOR') !== false ? (string) getenv('API_URL_SERVIDOR') : API_URL, '/'));

// ---------------------------------------------------------------------------
// Contenido editable desde la intranet (datos de contacto publicados y proyectos realizados).
// El PHP lo pide a la API ANTES de enviar la página (lo ven Google y los visitantes sin esperar).
//
//  - Tiempo máximo de espera: 3 s.
//  - Si la API responde bien, se usa y se actualiza la copia de respaldo.
//  - Si no responde, se usa la copia de respaldo; y durante 60 s no se vuelve a intentar,
//    para que los visitantes no esperen 3 s cada uno mientras la API está caída o "dormida".
//  - La copia vive en storage/cache/ (bloqueada al navegador por storage/.htaccess y fuera de Git).
// ---------------------------------------------------------------------------

const API_TIEMPO_MAX = 3;          // segundos
const API_PAUSA_TRAS_FALLO = 60;   // segundos
define('CACHE_DIR', dirname(__DIR__) . '/storage/cache');
define('CACHE_WEB', CACHE_DIR . '/web.json');
define('CACHE_FALLO', CACHE_DIR . '/web.fallo');

/**
 * Datos publicados y proyectos realizados: ['datos' => [clave => valor], 'proyectos' => [...]].
 * null si no hay API configurada ni copia de respaldo (la web usa entonces los valores de config.php).
 */
function contenido_web(): ?array
{
    static $cargado = false, $contenido = null;
    if ($cargado) return $contenido;
    $cargado = true;

    if (API_URL === '') return null;
    if (!is_dir(CACHE_DIR)) @mkdir(CACHE_DIR, 0750, true);

    $enPausa = is_file(CACHE_FALLO) && time() - (int) @filemtime(CACHE_FALLO) < API_PAUSA_TRAS_FALLO;
    if (!$enPausa) {
        $respuesta = pedir_api('/web');
        if ($respuesta !== null && is_array($respuesta['datos'] ?? null) && is_array($respuesta['proyectos'] ?? null)) {
            guardar_copia($respuesta);
            @unlink(CACHE_FALLO);
            return $contenido = $respuesta;
        }
        @touch(CACHE_FALLO);
    }
    return $contenido = leer_copia();
}

/** GET a la API con tiempo límite; devuelve el JSON decodificado o null si falla */
function pedir_api(string $ruta): ?array
{
    $url = API_URL_SERVIDOR . $ruta;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => API_TIEMPO_MAX,
            CURLOPT_TIMEOUT        => API_TIEMPO_MAX,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_USERAGENT      => 'INGELOP-web',
        ]);
        $cuerpo = curl_exec($ch);
        $codigo = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $contexto = stream_context_create(['http' => ['timeout' => API_TIEMPO_MAX, 'ignore_errors' => true, 'header' => "Accept: application/json\r\n"]]);
        $cuerpo = @file_get_contents($url, false, $contexto);
        $codigo = isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) ? (int) $m[1] : 0;
    }
    if ($cuerpo === false || $codigo !== 200) return null;
    $json = json_decode((string) $cuerpo, true);
    return is_array($json) ? $json : null;
}

/** Escribe la copia de forma atómica (archivo temporal + rename) para no dejarla a medias */
function guardar_copia(array $contenido): void
{
    $tmp = CACHE_WEB . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, json_encode($contenido, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false) {
        @rename($tmp, CACHE_WEB);
    }
    @unlink($tmp);
}

function leer_copia(): ?array
{
    if (!is_file(CACHE_WEB)) return null;
    $json = json_decode((string) @file_get_contents(CACHE_WEB), true);
    return is_array($json) ? $json : null;
}
