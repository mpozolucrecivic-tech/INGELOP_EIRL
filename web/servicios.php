<?php
$pagina = 'servicios';
$titulo = 'Servicios';
$descripcion = 'Estudios de preinversión, expedientes técnicos, diseño arquitectónico y de ingeniería, supervisión y liquidación de obras en Chiclayo y Lambayeque.';
require __DIR__ . '/includes/header.php';
?>

<!-- HERO PORTADA SERVICIOS -->
<section class="servicios-portada">
    <div class="contenedor servicios-portada__contenido">
        
        <span class="badge-tecnico-portada">
            <span class="punto-verde-pulso"></span>
            Catálogo de Servicios
        </span>

        <h1 class="servicios-portada__titulo">
            Consultoría de obras de <br>
            <span class="resalte-verde">principio a fin</span>
        </h1>

        <p class="servicios-portada__descripcion">
            Desde el estudio de preinversión hasta la liquidación de la obra, con un solo equipo multidisciplinario de arquitectos e ingenieros colegiados.
        </p>

        <div class="servicios-portada__pildoras">
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Expedientes listos para licitar</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Supervisión y control de calidad</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Conformidad Invierte.pe y OSCE</span>
            </div>
        </div>

    </div>
</section>

<section class="seccion seccion--servicios-catalogo">
    <div class="contenedor">
        
        <div class="servicios-cards-grid">
            
            <!-- 01. Estudios de preinversión -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/preinversion.jpg" alt="Estudios de preinversión" loading="lazy" onerror="this.src='assets/img/servicios.jpg'">
                    <span class="tarjeta-servicio__numero">01</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Estudios de preinversión</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Fichas técnicas y estudios de perfil para proyectos de inversión pública en el marco de Invierte.pe.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Diagnóstico y levantamiento de información</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Planteamiento técnico de alternativas</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Costos, evaluación social y sostenibilidad</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=preinversion" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

            <!-- 02. Expedientes técnicos -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/expediente.jpg" alt="Expedientes técnicos" loading="lazy" onerror="this.src='assets/img/nosotros.jpg'">
                    <span class="tarjeta-servicio__numero">02</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Expedientes técnicos</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Expedientes completos listos para licitar y ejecutar, con todas las especialidades integradas.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Memoria descriptiva y especificaciones técnicas</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Planos de todas las especialidades</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Metrados, análisis de costos unitarios y presupuesto</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Fórmula polinómica y cronograma de obra</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=expedientes" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

            <!-- 03. Diseño arquitectónico y de ingeniería -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/diseño.png" alt="Diseño arquitectónico y de ingeniería" loading="lazy" onerror="this.src='assets/img/servicios.jpg'">
                    <span class="tarjeta-servicio__numero">03</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Diseño arquitectónico y de ingeniería</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Proyectos de arquitectura, estructuras e instalaciones para inversión pública y privada.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Anteproyecto y proyecto arquitectónico</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Diseño estructural</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Instalaciones sanitarias y eléctricas</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Expedientes para licencia de edificación</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=diseno" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

            <!-- 04. Supervisión de obras -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/supervicion.jpg" alt="Supervisión de obras" loading="lazy" onerror="this.src='assets/img/servicios.jpg'">
                    <span class="tarjeta-servicio__numero">04</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Supervisión de obras</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Control técnico, económico y de plazos para que la obra se ejecute según el expediente aprobado.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Control de calidad y valorizaciones</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Revisión de adicionales y ampliaciones de plazo</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Informes mensuales a la entidad</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Recepción de obra</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=supervision" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

            <!-- 05. Liquidación de obras -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/liquidacion.png" alt="Liquidación de obras" loading="lazy" onerror="this.src='assets/img/nosotros.jpg'">
                    <span class="tarjeta-servicio__numero">05</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Liquidación de obras</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Liquidación técnica y financiera de contratos de obra y consultoría.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Revisión de metrados finales</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Cálculo de reajustes y saldos</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Expediente de liquidación</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=liquidacion" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

            <!-- 06. Consultoría técnica -->
            <article class="tarjeta-servicio">
                <div class="tarjeta-servicio__foto">
                    <img src="assets/img/consultoria.jpg" alt="Consultoría técnica" loading="lazy" onerror="this.src='assets/img/servicios.jpg'">
                    <span class="tarjeta-servicio__numero">06</span>
                </div>
                <div class="tarjeta-servicio__cuerpo">
                    <div class="tarjeta-servicio__icono-sup"><?= icono('check') ?></div>
                    <h3 class="tarjeta-servicio__titulo">Consultoría técnica</h3>
                    <p class="tarjeta-servicio__descripcion">
                        Asesoría a entidades públicas, empresas y particulares en proyectos de construcción.
                    </p>
                    
                    <div class="tarjeta-servicio__detalles">
                        <ul class="tarjeta-servicio__puntos">
                            <li><span class="check-mini"><?= icono('check') ?></span> Evaluación y revisión de expedientes</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Peritajes e informes técnicos</li>
                            <li><span class="check-mini"><?= icono('check') ?></span> Asesoría en procesos de contratación</li>
                        </ul>
                    </div>
                </div>
                <div class="tarjeta-servicio__acciones">
                    <a href="contacto.php?servicio=consultoria" class="btn-card btn-card--cotizar">
                        <span>Cotizar este servicio</span>
                        <span class="btn-card__flecha"><?= icono('flecha') ?></span>
                    </a>
                    <button type="button" class="btn-card btn-card--mas" data-toggle="detalles">
                        <span>Ver más</span>
                    </button>
                </div>
            </article>

        </div>

    </div>
