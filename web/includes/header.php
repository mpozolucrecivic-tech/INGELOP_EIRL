<?php
/**
 * Cabecera común. Antes de incluirla, cada página define:
 *   $pagina      = 'inicio' | 'nosotros' | 'servicios' | 'proyectos' | 'contacto'
 *   $titulo      = título del documento (opcional)
 *   $descripcion = meta description (opcional)
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/iconos.php';

$pagina ??= 'inicio';
$titulo = isset($titulo) ? $titulo . ' | ' . EMPRESA['nombre_corto'] : EMPRESA['nombre_corto'] . ' | Consultoría en ingeniería y arquitectura en Chiclayo';
$descripcion ??= EMPRESA['descripcion'];

$menu = [
    'inicio'    => ['Inicio', 'index.php'],
    'nosotros'  => ['Nosotros', 'nosotros.php'],
    'servicios' => ['Servicios', 'servicios.php'],
    'proyectos' => ['Proyectos', 'proyectos.php'],
    'contacto'  => ['Contacto', 'contacto.php'],
];

// Datos estructurados para buscadores (Google: empresa local)
$jsonLd = [
    '@context'  => 'https://schema.org',
    '@type'     => 'ProfessionalService',
    'name'      => EMPRESA['razon_social'],
    'alternateName' => EMPRESA['nombre_corto'],
    'description'   => EMPRESA['descripcion'],
    'taxID'     => EMPRESA['ruc'],
    'telephone' => '+' . EMPRESA['telefono_e164'],
    'email'     => EMPRESA['email'],
    'address'   => [
        '@type' => 'PostalAddress',
        'streetAddress'   => EMPRESA['direccion'],
        'addressLocality' => EMPRESA['distrito'] . ', ' . EMPRESA['ciudad'],
        'addressRegion'   => EMPRESA['region'],
        'addressCountry'  => 'PE',
    ],
    'areaServed' => ['Lambayeque', 'Norte del Perú'],
];

// Si estamos en inicio, activamos la cabecera transparente flotante sobre el hero
$claseCabecera = 'cabecera' . ($pagina === 'inicio' ? ' cabecera--transparente' : '');
?>
<!doctype html>
<html lang="es-PE">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($titulo) ?></title>
    <meta name="description" content="<?= e($descripcion) ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= e($titulo) ?>">
    <meta property="og:description" content="<?= e($descripcion) ?>">
    <meta property="og:locale" content="es_PE">
    <meta name="theme-color" content="#0a0f14">
    <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Se agrega ?v=<?= time() ?> para evitar que el navegador guarde en caché el CSS viejo -->
    <link rel="stylesheet" href="assets/css/estilos.css?v=<?= time() ?>">
    <script type="application/ld+json"><?= json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script>
</head>
<body class="pagina-<?= e($pagina) ?>">
<a class="saltar" href="#contenido">Saltar al contenido</a>

<header class="cabecera cabecera--transparente" id="cabecera">
    <div class="contenedor cabecera__fila">
        <a class="marca" href="index.php" aria-label="<?= e(EMPRESA['razon_social']) ?> – inicio">
            <img src="assets/img/logo.svg" alt="" width="40" height="40">
            <span class="marca__texto">
                <strong>INGELOP</strong>
                <small>Consultores y Ejecutores</small>
            </span>
        </a>

        <nav class="menu" id="menu" aria-label="Principal">
            <ul>
                <?php foreach ($menu as $clave => [$texto, $url]): ?>
                    <li><a href="<?= e($url) ?>"<?= $clave === $pagina ? ' aria-current="page"' : '' ?>><?= e($texto) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </nav>

        <div class="cabecera__acciones" style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="contacto.php" class="boton boton--verde boton--cabecera" style="padding: 0.5rem 1.15rem; font-size: 0.9rem;">
                Escríbenos
            </a>
            <button class="menu__abrir" id="menu-boton" aria-controls="menu" aria-expanded="false" aria-label="Abrir menú">
                <?= icono('menu') ?>
            </button>
        </div>
    </div>
</header>

<main id="contenido">