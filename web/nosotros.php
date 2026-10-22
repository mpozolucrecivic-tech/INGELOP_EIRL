<?php
$pagina = 'nosotros';
$titulo = 'Nosotros';
$descripcion = 'INGELOP es una consultora de arquitectura e ingeniería con sede en Chiclayo, habilitada en el RNP del OSCE como consultor de obras.';
require __DIR__ . '/includes/header.php';
?>

<section class="nosotros-portada">
    <div class="contenedor nosotros-portada__contenido">
        
        <span class="badge-tecnico-portada">
            <span class="punto-verde-pulso"></span>
            Sobre Nosotros
        </span>

        <h1 class="nosotros-portada__titulo">
            Ingeniería y arquitectura <br>
            hecha en <span class="resalte-verde">Chiclayo</span>
        </h1>

        <p class="nosotros-portada__descripcion">
            Somos una empresa lambayecana dedicada a la consultoría de obras: estudiamos, diseñamos y supervisamos proyectos de infraestructura pública y privada con precisión técnica y rigor normativo.
        </p>

        <div class="nosotros-portada__metricas">
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Equipo multidisciplinario colegiado</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Conformidad técnica ante entidades públicas</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Registro Nacional de Proveedores (RNP)</span>
            </div>
        </div>

    </div>
</section>

<!-- FRANJA COMPACTA DE CONTADORES TÉCNICOS -->
<section class="seccion seccion--contadores-flotante">
    <div class="contenedor">
        <div class="contadores-caja">
            <div class="contadores-grid">
                
                <div class="contador-item">
                    <div class="contador-item__icono">
                        <?= icono('check') ?>
                    </div>
                    <div class="contador-item__cuerpo">
                        <div class="contador-item__cifra">
                            <span class="contador-valor" data-fin="5">0</span>
                        </div>
                        <p class="contador-item__etiqueta">
                            Especialidades RNP / OSCE
                        </p>
                    </div>
                </div>

                <div class="contador-item">
                    <div class="contador-item__icono">
                        <?= icono('check') ?>
                    </div>
                    <div class="contador-item__cuerpo">
                        <div class="contador-item__cifra">
                            <span class="contador-valor" data-fin="100">0</span><span class="contador-item__sufijo">%</span>
                        </div>
                        <p class="contador-item__etiqueta">
                            Conformidad en entregables
                        </p>
                    </div>
                </div>

                <div class="contador-item">
                    <div class="contador-item__icono">
                        <?= icono('check') ?>
                    </div>
                    <div class="contador-item__cuerpo">
                        <div class="contador-item__cifra">
                            <span class="contador-item__prefijo">+</span><span class="contador-valor" data-fin="20">0</span>
                        </div>
                        <p class="contador-item__etiqueta">
                            Expedientes y estudios
                        </p>
                    </div>
                </div>

                <div class="contador-item">
                    <div class="contador-item__icono">
                        <?= icono('check') ?>
                    </div>
                    <div class="contador-item__cuerpo">
                        <div class="contador-item__cifra">
                            <span class="contador-valor" data-fin="2023" data-inicio="2015">2015</span>
                        </div>
                        <p class="contador-item__etiqueta">
                            En Lambayeque y el norte
                        </p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</section>

