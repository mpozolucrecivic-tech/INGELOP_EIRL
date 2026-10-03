<?php
$pagina = 'inicio';
require __DIR__ . '/includes/header.php';
?>

<section class="hero">
    <div class="hero__fondo" aria-hidden="true"></div>
    <div class="contenedor hero__grid">
        <div class="hero__texto">
            <p class="etiqueta">Consultoría de obras · Chiclayo, Lambayeque</p>
            <h1><?= e(EMPRESA['eslogan']) ?></h1>
            <p class="hero__lead">
                Elaboramos estudios de preinversión, expedientes técnicos y proyectos de arquitectura e ingeniería,
                y supervisamos su ejecución para entidades públicas, empresas y familias del norte del Perú.
            </p>
            <div class="hero__acciones">
                <a class="boton boton--primario" href="contacto.php">Solicitar una cotización <?= icono('flecha') ?></a>
                <a class="boton boton--contorno" href="servicios.php">Ver servicios</a>
            </div>
            <ul class="hero__datos">
                <li><strong>5</strong><span>especialidades inscritas en el OSCE</span></li>
                <li><strong>RNP</strong><span>habilitados para contratar con el Estado</span></li>
                <li><strong><?= anios_experiencia() ?>+</strong><span>años de actividad</span></li>
            </ul>
        </div>

        <div class="hero__ilustracion" aria-hidden="true">
            <!-- Ilustración tipo plano: elevación de una edificación con cotas -->
            <svg viewBox="0 0 420 360" class="plano-svg">
                <g class="plano-svg__grid">
                    <?php for ($x = 0; $x <= 420; $x += 30): ?><line x1="<?= $x ?>" y1="0" x2="<?= $x ?>" y2="360"/><?php endfor; ?>
                    <?php for ($y = 0; $y <= 360; $y += 30): ?><line x1="0" y1="<?= $y ?>" x2="420" y2="<?= $y ?>"/><?php endfor; ?>
                </g>
                <g class="plano-svg__trazo">
                    <path d="M60 300h300M80 300V150h260v150M80 150l130-70 130 70"/>
                    <path d="M80 225h260"/>
                    <rect x="110" y="170" width="45" height="40"/><rect x="187" y="170" width="45" height="40"/><rect x="265" y="170" width="45" height="40"/>
                    <rect x="110" y="245" width="45" height="40"/><rect x="265" y="245" width="45" height="40"/>
                    <path d="M190 300v-55h40v55"/>
                </g>
                <g class="plano-svg__cota">
                    <path d="M80 325h260M80 318v14M340 318v14"/>
                    <text x="210" y="345" text-anchor="middle">24.00 m</text>
                    <path d="M370 150v150M363 150h14M363 300h14"/>
                    <text x="385" y="230" transform="rotate(90 385 230)" text-anchor="middle">7.20 m</text>
                </g>
                <g class="plano-svg__rotulo">
                    <rect x="236" y="20" width="170" height="46"/>
                    <text x="246" y="38">INGELOP</text>
                    <text x="246" y="56" class="pequeno">ELEVACIÓN PRINCIPAL · A-03</text>
                </g>
            </svg>
        </div>
    </div>
</section>

<section class="seccion">
    <div class="contenedor">
        <div class="seccion__cabecera">
            <p class="etiqueta">Qué hacemos</p>
            <h2>Acompañamos el proyecto desde la idea hasta la obra terminada</h2>
            <p>Un solo equipo técnico para estudiar, diseñar, presupuestar y supervisar, con la documentación que exigen las entidades públicas.</p>
        </div>
        <div class="tarjetas tarjetas--3" data-servicios="tarjetas">
            <?php foreach (array_slice(SERVICIOS, 0, 6) as $s): ?>
                <article class="tarjeta">
                    <span class="tarjeta__icono"><?= icono($s['icono']) ?></span>
                    <h3><?= e($s['titulo']) ?></h3>
                    <p><?= e($s['resumen']) ?></p>
                    <a class="enlace" href="servicios.php#<?= e($s['slug']) ?>">Más información <?= icono('flecha') ?></a>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="seccion seccion--oscura">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--claro">
            <p class="etiqueta">Registro Nacional de Proveedores</p>
            <h2>Especialidades habilitadas como consultores de obras</h2>
            <p>Estamos inscritos en el RNP del OSCE y aptos para contratar con el Estado en cinco especialidades.</p>
        </div>
        <div class="especialidades">
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

<section class="seccion">
    <div class="contenedor">
        <div class="seccion__cabecera">
            <p class="etiqueta">Cómo trabajamos</p>
            <h2>Un proceso claro, con entregables revisados en cada etapa</h2>
        </div>
        <ol class="pasos">
            <li class="paso">
                <span class="paso__num">01</span>
                <h3>Diagnóstico</h3>
                <p>Visita de campo, levantamiento de información y definición de alcances con el cliente.</p>
            </li>
            <li class="paso">
                <span class="paso__num">02</span>
                <h3>Estudios y diseño</h3>
                <p>Topografía, estudios básicos y diseño de arquitectura y especialidades.</p>
            </li>
            <li class="paso">
                <span class="paso__num">03</span>
                <h3>Metrados y presupuesto</h3>
                <p>Metrados, análisis de costos unitarios, presupuesto, fórmula polinómica y cronograma.</p>
            </li>
            <li class="paso">
                <span class="paso__num">04</span>
                <h3>Entrega y seguimiento</h3>
                <p>Levantamiento de observaciones hasta la aprobación y, si se requiere, supervisión de la obra.</p>
            </li>
        </ol>
    </div>
</section>

<section class="cta">
    <div class="contenedor cta__caja">
        <div>
            <h2>¿Tienes un proyecto en mente?</h2>
            <p>Cuéntanos qué necesitas y te enviamos una propuesta técnica y económica.</p>
        </div>
        <div class="cta__acciones">
            <a class="boton boton--primario" href="contacto.php">Escríbenos</a>
            <?php if (hay_whatsapp()): ?><a class="boton boton--whatsapp" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener"><?= icono('whatsapp') ?> WhatsApp</a><?php endif; ?>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
