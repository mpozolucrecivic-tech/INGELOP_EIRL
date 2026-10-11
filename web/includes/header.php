<?php
/**
 * Cabecera común. Antes de incluirla, cada página define:
 *   $pagina      = 'inicio' | 'nosotros' | 'servicios' | 'proyectos' | 'contacto'
 *   $titulo      = título del documento (opcional)
 *   $descripcion = meta description (opcional)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/iconos.php';
require_once __DIR__ . '/api.php';

$pagina ??= 'inicio';
$cmsPagina = cms_documento('pagina.' . $pagina);
$cmsMarca = cms_documento('configuracion');
if ($cmsPagina) { $titulo = $cmsPagina['titulo']; $descripcion = $cmsPagina['descripcion']; }
$titulo = isset($titulo) ? $titulo . ' | ' . EMPRESA['nombre_corto'] : EMPRESA['nombre_corto'] . ' | Consultoría en ingeniería y arquitectura en Chiclayo';
$descripcion ??= EMPRESA['descripcion'];

$menu = [
    'inicio'    => ['Inicio', 'index.php'],
    'nosotros'  => ['Nosotros', 'nosotros.php'],
    'servicios' => ['Servicios', 'servicios.php'],
    'proyectos' => ['Proyectos', 'proyectos.php'],
    'contacto'  => ['Contacto', 'contacto.php'],
];

if ($cmsMarca !== null) {
    $menu = [];
    foreach ($cmsMarca['menu'] as $item) {
        $slug = $item['slug'];
        if (in_array($slug, ['inicio', 'nosotros', 'servicios', 'proyectos', 'contacto'], true) || cms_documento('pagina.' . $slug))
            $menu[$slug] = [$item['etiqueta'], cms_url($slug)];
    }
}
$cmsLogo = !empty($cmsMarca['logoId']) ? cms_medio_url((int) $cmsMarca['logoId']) : 'assets/img/logo.svg';
$cmsSitioUrl = (string) (contenido_web()['sitioUrl'] ?? '');
$cmsCanonical = $cmsSitioUrl !== '' ? rtrim($cmsSitioUrl, '/') . '/' . cms_url($pagina) : '';
// Datos estructurados para buscadores (Google: empresa local)
$jsonLd = [
    '@context'  => 'https://schema.org',
    '@type'     => 'ProfessionalService',
    'name'      => EMPRESA['razon_social'],
    'alternateName' => EMPRESA['nombre_corto'],
    'description'   => EMPRESA['descripcion'],
    'taxID'     => EMPRESA['ruc'],
    // Teléfono, correo y calle solo si están publicados en config.php
    'telephone' => EMPRESA['telefono'] !== '' ? telefono_enlace() : null,
    'email'     => EMPRESA['email'] !== '' ? EMPRESA['email'] : null,
    'address'   => array_filter([
        '@type' => 'PostalAddress',
        'streetAddress'   => EMPRESA['direccion'] !== '' ? EMPRESA['direccion'] : null,
        'addressLocality' => implode(', ', array_filter([EMPRESA['distrito'], EMPRESA['ciudad']], fn ($v) => $v !== '')),
        'addressRegion'   => EMPRESA['region'],
        'addressCountry'  => 'PE',
    ]),
    'areaServed' => ['Lambayeque', 'Norte del Perú'],
    'sameAs'     => array_values(array_filter([EMPRESA['facebook'], EMPRESA['linkedin']])) ?: null,
];
$jsonLd = array_filter($jsonLd, fn ($v) => $v !== null);
?>
<!doctype html>
<html lang="es-PE">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php if (isset($_GET['vista_previa'])): ?><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex, nofollow"><?php endif; ?>
    <title><?= e($titulo) ?></title>
    <meta name="description" content="<?= e($descripcion) ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= e($titulo) ?>">
    <meta property="og:description" content="<?= e($descripcion) ?>">
    <meta property="og:locale" content="es_PE">
    <?php if ($cmsCanonical !== ''): ?><link rel="canonical" href="<?= e($cmsCanonical) ?>"><meta property="og:url" content="<?= e($cmsCanonical) ?>"><?php endif; ?>
    <?php if (!empty($cmsPagina['imagenSocialId'])): ?><meta property="og:image" content="<?= e(cms_medio_url((int) $cmsPagina['imagenSocialId'])) ?>"><?php endif; ?>
    <meta name="theme-color" content="#0f172a">
    <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/estilos.css?v=1">
    <link rel="stylesheet" href="assets/css/conexion-api.css?v=1">
    <script type="application/ld+json"><?= json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
</head>
<body data-servicios-servidor="1" class="pagina-<?= e($pagina) ?>"<?= API_URL !== '' ? ' data-api="' . e(API_URL) . '"' : '' ?>>
<a class="saltar" href="#contenido">Saltar al contenido</a>

<header class="cabecera" id="cabecera">
    <div class="contenedor cabecera__fila">
        <a class="marca" href="index.php" aria-label="<?= e(EMPRESA['razon_social']) ?> – inicio">
            <img src="<?= e($cmsLogo) ?>" alt="" width="40" height="40">
            <span class="marca__texto">
                <strong><?= e(EMPRESA['nombre_corto']) ?></strong>
                <small><?= e($cmsMarca['subtitulo'] ?? 'Consultores y Ejecutores') ?></small>
            </span>
        </a>

        <nav class="menu" id="menu" aria-label="Principal">
            <ul>
                <?php foreach ($menu as $clave => [$texto, $url]): ?>
                    <li><a href="<?= e($url) ?>"<?= $clave === $pagina ? ' aria-current="page"' : '' ?>><?= e($texto) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </nav>

        <button class="menu__abrir" id="menu-boton" aria-controls="menu" aria-expanded="false" aria-label="Abrir menú">
            <?= icono('menu') ?>
        </button>
    </div>
</header>

<main id="contenido">

<?php
if ($cmsPagina !== null) {
    cms_renderizar($cmsPagina);
    require __DIR__ . '/footer.php';
    exit;
}
?>
