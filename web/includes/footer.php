</main>

<footer class="pie-corporativo">
    <div class="contenedor">
        <div class="pie-corporativo__grid">
            
            <!-- Columna 1: Identidad Corporativa y RUC -->
            <div class="pie-corporativo__col">
                <div class="pie-corporativo__marca">
                    <img src="assets/img/logo.svg" alt="INGELOP" class="pie-corporativo__logo" width="44" height="44" onerror="this.src='assets/img/logo.png'; this.onerror=null;">
                    <div>
                        <span class="pie-corporativo__nombre">INGELOP</span>
                        <span class="pie-corporativo__tipo">CONSULTORES Y EJECUTORES E.I.R.L.</span>
                    </div>
                </div>
                <p class="pie-corporativo__resumen">
                    Consultora chiclayana de arquitectura e ingeniería: estudios de preinversión, expedientes técnicos, diseño y supervisión de obras públicas y privadas.
                </p>
                <div class="pie-corporativo__ruc">
                    <span class="ruc-badge">RUC</span>
                    <strong>20610231676</strong>
                </div>
            </div>

            <!-- Columna 2: Especialidades -->
            <div class="pie-corporativo__col">
                <h4 class="pie-corporativo__subtitulo">Especialidades</h4>
                <ul class="pie-corporativo__lista">
                    <li><a href="servicios.php#estudios-preinversion">Estudios de preinversión</a></li>
                    <li><a href="servicios.php#expedientes-tecnicos">Expedientes técnicos</a></li>
                    <li><a href="servicios.php#diseno-arquitectonico">Diseño arquitectónico y de ingeniería</a></li>
                    <li><a href="servicios.php#supervision-obras">Supervisión de obras</a></li>
                    <li><a href="servicios.php#liquidacion-obras">Liquidación de obras</a></li>
                    <li><a href="servicios.php#consultoria-tecnica">Consultoría técnica</a></li>
                </ul>
            </div>

            <!-- Columna 3: Contacto -->
            <div class="pie-corporativo__col">
                <h4 class="pie-corporativo__subtitulo">Contacto Directo</h4>
                <ul class="pie-corporativo__contacto">
                    <li>
                        <span class="icono-contacto"><?= icono('telefono') ?></span>
                        <a href="tel:+51979660255">979 660 255</a>
                    </li>
                    <li>
                        <span class="icono-contacto"><?= icono('correo') ?></span>
                        <a href="mailto:luisalbertolopez19@gmail.com">luisalbertolopez19@gmail.com</a>
                    </li>
                    <li>
                        <span class="icono-contacto"><?= icono('ubicacion') ?></span>
                        <span>Calle Yahuar Huaca 137, Asoc. Las Quintas Sector Uno, La Victoria, Chiclayo</span>
                    </li>
                    <li>
                        <span class="icono-contacto"><?= icono('reloj') ?></span>
                        <span>Lunes a viernes de 8:00 a. m. a 6:00 p. m.</span>
                    </li>
                </ul>
            </div>

        </div>

        <!-- Barra inferior -->
        <div class="pie-corporativo__inferior">
            <p>&copy; <?= date('Y') ?> INGELOP Consultores y Ejecutores E.I.R.L. Chiclayo, Lambayeque – Perú.</p>
            <a href="admin/" class="enlace-personal">
                <span>Acceso del personal</span>
                <span class="flecha-mini"><?= icono('flecha') ?></span>
            </a>
        </div>
    </div>
</footer>


<a class="whatsapp-flotante" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
    <?= icono('whatsapp') ?>
</a>

<script src="assets/js/main.js?v=<?= time() ?>"></script>
</body>
</html>
