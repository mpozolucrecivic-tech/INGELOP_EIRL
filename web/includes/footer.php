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

        <?php if (hay_contacto_visible()): ?>
        <div>
            <h2 class="pie__titulo">Contacto</h2>
            <ul class="pie__lista pie__lista--iconos">
                <?php if (EMPRESA['telefono'] !== ''): ?><li><?= icono('telefono') ?><a href="tel:+<?= e(EMPRESA['telefono_e164']) ?>"><?= e(EMPRESA['telefono']) ?></a></li><?php endif; ?>
                <?php if (EMPRESA['email'] !== ''): ?><li><?= icono('correo') ?><a href="mailto:<?= e(EMPRESA['email']) ?>"><?= e(EMPRESA['email']) ?></a></li><?php endif; ?>
                <?php if (EMPRESA['direccion'] !== ''): ?><li><?= icono('mapa') ?><span><?= e(direccion_completa()) ?></span></li><?php endif; ?>
                <?php if (EMPRESA['horario'] !== ''): ?><li><?= icono('reloj') ?><span><?= e(EMPRESA['horario']) ?></span></li><?php endif; ?>
            </ul>
        </div>
        <?php endif; ?>
    </div>
    <div class="pie__base">
        <div class="contenedor pie__base-fila">
            <span>© <?= date('Y') ?> <?= e(EMPRESA['razon_social']) ?>. Chiclayo, Lambayeque – Perú.</span>
        </div>
    </div>
</footer>

<?php if (EMPRESA['telefono_e164'] !== ''): ?>
<a class="whatsapp-flotante" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
    <?= icono('whatsapp') ?>
</a>
<?php endif; ?>

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