</section>

<section class="seccion seccion--equipo-expediente">
    <div class="contenedor">
        
        <div class="seccion__cabecera text-center">
            <span class="badge-verde-boton">
                <span class="punto-verde-pulso"></span>
                Capacidad Técnica y Normativa
            </span>
            <h2 class="seccion__titulo">
                Equipo colegiado y <span class="resalte-verde">expedientes técnicos</span>
            </h2>
            <p class="seccion__subtitulo">
                Entregamos todos los componentes que las entidades públicas y privadas exigen para aprobar, licitar y convocar una obra sin observaciones.
            </p>
        </div>

        <div class="grid-split-tecnico">
            
            <!-- Columna 1: Equipo de Trabajo -->
            <div class="col-equipo-trabajo">
                <div class="bloque-tarjeta-guia">
                    <h3 class="col-titulo">Nuestro equipo de trabajo</h3>
                    <p class="col-descripcion">
                        Profesionales titulados y colegiados con experiencia en formulación y evaluación de proyectos bajo el sistema Invierte.pe y la Ley de Contrataciones del Estado.
                    </p>
                </div>

                <div class="equipo-cards">
                    <!-- Tarjeta Arquitectura -->
                    <div class="tarjeta-rol">
                        <div class="tarjeta-rol__emblema">
                            <span>ARQ</span>
                        </div>
                        <div class="tarjeta-rol__info">
                            <div class="tarjeta-rol__top">
                                <h4>Arquitectos Colegiados</h4>
                                <span class="chip-colegiatura">CAP</span>
                            </div>
                            <p>Diseño arquitectónico, distribución funcional, volumetría 3D, habilitaciones urbanas y compatibilización espacial.</p>
                        </div>
                    </div>

                    <!-- Tarjeta Ingeniería Civil -->
                    <div class="tarjeta-rol">
                        <div class="tarjeta-rol__emblema">
                            <span>ING</span>
                        </div>
                        <div class="tarjeta-rol__info">
                            <div class="tarjeta-rol__top">
                                <h4>Ingenieros Civiles</h4>
                                <span class="chip-colegiatura">CIP</span>
                            </div>
                            <p>Cálculo estructural, diseño sismorresistente, mecánica de suelos, topografía, metrados, análisis de costos y programación.</p>
                        </div>
                    </div>
                </div>

                <div class="nota-colegiatura">
                    <span class="punto-verde-fijo"></span>
                    <span>Proyectos firmados por profesionales habilitados ante el CAP y CIP.</span>
                </div>
            </div>

            <!-- Columna 2: Qué incluye un Expediente Técnico -->
            <div class="col-expediente-lista">
                <div class="caja-expediente">
                    <div class="caja-expediente__header">
                        <div>
                            <h3 class="caja-expediente__titulo">¿Qué incluye el expediente técnico?</h3>
                        </div>
                        <span class="badge-contador-items">14 Componentes</span>
                    </div>

                    <div class="items-expediente-grid">
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Memoria descriptiva</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Estudio topográfico</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Estudio de mecánica de suelos</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Planos de arquitectura</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Planos de estructuras</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Instalaciones sanitarias</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Instalaciones eléctricas</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Especificaciones técnicas</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Planilla de metrados</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Análisis de costos unitarios</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Presupuesto de obra</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Fórmula polinómica</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Cronograma de ejecución</span>
                        </div>
                        <div class="item-expediente">
                            <span class="item-expediente__check"><?= icono('check') ?></span>
                            <span>Panel fotográfico</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</section>

