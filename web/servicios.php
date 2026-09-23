<?php
$pagina = 'servicios';
$titulo = 'Servicios';
$descripcion = 'Estudios de preinversión, expedientes técnicos, diseño arquitectónico y de ingeniería, supervisión y liquidación de obras en Chiclayo y Lambayeque.';
require __DIR__ . '/includes/header.php';
?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Servicios</p>
        <h1>Consultoría de obras de principio a fin</h1>
        <p class="encabezado__lead">Desde el estudio de preinversión hasta la liquidación de la obra, con un mismo equipo de arquitectos e ingenieros.</p>
    </div>
</section>

<section class="seccion">
    <div class="contenedor servicios-lista">
        <?php foreach (SERVICIOS as $i => $s): ?>
            <article class="servicio" id="<?= e($s['slug']) ?>">
                <div class="servicio__cabecera">
                    <span class="tarjeta__icono"><?= icono($s['icono']) ?></span>
                    <span class="servicio__num"><?= str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) ?></span>
                </div>
                <div>
                    <h2><?= e($s['titulo']) ?></h2>
                    <p><?= e($s['resumen']) ?></p>
                    <ul class="lista-check">
                        <?php foreach ($s['items'] as $item): ?>
                            <li><?= icono('check') ?> <?= e($item) ?></li>
                        <?php endforeach; ?>
                    </ul>
                    <a class="enlace" href="contacto.php?servicio=<?= e($s['slug']) ?>">Cotizar este servicio <?= icono('flecha') ?></a>
                </div>
            </article>
        <?php endforeach; ?>
    </div>
</section>

<section class="seccion seccion--suave">
    <div class="contenedor">
        <div class="seccion__cabecera">
            <p class="etiqueta">Expediente técnico</p>
            <h2>¿Qué incluye un expediente técnico?</h2>
            <p>Entregamos todos los componentes que las entidades exigen para aprobar y convocar una obra.</p>
        </div>
        <ul class="chips">
            <?php foreach ([
                'Memoria descriptiva', 'Estudio topográfico', 'Estudio de mecánica de suelos', 'Planos de arquitectura',
                'Planos de estructuras', 'Instalaciones sanitarias', 'Instalaciones eléctricas', 'Especificaciones técnicas',
                'Planilla de metrados', 'Análisis de costos unitarios', 'Presupuesto de obra', 'Fórmula polinómica',
                'Cronograma de ejecución', 'Panel fotográfico',
            ] as $componente): ?>
                <li><?= icono('regla') ?> <?= e($componente) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
</section>

<section class="cta">
    <div class="contenedor cta__caja">
        <div>
            <h2>Solicita una propuesta</h2>
            <p>Cuéntanos tu proyecto y te indicamos los requisitos para cotizarlo.</p>
        </div>
        <div class="cta__acciones">
            <a class="boton boton--primario" href="contacto.php">Cotizar</a>
            <a class="boton boton--whatsapp" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener"><?= icono('whatsapp') ?> WhatsApp</a>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
