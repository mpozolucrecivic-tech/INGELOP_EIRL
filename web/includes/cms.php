<?php
declare(strict_types=1);

function cms_documento(string $clave): ?array
{
    $doc = contenido_web()['cms'][$clave] ?? null;
    return is_array($doc) ? $doc : null;
}

function cms_url(string $slug): string
{
    if ($slug === 'inicio') return 'index.php';
    if (in_array($slug, ['nosotros', 'servicios', 'proyectos', 'contacto'], true)) return $slug . '.php';
    return 'pagina.php?slug=' . rawurlencode($slug);
}

function cms_medio_url(?int $id): string
{
    if (!$id) return '';
    $url = API_URL . '/cms/medios/' . $id . '/archivo';
    if (isset($_GET['vista_previa'])) $url .= '?vista_previa=' . rawurlencode((string) $_GET['vista_previa']);
    return $url;
}

function cms_alt(int $id): string
{
    foreach ((contenido_web()['medios'] ?? []) as $medio) {
        if ((int) $medio['id'] === $id) return (string) ($medio['textoAlternativo'] ?? '');
    }
    return '';
}

function cms_enlace_seguro(string $url): bool
{
    return (bool) preg_match('~^(https://[^\s]+|[a-z0-9-]+\.php(?:[?#][a-zA-Z0-9%=&_#.-]*)?)$~', $url);
}

function cms_renderizar(array $doc): void
{
    global $pagina, $datos, $errores, $enviado, $servicios, $tipos, $error, $mapa;
    if (isset($_GET['vista_previa'])) echo '<div class="contenedor" role="status"><p class="alerta">Vista previa del borrador · este contenido todavía no está publicado.</p></div>';
    $primero = true;
    foreach (($doc['bloques'] ?? []) as $b) {
        if (!($b['visible'] ?? false)) continue;
        echo '<section class="seccion"><div class="contenedor texto-largo">';
        $tag = $primero ? 'h1' : 'h2';
        $titulo = (string) ($b['titulo'] ?? '');
        if ($titulo !== '') { echo '<' . $tag . '>' . e($titulo) . '</' . $tag . '>'; $primero = false; }
        foreach (preg_split('/\R\s*\R/', (string) ($b['texto'] ?? '')) as $parrafo) {
            if (trim($parrafo) !== '') echo '<p>' . nl2br(e($parrafo)) . '</p>';
        }
        if (!empty($b['medioId'])) {
            echo '<img class="cms-imagen" src="' . e(cms_medio_url((int) $b['medioId'])) . '" alt="' . e(cms_alt((int) $b['medioId'])) . '" loading="lazy">';
        }
        if (($b['tipo'] ?? '') === 'servicios') {
            echo '<div class="tarjetas tarjetas--3">';
            foreach (SERVICIOS as $s) {
                echo '<article class="tarjeta" id="' . e($s['slug']) . '">';
                if (!empty($s['foto'])) echo '<img class="cms-imagen" src="' . e($s['foto']) . '" alt="' . e($s['titulo']) . '" loading="lazy">';
                echo '<h2>' . e($s['titulo']) . '</h2><p>' . e($s['resumen']) . '</p><ul class="lista-check">';
                foreach ($s['items'] as $item) echo '<li>' . e($item) . '</li>';
                echo '</ul><a class="enlace" href="contacto.php?servicio=' . e($s['slug']) . '">Cotizar este servicio</a></article>';
            }
            echo '</div>';
        } elseif (($b['tipo'] ?? '') === 'portafolio') {
            echo '<div class="tarjetas tarjetas--3">';
            foreach (proyectos_realizados() as $p) {
                echo '<article class="tarjeta">';
                if ($p['imagen'] !== '') echo '<img class="cms-imagen" src="' . e($p['imagen']) . '" alt="' . e($p['titulo']) . '" loading="lazy">';
                echo '<h2>' . e($p['titulo']) . '</h2><p>' . e(implode(' · ', array_filter([$p['cliente'], $p['ubicacion'], $p['anio'], $p['servicio']]))) . '</p></article>';
            }
            echo '</div>';
        } elseif (($b['tipo'] ?? '') === 'contacto' && $pagina === 'contacto') {
            require __DIR__ . '/contacto-form.php';
        }
        $url = (string) ($b['botonUrl'] ?? '');
        if (!empty($b['botonTexto']) && cms_enlace_seguro($url)) echo '<p><a class="boton boton--primario" href="' . e($url) . '">' . e($b['botonTexto']) . '</a></p>';
        echo '</div></section>';
    }
}