<!-- SECCIÓN: QUIÉNES SON NUESTROS CLIENTES -->
<section class="seccion seccion--clientes">
    <div class="contenedor">
        
        <div class="seccion__cabecera text-center">
            <span class="badge-verde-boton">
                <span class="punto-verde-pulso"></span>
                Sectores Atendidos
            </span>
            <h2 class="seccion__titulo">
                ¿Quiénes son nuestros <span class="resalte-verde">clientes</span>?
            </h2>
            <p class="seccion__subtitulo">
                Brindamos soluciones técnicas adaptadas a los estándares de entidades del Estado, empresas constructoras y promotores inmobiliarios.
            </p>
        </div>

        <div class="clientes-grid">
            
            <!-- Cliente 1: Sector Público -->
            <article class="tarjeta-cliente">
                <div class="tarjeta-cliente__icono">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 8H2l10-8z"/>
                    </svg>
                </div>
                <div class="tarjeta-cliente__header">
                    <span class="tarjeta-cliente__badge">Estado y RNP</span>
                    <h3 class="tarjeta-cliente__titulo">Sector Público</h3>
                </div>
                <p class="tarjeta-cliente__desc">
                    Municipalidades distritales, provinciales y gobiernos regionales que requieren expedientes técnicos conformes al marco de Invierte.pe y la Ley de Contrataciones del Estado.
                </p>
                <ul class="tarjeta-cliente__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Fichas técnicas y estudios de preinversión</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Expedientes listos para licitación pública</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Supervisión y liquidación de obras por contrata</li>
                </ul>
            </article>

            <!-- Cliente 2: Sector Privado y Contratistas -->
            <article class="tarjeta-cliente tarjeta-cliente--destacada">
                <div class="tarjeta-cliente__icono">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                </div>
                <div class="tarjeta-cliente__header">
                    <span class="tarjeta-cliente__badge">Empresas</span>
                    <h3 class="tarjeta-cliente__titulo">Empresas Constructoras</h3>
                </div>
                <p class="tarjeta-cliente__desc">
                    Consorcios y empresas contratistas que necesitan respaldo técnico en gabinete o campo para cumplir estrictamente con los plazos y especificaciones de obra.
                </p>
                <ul class="tarjeta-cliente__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Metrados de precisión y análisis de precios (ACU)</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Compatibilización de planos multidisciplinarios</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Sustento de adicionales y ampliaciones de plazo</li>
                </ul>
            </article>

            <!-- Cliente 3: Inversionistas y Particulares -->
            <article class="tarjeta-cliente">
                <div class="tarjeta-cliente__icono">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                </div>
                <div class="tarjeta-cliente__header">
                    <span class="tarjeta-cliente__badge">Inversión Privada</span>
                    <h3 class="tarjeta-cliente__titulo">Promotores y Particulares</h3>
                </div>
                <p class="tarjeta-cliente__desc">
                    Propietarios, emprendedores y desarrolladores inmobiliarios con proyectos de edificaciones comerciales, industriales o residenciales en Lambayeque y el norte.
                </p>
                <ul class="tarjeta-cliente__lista">
                    <li><span class="check-mini"><?= icono('check') ?></span> Diseño arquitectónico y estructural sismorresistente</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Expedientes para licencias de edificación</li>
                    <li><span class="check-mini"><?= icono('check') ?></span> Asesoría técnica integral previa a la construcción</li>
                </ul>
            </article>

        </div>

    </div>
</section>

<section class="seccion seccion--cierre-servicios">
    <div class="contenedor">
        <div class="cierre-box">
            
            <div class="cierre-box__info">
                <span class="cierre-box__tag">
                    <span class="punto-verde-pulso"></span>
                    Atención Inmediata
                </span>
                <h2 class="cierre-box__titulo">
                    Solicita una <span class="resalte-verde">propuesta</span>
                </h2>
                <p class="cierre-box__bajada">
                    Cuéntanos sobre tu proyecto y te indicamos los términos de referencia y requerimientos técnicos necesarios para cotizarlo con precisión.
                </p>
            </div>

            <div class="cierre-box__acciones">
                <a href="contacto.php" class="btn-cta btn-cta--primario">
                    <span>Cotizar proyecto</span>
                    <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                </a>
                
                <a href="<?= e(whatsapp('Hola INGELOP, deseo cotizar una propuesta técnica para un proyecto.')) ?>" target="_blank" rel="noopener" class="btn-cta btn-cta--whatsapp">
                    <span class="btn-cta__icono-wa"><?= icono('whatsapp') ?></span>
                    <span>WhatsApp</span>
                </a>
            </div>

        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
