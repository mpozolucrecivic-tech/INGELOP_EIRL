<?php
$pagina = 'inicio';
require __DIR__ . '/includes/header.php';
?>

<!-- HERO SECTION: Portada de obra con overlay oscuro -->
<section class="hero hero--ingenieria" style="position: relative; min-height: 85vh; display: flex; align-items: center; background: linear-gradient(rgba(10, 15, 20, 0.78), rgba(10, 15, 20, 0.88)), url('assets/img/hero-bg.jpg') center/cover no-repeat; color: #ffffff;">
    <div class="contenedor hero__grid" style="position: relative; z-index: 2; width: 100%; padding: 4rem 1rem;">
        <div class="hero__texto" style="max-width: 820px;">
            <p class="etiqueta etiqueta--verde">Consultoría y Ejecución de Obras · Chiclayo, Lambayeque</p>
            <h1 class="hero__titulo" style="color: #ffffff;">
                SOMOS EL RESPALDO TÉCNICO <br>
                <span class="texto-verde">PARA TUS PROYECTOS</span>
            </h1>
            <p class="hero__lead" style="color: #e2e8f0;">
                Elaboramos estudios de preinversión, expedientes técnicos y proyectos integrales de arquitectura e ingeniería,
                garantizando supervisión y calidad en todo el norte del Perú.
            </p>
            <div class="hero__acciones">
                <a class="boton boton--verde" href="contacto.php">Solicitar una cotización <?= icono('flecha') ?></a>
                <a class="boton boton--contorno-blanco" href="servicios.php">Ver servicios</a>
            </div>
            <!-- Métricas animadas con estilo Glassmorphism -->
            <div class="hero__metricas">
                <div class="metrica-card">
                    <div class="metrica-card__icono"><?= icono('check') ?></div>
                    <div class="metrica-card__contenido">
                        <div class="metrica-card__valor">
                            <span class="contador" data-target="5">0</span>
                        </div>
                        <span class="metrica-card__etiqueta">Especialidades OSCE</span>
                    </div>
                </div>

                <div class="metrica-card">
                    <div class="metrica-card__icono"><?= icono('documento') ?></div>
                    <div class="metrica-card__contenido">
                        <div class="metrica-card__valor">
                            <span class="badge-rnp">RNP</span>
                        </div>
                        <span class="metrica-card__etiqueta">Habilitados para el Estado</span>
                    </div>
                </div>

                <div class="metrica-card">
                    <div class="metrica-card__icono"><?= icono('calendario') ?></div>
                    <div class="metrica-card__contenido">
                        <div class="metrica-card__valor">
                            <span class="contador" data-target="<?= anios_experiencia() ?>">0</span><span class="plus">+</span>
                        </div>
                        <span class="metrica-card__etiqueta">Años de trayectoria</span>
                    </div>
                </div>

                <div class="metrica-card">
                    <div class="metrica-card__icono"><?= icono('proyecto') ?></div>
                    <div class="metrica-card__contenido">
                        <div class="metrica-card__valor">
                            <span class="contador" data-target="100">0</span><span class="plus">%</span>
                        </div>
                        <span class="metrica-card__etiqueta">Compromiso técnico</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- SECCIÓN: QUÉ HACEMOS -->
<section class="seccion seccion--asimetrica">
    <div class="contenedor">
        
        <header class="seccion__cabecera-split">
            <!-- Columna Izquierda: Identificador y Título Principal -->
            <div class="split-col split-col--principal">
                <span class="etiqueta-industrial">
                    <span class="indicador-verde"></span>
                    Especialidades & Servicios
                </span>
                <h2 class="split-titulo">
                    Acompañamos tu proyecto desde la idea hasta la <span class="resalte-verde">obra terminada</span>.
                </h2>
            </div>

            <!-- Columna Derecha: Resumen Técnico y Botón de Acción -->
            <div class="split-col split-col--secundaria">
                <div class="bloque-detalle">
                    <p class="split-texto">
                        Un solo equipo multidisciplinario para formular estudios de preinversión, expedientes técnicos y supervisión de obra, alineados estrictamente al marco normativo vigente del Estado y el sector privado.
                    </p>
                    <div class="split-enlaces">
                        <a href="servicios.php" class="enlace-catalogo">
                            <span>Ver todas las especialidades</span>
                            <span class="flecha-circular"><?= icono('flecha') ?></span>
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- Tarjetas de servicios -->
        <div class="tarjetas tarjetas--3">
            <?php foreach (array_slice(SERVICIOS, 0, 6) as $s): ?>
                <article class="tarjeta tarjeta--servicio">
                    <div class="tarjeta__cabecera">
                        <span class="tarjeta__icono-caja">
                            <?= icono($s['icono']) ?>
                        </span>
                        <span class="tarjeta__num" aria-hidden="true">// 0<?= array_search($s, SERVICIOS) + 1 ?></span>
                    </div>
                    
                    <h3 class="tarjeta__titulo"><?= e($s['titulo']) ?></h3>
                    <p class="tarjeta__texto"><?= e($s['resumen']) ?></p>
                    
                    <div class="tarjeta__pie">
                        <a class="enlace-servicio" href="servicios.php#<?= e($s['slug']) ?>">
                            <span>Más información</span>
                            <span class="enlace-servicio__flecha"><?= icono('flecha') ?></span>
                        </a>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>

    </div>
