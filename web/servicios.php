<?php
$pagina = 'servicios';
$portada = true;
$titulo = 'Servicios';
$descripcion = 'Estudios de preinversión, expedientes técnicos, diseño arquitectónico y de ingeniería, supervisión y liquidación de obras en Chiclayo y Lambayeque.';
require __DIR__ . '/includes/header.php';

$componentes = [
    'Memoria descriptiva', 'Estudio topográfico', 'Estudio de mecánica de suelos', 'Planos de arquitectura',
    'Planos de estructuras', 'Instalaciones sanitarias', 'Instalaciones eléctricas', 'Especificaciones técnicas',
    'Planilla de metrados', 'Análisis de costos unitarios', 'Presupuesto de obra', 'Fórmula polinómica',
    'Cronograma de ejecución', 'Panel fotográfico',
];
$sectores = [
    ['icono' => 'edificio', 'tipo' => 'Estado y RNP', 'titulo' => 'Sector público', 'destacado' => false,
     'texto' => 'Municipalidades distritales, provinciales y gobiernos regionales que requieren expedientes técnicos conformes a Invierte.pe y a la Ley de Contrataciones del Estado.',
     'items' => ['Fichas técnicas y estudios de preinversión', 'Expedientes listos para licitación pública', 'Supervisión y liquidación de obras por contrata']],
    ['icono' => 'casco', 'tipo' => 'Empresas', 'titulo' => 'Empresas constructoras', 'destacado' => true,
     'texto' => 'Consorcios y contratistas que necesitan respaldo técnico en gabinete o en campo para cumplir los plazos y especificaciones de obra.',
     'items' => ['Metrados de precisión y análisis de precios unitarios', 'Compatibilización de planos de todas las especialidades', 'Sustento de adicionales y ampliaciones de plazo']],
    ['icono' => 'compas', 'tipo' => 'Inversión privada', 'titulo' => 'Promotores y particulares', 'destacado' => false,
     'texto' => 'Propietarios, emprendedores y desarrolladores con proyectos comerciales, industriales o residenciales en Lambayeque y el norte.',
     'items' => ['Diseño arquitectónico y estructural sismorresistente', 'Expedientes para licencia de edificación', 'Asesoría técnica previa a la construcción']],
];
?>

<section class="portada">
    <div class="portada__foto" style="background-image: url('assets/img/fotos/servicios.webp')" aria-hidden="true"></div>
    <div class="contenedor">
        <div class="portada__contenido" data-revelar>
            <p class="etiqueta">Catálogo de servicios</p>
            <h1>Consultoría de obras <span class="resaltado">de principio a fin</span></h1>
            <p class="portada__lead">Desde el estudio de preinversión hasta la liquidación de la obra, con un mismo equipo de arquitectos e ingenieros colegiados.</p>
            <ul class="portada__chips">
                <li><?= icono('check') ?> Expedientes listos para licitar</li>
                <li><?= icono('check') ?> Supervisión y control de calidad</li>
                <li><?= icono('check') ?> Conformes a Invierte.pe y la normativa de contrataciones</li>
            </ul>
        </div>
    </div>
</section>

<section class="seccion">
    <div class="contenedor tarjetas tarjetas--3" data-servicios="lista" data-revelar-grupo>
        <?php foreach (SERVICIOS as $i => $s): $foto = foto_servicio($s); ?>
            <article class="tarjeta tarjeta-foto" id="<?= e($s['slug']) ?>">
                <?php if ($foto !== ''): ?>
                    <div class="tarjeta-foto__imagen">
                        <img src="<?= e($foto) ?>" alt="" loading="lazy">
                        <span class="tarjeta-foto__num"><?= str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) ?></span>
                    </div>
                <?php endif; ?>
                <div class="tarjeta-foto__cuerpo">
                    <?php if ($foto !== ''): ?><span class="tarjeta-foto__icono"><?= icono($s['icono']) ?></span><?php else: ?><span class="tarjeta__icono"><?= icono($s['icono']) ?></span><?php endif; ?>
                    <h2 class="tarjeta__titulo"><?= e($s['titulo']) ?></h2>
                    <p><?= e($s['resumen']) ?></p>
                    <?php if ($s['items']): ?>
                        <div class="tarjeta-foto__detalles" id="detalle-<?= e($s['slug']) ?>">
                            <div>
                                <ul class="lista-check">
                                    <?php foreach ($s['items'] as $item): ?>
                                        <li><?= icono('check') ?> <?= e($item) ?></li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        </div>
                    <?php endif; ?>
                    <div class="tarjeta-foto__acciones">
                        <a class="boton boton--primario boton--pequeno" href="contacto.php?servicio=<?= e($s['slug']) ?>">Cotizar este servicio <?= icono('flecha') ?></a>
                        <?php if ($s['items']): ?><button type="button" class="tarjeta-foto__ver" data-ver-mas aria-expanded="false" aria-controls="detalle-<?= e($s['slug']) ?>">Ver más</button><?php endif; ?>
                    </div>
                </div>
            </article>
        <?php endforeach; ?>
    </div>
