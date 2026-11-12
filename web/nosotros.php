<?php
$pagina = 'nosotros';
$portada = true;
$titulo = 'Nosotros';
$descripcion = 'INGELOP es una consultora de arquitectura e ingeniería con sede en Chiclayo, habilitada en el RNP del OSCE como consultor de obras.';
require __DIR__ . '/includes/header.php';
?>

<section class="portada">
    <div class="portada__foto" style="background-image: url('assets/img/fotos/nosotros.webp')" aria-hidden="true"></div>
    <div class="contenedor">
        <div class="portada__contenido" data-revelar>
            <p class="etiqueta">Sobre nosotros</p>
            <h1>Ingeniería y arquitectura hecha en <span class="resaltado">Chiclayo</span></h1>
            <p class="portada__lead">Somos una empresa lambayecana dedicada a la consultoría de obras: estudiamos, diseñamos y supervisamos proyectos de infraestructura pública y privada con precisión técnica y rigor normativo.</p>
            <ul class="portada__chips">
                <li><?= icono('check') ?> Equipo multidisciplinario colegiado</li>
                <li><?= icono('check') ?> Conformidad técnica ante entidades públicas</li>
                <li><?= icono('check') ?> Registro Nacional de Proveedores (RNP)</li>
            </ul>
        </div>
    </div>
</section>

<div class="contenedor">
    <ul class="cifras" data-revelar>
        <li class="cifra">
            <span class="cifra__icono"><?= icono('escudo') ?></span>
            <div><strong data-contar="<?= count(ESPECIALIDADES_OSCE) ?>"><?= count(ESPECIALIDADES_OSCE) ?></strong><span>Especialidades RNP / OSCE</span></div>
        </li>
        <li class="cifra">
            <span class="cifra__icono"><?= icono('check') ?></span>
            <div><strong><span data-contar="90">90</span><span class="unidad">%</span></strong><span>Conformidad en entregables</span></div>
        </li>
        <li class="cifra">
            <span class="cifra__icono"><?= icono('carpeta') ?></span>
            <div><strong><span class="unidad">+</span><span data-contar="17">17</span></strong><span>Expedientes y estudios</span></div>
        </li>
        <li class="cifra">
            <span class="cifra__icono"><?= icono('mapa') ?></span>
            <div><strong data-contar="2022" data-desde="2015">2022</strong><span>Constituida en Lambayeque</span></div>
        </li>
    </ul>
</div>

<section class="seccion">
    <div class="contenedor dos-columnas">
        <div class="texto-largo" data-revelar>
            <p class="etiqueta">Identidad institucional</p>
            <h2>Quiénes somos</h2>
            <p>
                <strong><?= e(EMPRESA['razon_social']) ?></strong> es una empresa individual de responsabilidad limitada
                inscrita en los Registros Públicos en noviembre de 2022 e inició actividades en enero de 2023.
                Nuestra actividad principal es la <strong>arquitectura, la ingeniería y la consultoría técnica</strong>.
            </p>
            <p>
                Trabajamos con municipalidades, gobiernos regionales, empresas y particulares de Lambayeque y el norte del país.
                Elaboramos la documentación técnica que un proyecto necesita para aprobarse, licitarse y ejecutarse correctamente,
                y acompañamos su ejecución como supervisores.
            </p>
            <h2>Nuestro compromiso</h2>
            <ul class="compromisos" data-revelar-grupo>
                <li class="compromiso"><?= icono('carpeta') ?><div><strong>Expedientes integrales</strong><span>Completos y coherentes entre todas las especialidades.</span></div></li>
                <li class="compromiso"><?= icono('regla') ?><div><strong>Presupuestos sustentados</strong><span>Metrados rigurosos y análisis de costos unitarios reales.</span></div></li>
                <li class="compromiso"><?= icono('reloj') ?><div><strong>Cumplimiento de plazos</strong><span>Control del cronograma y levantamiento oportuno de observaciones.</span></div></li>
                <li class="compromiso"><?= icono('chat') ?><div><strong>Trato directo</strong><span>Comunicación sin intermediarios con el equipo técnico.</span></div></li>
            </ul>
        </div>

        <aside class="ficha" data-revelar style="--retraso:120ms">
            <h2 class="ficha__titulo"><?= icono('escudo') ?> Datos de la empresa</h2>
            <dl>
                <div><dt>Razón social</dt><dd><?= e(EMPRESA['razon_social']) ?></dd></div>
                <div><dt>RUC</dt><dd><?= e(EMPRESA['ruc']) ?> <span class="insignia">Activo</span></dd></div>
                <div><dt>Actividad</dt><dd>Actividades de arquitectura e ingeniería y consultoría técnica (CIIU 7110)</dd></div>
                <div><dt>Registro Nacional de Proveedores</dt><dd>Habilitado como consultor de obras, apto para contratar con el Estado</dd></div>
                <?php if (EMPRESA['direccion'] !== ''): ?><div><dt>Domicilio</dt><dd><?= e(direccion_completa()) ?> – <?= e(EMPRESA['region']) ?></dd></div><?php endif; ?>
                <div><dt>Inicio de actividades</dt><dd>Enero de <?= e(EMPRESA['inicio']) ?></dd></div>
            </dl>
            <p class="ficha__pie"><?= icono('check') ?> Información de SUNAT y OSCE</p>
        </aside>
    </div>
</section>

<section class="seccion seccion--suave">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--centro" data-revelar>
            <p class="etiqueta">RNP · OSCE</p>
            <h2>Especialidades y <span class="resaltado">categorías</span></h2>
            <p>La categoría indica el monto máximo de los contratos de consultoría de obras a los que la empresa puede postular en cada especialidad.</p>
        </div>
        <div class="tabla-envoltura" data-revelar>
            <table class="tabla">
                <thead><tr><th>Especialidad</th><th>Qué incluye</th><th>Categoría</th></tr></thead>
                <tbody>
                <?php foreach (ESPECIALIDADES_OSCE as $esp): ?>
                    <tr>
                        <td><strong><?= e($esp['nombre']) ?></strong></td>
                        <td><?= e($esp['texto']) ?></td>
                        <td><span class="insignia">Cat. <?= e($esp['categoria']) ?></span></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</section>

<section class="cta" style="padding-top:96px">
    <div class="contenedor cta__caja" data-revelar>
        <div>
            <p class="etiqueta">Cobertura regional</p>
            <h2>Trabajemos <span class="resaltado">juntos</span></h2>
            <p>Atendemos proyectos en Chiclayo, Lambayeque y todo el norte del país con solvencia técnica, rigor normativo y cumplimiento de plazos.</p>
            <p style="margin-top:22px"><a class="boton boton--primario" href="contacto.php">Contáctanos <?= icono('flecha') ?></a></p>
        </div>
        <ul class="cta__lista">
            <li><?= icono('lupa') ?><div><strong>Evaluación técnica inicial</strong><span>Revisión de requerimientos y términos de referencia.</span></div></li>
            <li><?= icono('regla') ?><div><strong>Propuesta valorizada y cronograma</strong><span>Presupuesto ajustado al alcance real del encargo.</span></div></li>
            <li><?= icono('casco') ?><div><strong>Coordinación en obra o gabinete</strong><span>Reuniones en Chiclayo y atención remota permanente.</span></div></li>
        </ul>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
