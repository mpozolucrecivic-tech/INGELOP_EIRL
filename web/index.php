<?php
$pagina = 'inicio';
$portada = true;
require __DIR__ . '/includes/header.php';
?>

<section class="portada portada--inicio">
    <div class="portada__foto" style="background-image: url('assets/img/fotos/inicio.webp')" aria-hidden="true"></div>
    <div class="contenedor">
        <div class="portada__contenido" data-revelar>
            <p class="etiqueta">Consultoría de obras · Chiclayo, Lambayeque</p>
            <h1><?= eslogan_resaltado() ?></h1>
            <p class="portada__lead">
                Elaboramos estudios de preinversión, expedientes técnicos y proyectos de arquitectura e ingeniería,
                y supervisamos su ejecución para entidades públicas, empresas y familias del norte del Perú.
            </p>
            <div class="portada__acciones">
                <a class="boton boton--primario" href="contacto.php">Solicitar una cotización <?= icono('flecha') ?></a>
                <a class="boton boton--vidrio" href="servicios.php">Ver servicios</a>
            </div>
        </div>
        <ul class="metricas" data-revelar-grupo>
            <li class="metrica">
                <span class="metrica__icono"><?= icono('escudo') ?></span>
                <div><strong data-contar="<?= count(ESPECIALIDADES_OSCE) ?>"><?= count(ESPECIALIDADES_OSCE) ?></strong><span>especialidades inscritas en el OSCE</span></div>
            </li>
            <li class="metrica">
                <span class="metrica__icono"><?= icono('check') ?></span>
                <div><strong>RNP</strong><span>habilitados para contratar con el Estado</span></div>
            </li>
            <li class="metrica">
                <span class="metrica__icono"><?= icono('reloj') ?></span>
                <div><strong><span data-contar="<?= anios_experiencia() ?>"><?= anios_experiencia() ?></span><span class="unidad">+</span></strong><span>años de actividad</span></div>
            </li>
            <li class="metrica">
                <span class="metrica__icono"><?= icono('casco') ?></span>
                <div><strong><span data-contar="17">17</span><span class="unidad">+</span></strong><span>expedientes y estudios</span></div>
            </li>
        </ul>
    </div>
    <span class="portada__bajar" aria-hidden="true"></span>
</section>

