<?php
/**
 * robots.txt dinámico (.htaccess redirige /robots.txt aquí).
 * La línea Sitemap debe ser una URL completa: se toma de CMS_WEB_URL (sitioUrl de la API)
 * o, si no hay API, del dominio de la petición.
 */
declare(strict_types=1);
unset($_GET['vista_previa']);
require_once __DIR__ . '/includes/config.php';
header('Content-Type: text/plain; charset=UTF-8');

$base = (string) (contenido_web()['sitioUrl'] ?? '');
if ($base === '') {
    $esquema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = preg_replace('/[^a-zA-Z0-9.:-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
    $base = $host !== '' ? $esquema . '://' . $host : '';
}

echo "User-agent: *\n";
echo "Disallow: /includes/\n";
echo "Disallow: /storage/\n";
if ($base !== '') echo "\nSitemap: " . rtrim($base, '/') . "/sitemap.php\n";
