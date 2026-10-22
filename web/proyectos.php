<?php
$pagina = 'proyectos';
$titulo = 'Proyectos';
$descripcion = 'Proyectos de edificaciones, saneamiento, vías, obras electromecánicas e irrigaciones desarrollados por INGELOP en Lambayeque.';
require __DIR__ . '/includes/header.php';

// Tipos de proyecto por especialidad (se muestran mientras no haya proyectos cargados en config.php)
$tipos = [
    ['icono' => 'edificio', 'titulo' => 'Edificaciones', 'ejemplos' => ['Instituciones educativas', 'Establecimientos de salud', 'Locales municipales y comunales', 'Viviendas y edificios multifamiliares']],
    ['icono' => 'agua',     'titulo' => 'Saneamiento',   'ejemplos' => ['Agua potable', 'Alcantarillado sanitario', 'Plantas de tratamiento', 'Drenaje pluvial']],
    ['icono' => 'via',      'titulo' => 'Vías',          'ejemplos' => ['Pistas y veredas', 'Pavimentos', 'Caminos vecinales', 'Señalización']],
    ['icono' => 'rayo',     'titulo' => 'Electromecánicas', 'ejemplos' => ['Redes de distribución', 'Alumbrado público', 'Subsistemas de utilización']],
    ['icono' => 'represa',  'titulo' => 'Riego',         'ejemplos' => ['Canales', 'Bocatomas', 'Reservorios', 'Defensas ribereñas']],
];
?>

<!-- HERO PORTADA PROYECTOS (FONDO COMPLETO INMERSIVO) -->
<section class="proyectos-portada">
    <div class="contenedor proyectos-portada__contenido">
        
        <span class="badge-verde-boton">
            <span class="punto-verde-pulso"></span>
            Portafolio y Experiencia
        </span>

        <h1 class="proyectos-portada__titulo">
            Infraestructura para el <br>
            <span class="resalte-verde">desarrollo de la región</span>
        </h1>

        <p class="proyectos-portada__descripcion">
            Desarrollamos proyectos en las cinco especialidades de consultoría de obras en las que estamos habilitados ante el RNP y OSCE.
        </p>

        <div class="proyectos-portada__pildoras">
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Expedientes técnicos aprobados</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Supervisión e inspección en campo</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Ámbito Lambayeque y macro región norte</span>
            </div>
        </div>

    </div>
</section>

<!-- SECCIÓN: LÍNEAS DE PROYECTOS POR ESPECIALIDAD -->
<section class="seccion seccion--proyectos-grid">
    <div class="contenedor">
        
        <div class="seccion__cabecera text-center">
            <span class="badge-verde-boton">
                <span class="punto-verde-pulso"></span>
                Alcance Multidisciplinario
            </span>
            <h2 class="seccion__titulo">
                Proyectos por <span class="resalte-verde">especialidad técnica</span>
            </h2>
            <p class="seccion__subtitulo">
                Desarrollamos estudios, expedientes y supervisiones en las principales ramas de la ingeniería civil y edificación.
            </p>
        </div>

        <div class="proyectos-lineas-grid">
            
            <!-- 01. Edificaciones -->
            <article class="tarjeta-linea">
                <div class="tarjeta-linea__cabecera">
                    <div class="tarjeta-linea__icono">
                        <?= icono('edificaciones') ?? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 8H2l10-8z"/></svg>' ?>
                    </div>
                    <span class="tarjeta-linea__num">01</span>
                </div>
                <h3 class="tarjeta-linea__titulo">Edificaciones</h3>
                <ul class="tarjeta-linea__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Instituciones educativas</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Establecimientos de salud</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Locales municipales y comunales</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Viviendas y edificios multifamiliares</li>
                </ul>
            </article>

            <!-- 02. Saneamiento -->
            <article class="tarjeta-linea">
                <div class="tarjeta-linea__cabecera">
                    <div class="tarjeta-linea__icono">
                        <?= icono('saneamiento') ?? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' ?>
                    </div>
                    <span class="tarjeta-linea__num">02</span>
                </div>
                <h3 class="tarjeta-linea__titulo">Saneamiento</h3>
                <ul class="tarjeta-linea__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Agua potable y captaciones</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Alcantarillado sanitario</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Plantas de tratamiento (PTAR / PTAP)</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Drenaje pluvial integral</li>
                </ul>
            </article>

            <!-- 03. Vías -->
            <article class="tarjeta-linea">
                <div class="tarjeta-linea__cabecera">
                    <div class="tarjeta-linea__icono">
                        <?= icono('vias') ?? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19L9 5M20 19l-5-14M12 5v3M12 11v3M12 17v3"/></svg>' ?>
                    </div>
                    <span class="tarjeta-linea__num">03</span>
                </div>
                <h3 class="tarjeta-linea__titulo">Vías y Transportes</h3>
                <ul class="tarjeta-linea__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Pistas y veredas urbanas</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Pavimentos rígidos y flexibles</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Caminos vecinales y departamentales</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Señalización y seguridad vial</li>
                </ul>
            </article>

            <!-- 04. Electromecánicas -->
            <article class="tarjeta-linea">
                <div class="tarjeta-linea__cabecera">
                    <div class="tarjeta-linea__icono">
                        <?= icono('electromecanicas') ?? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' ?>
                    </div>
                    <span class="tarjeta-linea__num">04</span>
                </div>
                <h3 class="tarjeta-linea__titulo">Electromecánicas</h3>
                <ul class="tarjeta-linea__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Redes primarias y de distribución</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Alumbrado público y vial</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Subsistemas de utilización</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Equipamiento electromecánico</li>
                </ul>
            </article>

            <!-- 05. Riego -->
            <article class="tarjeta-linea">
                <div class="tarjeta-linea__cabecera">
                    <div class="tarjeta-linea__icono">
                        <?= icono('riego') ?? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M2 18h20M7 6h10M12 2v4"/></svg>' ?>
                    </div>
                    <span class="tarjeta-linea__num">05</span>
                </div>
                <h3 class="tarjeta-linea__titulo">Riego e Hidráulica</h3>
                <ul class="tarjeta-linea__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Canales de conducción y laterales</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Bocatomas y desarenadores</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Reservorios y almacenamiento</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Defensas ribereñas y encauzamiento</li>
                </ul>
            </article>

            <!-- 06. Tarjeta Especial: ¿Tu proyecto no está en la lista? -->
            <article class="tarjeta-linea tarjeta-linea--cta">
                <div class="tarjeta-linea__cabecera">
                    <span class="tarjeta-linea__tag-cta">
                        <span class="punto-verde-pulso"></span>
                        Asesoría Personalizada
                    </span>
                </div>
                <h3 class="tarjeta-linea__titulo">¿Tu proyecto no está en la lista?</h3>
                <p class="tarjeta-linea__desc-cta">
                    Evaluamos requerimientos técnicos mixtos, peritajes o expedientes con necesidades operativas particulares.
                </p>
                <div class="tarjeta-linea__pie-cta">
                    <a href="contacto.php" class="btn-cta btn-cta--primario w-100">
                        <span>Consultar con un ingeniero</span>
                        <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                    </a>
                </div>
            </article>

        </div>

    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
