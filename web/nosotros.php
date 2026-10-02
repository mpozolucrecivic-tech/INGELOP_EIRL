<?php
$pagina = 'nosotros';
$titulo = 'Nosotros';
$descripcion = 'INGELOP es una consultora de arquitectura e ingeniería con sede en Chiclayo, habilitada en el RNP del OSCE como consultor de obras.';
require __DIR__ . '/includes/header.php';
?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Nosotros</p>
        <h1>Ingeniería y arquitectura hecha en Chiclayo</h1>
        <p class="encabezado__lead">Somos una empresa lambayecana dedicada a la consultoría de obras: estudiamos, diseñamos y supervisamos proyectos de infraestructura pública y privada.</p>
    </div>
</section>

<section class="seccion">
    <div class="contenedor dos-columnas">
        <div class="texto-largo">
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
            <ul class="lista-check">
                <li><?= icono('check') ?> Expedientes completos y coherentes entre especialidades.</li>
                <li><?= icono('check') ?> Presupuestos sustentados con metrados y análisis de costos reales.</li>
                <li><?= icono('check') ?> Cumplimiento de plazos y levantamiento oportuno de observaciones.</li>
                <li><?= icono('check') ?> Trato directo con el equipo técnico durante todo el proyecto.</li>
            </ul>
        </div>

        <aside class="ficha">
            <h2 class="ficha__titulo"><?= icono('escudo') ?> Datos de la empresa</h2>
            <dl>
                <div><dt>Razón social</dt><dd><?= e(EMPRESA['razon_social']) ?></dd></div>
                <div><dt>RUC</dt><dd><?= e(EMPRESA['ruc']) ?></dd></div>
                <div><dt>Actividad</dt><dd>Actividades de arquitectura e ingeniería y consultoría técnica (CIIU 7110)</dd></div>
                <div><dt>Registro Nacional de Proveedores</dt><dd>Habilitado como consultor de obras, apto para contratar con el Estado</dd></div>
                <?php if (EMPRESA['direccion'] !== ''): ?><div><dt>Domicilio</dt><dd><?= e(direccion_completa()) ?> – <?= e(EMPRESA['region']) ?></dd></div><?php endif; ?>
                <div><dt>Inicio de actividades</dt><dd>Enero de <?= e(EMPRESA['inicio']) ?></dd></div>
            </dl>
        </aside>
    </div>
</section>

<section class="seccion seccion--suave">
    <div class="contenedor">
        <div class="seccion__cabecera">
            <p class="etiqueta">RNP · OSCE</p>
            <h2>Especialidades y categorías</h2>
            <p>La categoría indica el monto máximo de los contratos de consultoría de obras a los que la empresa puede postular en cada especialidad.</p>
        </div>
        <div class="tabla-envoltura">
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

<section class="cta">
    <div class="contenedor cta__caja">
        <div>
            <h2>Trabajemos juntos</h2>
            <p>Atendemos proyectos en Chiclayo, Lambayeque y todo el norte del Perú.</p>
        </div>
        <div class="cta__acciones">
            <a class="boton boton--primario" href="contacto.php">Contáctanos</a>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