<section class="seccion seccion--nosotros-info">
    <div class="contenedor nosotros-grid">
        
        <!-- Columna Izquierda: Quiénes somos y Compromisos -->
        <div class="nosotros-col-narrativa">
            
            <article class="bloque-perfil">
                <span class="badge-subseccion">
                    <span class="punto-verde-fijo"></span>
                    Identidad Institucional
                </span>
                <h2 class="subseccion-titulo">Quiénes somos</h2>
                <p class="parrafo-destacado">
                    <strong>INGELOP Consultores y Ejecutores E.I.R.L.</strong> es una empresa individual de responsabilidad limitada inscrita en los Registros Públicos en noviembre de 2022 e inició actividades en enero de 2023. Nuestra actividad principal es la <strong>arquitectura, la ingeniería y la consultoría técnica</strong>.
                </p>
                <p class="parrafo-secundario">
                    Trabajamos con municipalidades, gobiernos regionales, empresas y particulares de Lambayeque y el norte del país. Elaboramos la documentación técnica que un proyecto necesita para aprobarse, licitarse y ejecutarse correctamente, y acompañamos su ejecución como supervisores.
                </p>
            </article>

            <!-- Nuestro Compromiso -->
            <article class="bloque-compromiso">
                <h3 class="compromiso-titulo">Nuestro compromiso</h3>
                <div class="compromiso-lista">
                    
                    <div class="compromiso-item">
                        <div class="compromiso-item__check"><?= icono('check') ?></div>
                        <div class="compromiso-item__texto">
                            <strong>Expedientes integrales</strong>
                            <p>Completos y coherentes entre todas las especialidades involucradas.</p>
                        </div>
                    </div>

                    <div class="compromiso-item">
                        <div class="compromiso-item__check"><?= icono('check') ?></div>
                        <div class="compromiso-item__texto">
                            <strong>Presupuestos sustentados</strong>
                            <p>Metrados rigurosos y análisis de costos unitarios reales de mercado.</p>
                        </div>
                    </div>

                    <div class="compromiso-item">
                        <div class="compromiso-item__check"><?= icono('check') ?></div>
                        <div class="compromiso-item__texto">
                            <strong>Cumplimiento de plazos</strong>
                            <p>Control estricto de cronograma y levantamiento oportuno de observaciones.</p>
                        </div>
                    </div>

                    <div class="compromiso-item">
                        <div class="compromiso-item__check"><?= icono('check') ?></div>
                        <div class="compromiso-item__texto">
                            <strong>Trato directo y colegiado</strong>
                            <p>Comunicación sin intermediarios con el equipo técnico durante todo el proyecto.</p>
                        </div>
                    </div>

                </div>
            </article>

        </div>

        <!-- Columna Derecha: Ficha Técnica Registral -->
        <aside class="nosotros-col-ficha">
            <div class="ficha-legal">
                
                <div class="ficha-legal__cabecera">
                    <span class="ficha-legal__icono"><?= icono('check') ?></span>
                    <div>
                        <h4 class="ficha-legal__titulo">Datos de la empresa</h4>
                        <span class="ficha-legal__sub">Información técnica y registral</span>
                    </div>
                </div>

                <div class="ficha-legal__cuerpo">
                    
                    <div class="ficha-dato">
                        <span class="ficha-dato__label">Razón Social</span>
                        <span class="ficha-dato__valor">INGELOP Consultores y Ejecutores E.I.R.L.</span>
                    </div>

                    <div class="ficha-dato">
                        <span class="ficha-dato__label">RUC</span>
                        <div class="ficha-dato__ruc-caja">
                            <strong>20610231676</strong>
                            <span class="chip-estado">Activo</span>
                        </div>
                    </div>

                    <div class="ficha-dato">
                        <span class="ficha-dato__label">Actividad Económica</span>
                        <span class="ficha-dato__valor">Actividades de arquitectura e ingeniería y consultoría técnica (CIIU 7110)</span>
                    </div>

                    <div class="ficha-dato">
                        <span class="ficha-dato__label">Registro Nacional de Proveedores</span>
                        <div class="ficha-dato__rnp">
                            <span class="badge-rnp-mini">RNP - OSCE</span>
                            <span class="ficha-dato__valor">Habilitado como consultor de obras, apto para contratar con el Estado.</span>
                        </div>
                    </div>

                    <div class="ficha-dato">
                        <span class="ficha-dato__label">Domicilio Fiscal</span>
                        <span class="ficha-dato__valor">Calle Yahuar Huaca 137, Asoc. Las Quintas Sector Uno, La Victoria, Chiclayo – Lambayeque</span>
                    </div>

                    <div class="ficha-dato ficha-dato--ultimo">
                        <span class="ficha-dato__label">Inicio de Actividades</span>
                        <span class="ficha-dato__valor">Enero de 2023</span>
                    </div>

                </div>

                <div class="ficha-legal__pie">
                    <span class="punto-verde-fijo"></span>
                    <span>Documentación verificada y vigente</span>
                </div>

            </div>
        </aside>

    </div>
</section>