<section class="seccion">
    <div class="contenedor">
        <div class="seccion__dividida" data-revelar>
            <div class="seccion__cabecera">
                <p class="etiqueta">Especialidades y servicios</p>
                <h2>Acompañamos tu proyecto desde la idea hasta la <span class="resaltado">obra terminada</span></h2>
            </div>
            <p>
                Un solo equipo multidisciplinario para formular estudios de preinversión, expedientes técnicos y supervisión de obra,
                con la documentación que exigen las entidades públicas y el sector privado.
                <br><a class="enlace" href="servicios.php" style="margin-top:10px">Ver todos los servicios <?= icono('flecha') ?></a>
            </p>
        </div>
        <div class="tarjetas tarjetas--3" data-servicios="tarjetas" data-revelar-grupo>
            <?php foreach (array_slice(SERVICIOS, 0, 6) as $i => $s): $foto = foto_servicio($s); ?>
                <article class="tarjeta tarjeta-foto">
                    <?php if ($foto !== ''): ?>
                        <div class="tarjeta-foto__imagen">
                            <img src="<?= e($foto) ?>" alt="" loading="lazy">
                            <span class="tarjeta-foto__num"><?= str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) ?></span>
                        </div>
                    <?php endif; ?>
                    <div class="tarjeta-foto__cuerpo">
                        <?php if ($foto !== ''): ?><span class="tarjeta-foto__icono"><?= icono($s['icono']) ?></span><?php else: ?><span class="tarjeta__icono"><?= icono($s['icono']) ?></span><?php endif; ?>
                        <h3><?= e($s['titulo']) ?></h3>
                        <p><?= e($s['resumen']) ?></p>
                        <a class="enlace" href="servicios.php#<?= e($s['slug']) ?>" style="margin-top:auto">Más información <?= icono('flecha') ?></a>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="seccion seccion--oscura">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--claro seccion__cabecera--centro" data-revelar>
            <p class="etiqueta">Registro Nacional de Proveedores</p>
            <h2>Especialidades habilitadas para <span class="resaltado">contratar con el Estado</span></h2>
            <p>Estamos inscritos en el RNP del OSCE y aptos para contratar como consultores de obras en cinco especialidades.</p>
        </div>
        <div class="especialidades" data-revelar-grupo>
            <?php foreach (ESPECIALIDADES_OSCE as $esp): ?>
                <article class="especialidad">
                    <span class="especialidad__icono"><?= icono($esp['icono']) ?></span>
                    <div>
                        <h3><?= e($esp['nombre']) ?></h3>
                        <p><?= e($esp['texto']) ?></p>
                    </div>
                    <span class="especialidad__categoria" title="Categoría RNP">Cat. <?= e($esp['categoria']) ?></span>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="seccion seccion--suave">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--centro" data-revelar>
            <p class="etiqueta">Metodología de trabajo</p>
            <h2>Un proceso claro, con entregables revisados en <span class="resaltado">cada etapa</span></h2>
            <p>Control de calidad, rigor técnico y levantamiento ágil de observaciones en cada fase del proyecto.</p>
        </div>
        <ol class="pasos" data-revelar-grupo>
            <li class="paso">
                <span class="paso__fase">Inicio</span>
                <span class="paso__num">01</span>
                <h3>Diagnóstico</h3>
                <p>Visita de campo, levantamiento de información y definición de alcances con el cliente.</p>
            </li>
            <li class="paso">
                <span class="paso__fase">Desarrollo</span>
                <span class="paso__num">02</span>
                <h3>Estudios y diseño</h3>
                <p>Topografía, estudios básicos y diseño de arquitectura y especialidades.</p>
            </li>
            <li class="paso">
                <span class="paso__fase">Costos</span>
                <span class="paso__num">03</span>
                <h3>Metrados y presupuesto</h3>
                <p>Metrados, análisis de costos unitarios, presupuesto, fórmula polinómica y cronograma.</p>
            </li>
            <li class="paso">
                <span class="paso__fase">Cierre</span>
                <span class="paso__num">04</span>
                <h3>Entrega y seguimiento</h3>
                <p>Levantamiento de observaciones hasta la aprobación y, si se requiere, supervisión de la obra.</p>
            </li>
        </ol>
    </div>
</section>

<section class="franja">
    <div class="franja__foto" style="background-image: url('assets/img/fotos/proyectos.webp')" aria-hidden="true"></div>
    <div class="contenedor" data-revelar>
        <p class="etiqueta">Infraestructura para la región</p>
        <h2>Proyectos de edificaciones, saneamiento, vías, energía y riego en el norte del Perú</h2>
        <p>Conoce el tipo de obras en las que trabajamos y los proyectos que hemos desarrollado.</p>
        <a class="boton boton--vidrio" href="proyectos.php">Ver proyectos <?= icono('flecha') ?></a>
    </div>
</section>

<section class="cta" style="padding-top:96px">
    <div class="contenedor cta__caja" data-revelar>
        <div>
            <p class="etiqueta">Atención inmediata</p>
            <h2>¿Tienes un proyecto <span class="resaltado">en mente</span>?</h2>
            <p>Cuéntanos qué necesitas y te enviamos una propuesta técnica y económica.</p>
        </div>
        <div class="cta__acciones">
            <a class="boton boton--primario" href="contacto.php">Escríbenos <?= icono('flecha') ?></a>
            <?php if (hay_whatsapp()): ?><a class="boton boton--whatsapp" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener"><?= icono('whatsapp') ?> WhatsApp</a><?php endif; ?>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