</section>

<section class="seccion seccion--suave">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--centro" data-revelar>
            <p class="etiqueta">Capacidad técnica y normativa</p>
            <h2>Equipo colegiado y <span class="resaltado">expedientes técnicos</span></h2>
            <p>Entregamos todos los componentes que las entidades públicas y privadas exigen para aprobar, licitar y convocar una obra.</p>
        </div>
        <div class="dos-cajas">
            <div data-revelar>
                <h3>Nuestro equipo de trabajo</h3>
                <p style="color:var(--texto-suave)">Profesionales titulados y colegiados con experiencia en formulación y evaluación de proyectos bajo Invierte.pe y la Ley de Contrataciones del Estado.</p>
                <div class="profesional">
                    <span class="profesional__sigla">ARQ</span>
                    <div>
                        <h3>Arquitectos colegiados <span class="insignia">CAP</span></h3>
                        <p>Diseño arquitectónico, distribución funcional, volumetría 3D, habilitaciones urbanas y compatibilización de espacios.</p>
                    </div>
                </div>
                <div class="profesional">
                    <span class="profesional__sigla">ING</span>
                    <div>
                        <h3>Ingenieros civiles <span class="insignia">CIP</span></h3>
                        <p>Cálculo estructural, diseño sismorresistente, mecánica de suelos, topografía, metrados, costos y programación.</p>
                    </div>
                </div>
                <p class="nota"><?= icono('escudo') ?> Proyectos firmados por profesionales habilitados ante el CAP y el CIP.</p>
            </div>
            <div class="expediente" data-revelar style="--retraso:120ms">
                <div class="expediente__cabecera">
                    <h3>¿Qué incluye el expediente técnico?</h3>
                    <span class="expediente__total"><?= count($componentes) ?> componentes</span>
                </div>
                <ul class="chips">
                    <?php foreach ($componentes as $componente): ?>
                        <li><?= icono('check') ?> <?= e($componente) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>
</section>

<section class="seccion">
    <div class="contenedor">
        <div class="seccion__cabecera seccion__cabecera--centro" data-revelar>
            <p class="etiqueta">Sectores atendidos</p>
            <h2>¿Quiénes son nuestros <span class="resaltado">clientes</span>?</h2>
            <p>Soluciones técnicas adaptadas a entidades del Estado, empresas constructoras y promotores inmobiliarios.</p>
        </div>
        <div class="tarjetas tarjetas--3" data-revelar-grupo>
            <?php foreach ($sectores as $sec): ?>
                <article class="sector<?= $sec['destacado'] ? ' sector--destacado' : '' ?>">
                    <span class="sector__icono"><?= icono($sec['icono']) ?></span>
                    <p class="sector__tipo"><?= e($sec['tipo']) ?></p>
                    <h3><?= e($sec['titulo']) ?></h3>
                    <p><?= e($sec['texto']) ?></p>
                    <ul class="lista-check">
                        <?php foreach ($sec['items'] as $item): ?><li><?= icono('check') ?> <?= e($item) ?></li><?php endforeach; ?>
                    </ul>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="cta">
    <div class="contenedor cta__caja" data-revelar>
        <div>
            <p class="etiqueta">Atención inmediata</p>
            <h2>Solicita una <span class="resaltado">propuesta</span></h2>
            <p>Cuéntanos tu proyecto y te indicamos los términos de referencia y requisitos técnicos para cotizarlo con precisión.</p>
        </div>
        <div class="cta__acciones">
            <a class="boton boton--primario" href="contacto.php">Cotizar proyecto <?= icono('flecha') ?></a>
            <?php if (hay_whatsapp()): ?><a class="boton boton--whatsapp" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener"><?= icono('whatsapp') ?> WhatsApp</a><?php endif; ?>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
