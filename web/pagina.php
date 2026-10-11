<?php
declare(strict_types=1);
$pagina = (string) ($_GET['slug'] ?? '');
if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $pagina) || strlen($pagina) > 80) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}
// El contacto debe inicializar sesión, CSRF y procesamiento del formulario.
if ($pagina === 'contacto') { require __DIR__ . '/contacto.php'; exit; }
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/cms.php';
if (!cms_documento('pagina.' . $pagina)) {
    $originales = ['inicio' => 'index.php', 'nosotros' => 'nosotros.php', 'servicios' => 'servicios.php', 'proyectos' => 'proyectos.php'];
    if (isset($originales[$pagina])) { require __DIR__ . '/' . $originales[$pagina]; exit; }
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}
require __DIR__ . '/includes/header.php';