</section>

<!-- SECCIÓN: REGISTRO NACIONAL DE PROVEEDORES -->
<section class="seccion seccion--rnp" id="rnp">
    <div class="contenedor">
        
        <div class="seccion__cabecera seccion__cabecera--rnp">
            <span class="badge-rnp-estado">
                <span class="punto-verde-pulso"></span>
                Registro Nacional de Proveedores
            </span>
            <h2 class="rnp-titulo">
                Especialidades habilitadas para <span class="resalte-verde">contratar con el Estado</span>
            </h2>
            <p class="rnp-subtitulo">
                Estamos inscritos en el RNP del OSCE y formalmente calificados como consultores de obras en 5 especialidades clave.
            </p>
        </div>

        <div class="rnp-grid">
            <?php foreach (ESPECIALIDADES_OSCE as $esp): ?>
                <article class="rnp-card">
                    <div class="rnp-card__icono">
                        <?= icono($esp['icono']) ?>
                    </div>
                    <div class="rnp-card__cuerpo">
                        <div class="rnp-card__fila-superior">
                            <h3 class="rnp-card__titulo"><?= e($esp['nombre']) ?></h3>
                            <span class="rnp-card__categoria">
                                <small>RNP</small>
                                <strong>Cat. <?= e($esp['categoria']) ?></strong>
                            </span>
                        </div>
                        <p class="rnp-card__texto"><?= e($esp['texto']) ?></p>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>

    </div>
</section>

<!-- SECCIÓN: CÓMO TRABAJAMOS -->
<section class="seccion seccion--proceso" id="proceso">
    <div class="contenedor">
        
        <div class="seccion__cabecera seccion__cabecera--proceso">
            <span class="badge-proceso">
                <span class="indicador-proceso"></span>
                Metodología de Trabajo
            </span>
            <h2 class="proceso-titulo">
                Un proceso claro, con entregables <br>
                revisados en <span class="resalte-verde">cada etapa</span>
            </h2>
            <p class="proceso-subtitulo">
                Garantizamos control de calidad, rigor técnico y levantamiento ágil de observaciones en cada fase del proyecto.
            </p>
        </div>

        <ol class="proceso-timeline">
            <li class="paso-card">
                <div class="paso-card__cabecera">
                    <span class="paso-card__num">01</span>
                    <span class="paso-card__fase">Fase Inicial</span>
                </div>
                <h3 class="paso-card__titulo">Diagnóstico</h3>
                <p class="paso-card__texto">
                    Visita de campo, levantamiento topográfico preliminar y delimitación precisa de los alcances con el cliente.
                </p>
                <div class="paso-card__barra" aria-hidden="true"></div>
            </li>

            <li class="paso-card">
                <div class="paso-card__cabecera">
                    <span class="paso-card__num">02</span>
                    <span class="paso-card__fase">Desarrollo</span>
                </div>
                <h3 class="paso-card__titulo">Estudios y diseño</h3>
                <p class="paso-card__texto">
                    Mecánica de suelos, cálculo estructural y diseño multidisciplinario de arquitectura e instalaciones.
                </p>
                <div class="paso-card__barra" aria-hidden="true"></div>
            </li>

            <li class="paso-card">
                <div class="paso-card__cabecera">
                    <span class="paso-card__num">03</span>
                    <span class="paso-card__fase">Costos</span>
                </div>
                <h3 class="paso-card__titulo">Metrados y presupuesto</h3>
                <p class="paso-card__texto">
                    Análisis de costos unitarios (ACU), metrados detallados, fórmula polinómica y cronograma valorizado.
                </p>
                <div class="paso-card__barra" aria-hidden="true"></div>
            </li>

            <li class="paso-card">
                <div class="paso-card__cabecera">
                    <span class="paso-card__num">04</span>
                    <span class="paso-card__fase">Cierre</span>
                </div>
                <h3 class="paso-card__titulo">Entrega y supervisión</h3>
                <p class="paso-card__texto">
                    Acompañamiento hasta la conformidad técnica definitiva y, opcionalmente, supervisión en obra.
                </p>
                <div class="paso-card__barra" aria-hidden="true"></div>
            </li>
        </ol>

    </div>
</section>

<!-- CALL TO ACTION FINAL -->
<section class="seccion seccion--cta">
    <div class="contenedor">
        <div class="cta-banner">
            
            <div class="cta-banner__contenido">
                <span class="cta-banner__etiqueta">
                    <span class="punto-verde-pulso"></span>
                    Atención Inmediata
                </span>
                <h2 class="cta-banner__titulo">
                    ¿Tienes un proyecto <span class="resalte-verde">en mente?</span>
                </h2>
                <p class="cta-banner__descripcion">
                    Cuéntanos qué necesitas y te enviamos una propuesta técnica y económica.
                </p>
            </div>

            <div class="cta-banner__acciones">
                <a class="btn-cta btn-cta--primario" href="contacto.php">
                    <span>Escríbenos</span>
                    <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                </a>
                
                <a class="btn-cta btn-cta--whatsapp" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener">
                    <span class="btn-cta__icono-wa"><?= icono('whatsapp') ?></span>
                    <span>WhatsApp</span>
                </a>
            </div>

        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>