<section class="seccion seccion--rnp-tabla">
    <div class="contenedor">
        
        <!-- Cabecera de la sección -->
        <div class="seccion__cabecera seccion__cabecera--tabla">
            <span class="badge-tecnico">
                <span class="punto-verde"></span>
                RNP · OSCE
            </span>
            <h2 class="seccion__titulo">
                Especialidades y <span class="resalte-verde">categorías</span>
            </h2>
            <p class="seccion__subtitulo">
                La categoría indica el monto máximo de los contratos de consultoría de obras a los que la empresa puede postular en cada especialidad.
            </p>
        </div>

        <!-- Contenedor responsivo tipo Matriz Técnica -->
        <div class="tabla-rnp-contenedor">
            <table class="tabla-rnp">
                <thead>
                    <tr>
                        <th scope="col" class="th-especialidad">Especialidad</th>
                        <th scope="col" class="th-alcance">Qué incluye</th>
                        <th scope="col" class="th-categoria">Categoría</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="td-especialidad">
                            <span class="punto-fila"></span>
                            <strong>Obras urbanas, edificaciones y afines</strong>
                        </td>
                        <td class="td-alcance">
                            Instituciones educativas, establecimientos de salud, locales municipales, viviendas, habilitaciones urbanas y espacios públicos.
                        </td>
                        <td class="td-categoria">
                            <span class="badge-cat badge-cat--c">Cat. C</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="td-especialidad">
                            <span class="punto-fila"></span>
                            <strong>Obras de saneamiento y afines</strong>
                        </td>
                        <td class="td-alcance">
                            Sistemas de agua potable, redes de alcantarillado, plantas de tratamiento y drenaje pluvial.
                        </td>
                        <td class="td-categoria">
                            <span class="badge-cat badge-cat--c">Cat. C</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="td-especialidad">
                            <span class="punto-fila"></span>
                            <strong>Obras viales, puertos y afines</strong>
                        </td>
                        <td class="td-alcance">
                            Pistas, veredas, pavimentos, caminos vecinales, puentes y señalización vial.
                        </td>
                        <td class="td-categoria">
                            <span class="badge-cat badge-cat--b">Cat. B</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="td-especialidad">
                            <span class="punto-fila"></span>
                            <strong>Obras electromecánicas, energéticas, telecomunicaciones y afines</strong>
                        </td>
                        <td class="td-alcance">
                            Redes de distribución eléctrica, alumbrado público, subsistemas de utilización e instalaciones electromecánicas.
                        </td>
                        <td class="td-categoria">
                            <span class="badge-cat badge-cat--a">Cat. A</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="td-especialidad">
                            <span class="punto-fila"></span>
                            <strong>Obras de represas, irrigaciones y afines</strong>
                        </td>
                        <td class="td-alcance">
                            Canales de riego, bocatomas, reservorios y obras de defensa ribereña.
                        </td>
                        <td class="td-categoria">
                            <span class="badge-cat badge-cat--a">Cat. A</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
</section>

<!-- FRANJA DE CIERRE: TRABAJEMOS JUNTOS -->
<section class="seccion seccion--cierre-nosotros">
    <div class="contenedor">
        <div class="cierre-box cierre-box--completo">
            
            <!-- Columna Izquierda: Llamado directo -->
            <div class="cierre-box__info">
                <span class="cierre-box__tag">
                    <span class="punto-verde-pulso"></span>
                    Cobertura Regional
                </span>
                <h2 class="cierre-box__titulo">
                    Trabajemos <span class="resalte-verde">juntos</span>
                </h2>
                <p class="cierre-box__bajada">
                    Atendemos proyectos en Chiclayo, Lambayeque y todo el norte del país con solvencia técnica, rigor normativo y cumplimiento estricto de plazos.
                </p>
                <div class="cierre-box__acciones">
                    <a href="contacto.php" class="btn-cta btn-cta--primario">
                        <span>Contáctanos</span>
                        <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                    </a>
                </div>
            </div>

            <!-- Columna Derecha: Canales y Condiciones de Atención -->
            <div class="cierre-box__garantias">
                <div class="garantias-header">
                    <span class="garantias-header__codigo">// INICIO DE PROYECTO</span>
                    <h3 class="garantias-header__titulo">Condiciones de trabajo directo</h3>
                </div>

                <div class="garantias-lista">
                    <div class="garantia-item">
                        <span class="garantia-item__icono"><?= icono('check') ?></span>
                        <div class="garantia-item__texto">
                            <strong>Evaluación técnica inicial</strong>
                            <small>Revisión preliminar de requerimientos y términos de referencia (TDR).</small>
                        </div>
                    </div>

                    <div class="garantia-item">
                        <span class="garantia-item__icono"><?= icono('check') ?></span>
                        <div class="garantia-item__texto">
                            <strong>Propuesta valorizada y cronograma</strong>
                            <small>Presupuesto transparente ajustado al alcance real del encargo.</small>
                        </div>
                    </div>

                    <div class="garantia-item">
                        <span class="garantia-item__icono"><?= icono('check') ?></span>
                        <div class="garantia-item__texto">
                            <strong>Coordinación en obra o gabinete</strong>
                            <small>Reuniones presenciales en Chiclayo y atención remota permanente.</small>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
