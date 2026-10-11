<?php
declare(strict_types=1);
// No se aceptan parámetros de vista previa en un recurso público de indexación.
unset($_GET['vista_previa']);
require_once __DIR__ . '/includes/config.php';
$base = (string) (contenido_web()['sitioUrl'] ?? '');
if ($base === '') { http_response_code(503); exit('Sitio temporalmente no disponible'); }
header('Content-Type: application/xml; charset=UTF-8');
echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
$slugs = ['inicio', 'nosotros', 'servicios', 'proyectos', 'contacto'];
foreach ((contenido_web()['cms'] ?? []) as $doc) {
    if (($doc['tipo'] ?? '') === 'pagina') $slugs[] = $doc['slug'];
}
foreach (array_unique($slugs) as $slug) {
    echo '<url><loc>' . htmlspecialchars(rtrim($base, '/') . '/' . cms_url($slug), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>';
}
echo '<url><loc>' . htmlspecialchars(rtrim($base, '/') . '/privacidad.php', ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>';
echo '</urlset>';
