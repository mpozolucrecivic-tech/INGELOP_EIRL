</main>

<footer class="pie">
    <div class="contenedor pie__grid">
        <div>
            <a class="marca marca--pie" href="index.php">
                <img src="assets/img/logo.svg" alt="" width="40" height="40">
                <span class="marca__texto">
                    <strong>INGELOP</strong>
                    <small>Consultores y Ejecutores E.I.R.L.</small>
                </span>
            </a>
            <p class="pie__texto"><?= e(EMPRESA['descripcion']) ?></p>
            <p class="pie__ruc">RUC <?= e(EMPRESA['ruc']) ?></p>
        </div>

        <div>
            <h2 class="pie__titulo">Servicios</h2>
            <ul class="pie__lista" data-servicios="pie">
                <?php foreach (SERVICIOS as $s): ?>
                    <li><a href="servicios.php#<?= e($s['slug']) ?>"><?= e($s['titulo']) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </div>

        <div>
            <h2 class="pie__titulo">Contacto</h2>
            <ul class="pie__lista pie__lista--iconos">
                <li><?= icono('telefono') ?><a href="tel:+<?= e(EMPRESA['telefono_e164']) ?>"><?= e(EMPRESA['telefono']) ?></a></li>
                <li><?= icono('correo') ?><a href="mailto:<?= e(EMPRESA['email']) ?>"><?= e(EMPRESA['email']) ?></a></li>
                <li><?= icono('mapa') ?><span><?= e(EMPRESA['direccion']) ?>, <?= e(EMPRESA['distrito']) ?>, <?= e(EMPRESA['ciudad']) ?></span></li>
                <li><?= icono('reloj') ?><span><?= e(EMPRESA['horario']) ?></span></li>
            </ul>
        </div>
    </div>
    <div class="pie__base">
        <div class="contenedor pie__base-fila">
            <span>© <?= date('Y') ?> <?= e(EMPRESA['razon_social']) ?>. Chiclayo, Lambayeque – Perú.</span>
            <?php if (EMPRESA['intranet_url'] !== ''): ?>
                <a href="<?= e(EMPRESA['intranet_url']) ?>" rel="nofollow">Acceso del personal</a>
            <?php endif; ?>
        </div>
    </div>
</footer>

<a class="whatsapp-flotante" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
    <?= icono('whatsapp') ?>
</a>

<?php if (API_URL !== ''): ?>
<!-- Íconos que usa assets/js/servicios.js al dibujar los servicios recibidos de la API -->
<template id="iconos-api">
    <?php foreach (ICONOS_SERVICIO as $nombreIcono): ?><span data-icono="<?= e($nombreIcono) ?>"><?= icono($nombreIcono) ?></span><?php endforeach; ?>
</template>
<?php endif; ?>

<script src="assets/js/main.js?v=1" defer></script>
<?php if (API_URL !== ''): ?>
<script src="assets/js/servicios.js?v=1" defer></script>
<?php if ($pagina === 'contacto'): ?><script src="assets/js/contacto.js?v=1" defer></script><?php endif; ?>
<?php endif; ?>
</body>
</html>
