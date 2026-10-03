<?php
$pagina = 'proyectos';
$titulo = 'Proyectos';
$descripcion = 'Proyectos de edificaciones, saneamiento, vías, obras electromecánicas e irrigaciones desarrollados por INGELOP en Lambayeque.';
require __DIR__ . '/includes/header.php';

// Proyectos realizados (se gestionan en la intranet)
$proyectos = proyectos_realizados();

// Tipos de proyecto por especialidad (se muestran mientras no haya proyectos realizados publicados)
$tipos = [
    ['icono' => 'edificio', 'titulo' => 'Edificaciones', 'ejemplos' => ['Instituciones educativas', 'Establecimientos de salud', 'Locales municipales y comunales', 'Viviendas y edificios multifamiliares']],
    ['icono' => 'agua',     'titulo' => 'Saneamiento',   'ejemplos' => ['Agua potable', 'Alcantarillado sanitario', 'Plantas de tratamiento', 'Drenaje pluvial']],
    ['icono' => 'via',      'titulo' => 'Vías',          'ejemplos' => ['Pistas y veredas', 'Pavimentos', 'Caminos vecinales', 'Señalización']],
    ['icono' => 'rayo',     'titulo' => 'Electromecánicas', 'ejemplos' => ['Redes de distribución', 'Alumbrado público', 'Subsistemas de utilización']],
    ['icono' => 'represa',  'titulo' => 'Riego',         'ejemplos' => ['Canales', 'Bocatomas', 'Reservorios', 'Defensas ribereñas']],
];
?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Proyectos</p>
        <h1>Infraestructura para el desarrollo de la región</h1>
        <p class="encabezado__lead">Desarrollamos proyectos en las cinco especialidades de consultoría de obras en las que estamos habilitados.</p>
    </div>
</section>

<section class="seccion">
    <div class="contenedor">
        <?php if ($proyectos): ?>
            <div class="tarjetas tarjetas--3">
                <?php foreach ($proyectos as $p): ?>
                    <article class="proyecto">
                        <?php if (!empty($p['imagen'])): ?>
                            <img class="proyecto__imagen" src="<?= e($p['imagen']) ?>" alt="<?= e($p['titulo']) ?>" loading="lazy">
                        <?php else: ?>
                            <div class="proyecto__imagen proyecto__imagen--vacia" aria-hidden="true"><?= icono('edificio') ?></div>
                        <?php endif; ?>
                        <div class="proyecto__cuerpo">
                            <?php $meta = implode(' · ', array_filter([$p['servicio'], $p['anio']], fn ($v) => $v !== '')); ?>
                            <?php if ($meta !== ''): ?><p class="proyecto__meta"><?= e($meta) ?></p><?php endif; ?>
                            <h2><?= e($p['titulo']) ?></h2>
                            <?php if ($p['cliente'] !== ''): ?><p><?= e($p['cliente']) ?></p><?php endif; ?>
                            <?php if ($p['ubicacion'] !== ''): ?><p class="proyecto__lugar"><?= icono('mapa') ?> <?= e($p['ubicacion']) ?></p><?php endif; ?>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="tarjetas tarjetas--3">
                <?php foreach ($tipos as $t): ?>
                    <article class="tarjeta">
                        <span class="tarjeta__icono"><?= icono($t['icono']) ?></span>
                        <h2 class="tarjeta__titulo"><?= e($t['titulo']) ?></h2>
                        <ul class="lista-simple">
                            <?php foreach ($t['ejemplos'] as $ej): ?><li><?= e($ej) ?></li><?php endforeach; ?>
                        </ul>
                    </article>
                <?php endforeach; ?>
                <article class="tarjeta tarjeta--destacada">
                    <h2 class="tarjeta__titulo">¿Tu proyecto no está en la lista?</h2>
                    <p>Cuéntanos de qué se trata y evaluamos cómo podemos ayudarte.</p>
                    <a class="boton boton--primario" href="contacto.php">Consultar</a>
                </article>
            </div>
        <?php endif; ?>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
