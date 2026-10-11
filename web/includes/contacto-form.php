<section class="seccion">
    <div class="contenedor contacto">
        <div class="contacto__form">
            <?php if ($enviado): ?>
                <div class="alerta alerta--exito" role="status">
                    <?= icono('check') ?>
                    <div>
                        <strong>¡Mensaje enviado!</strong>
                        <p>Gracias por escribirnos. Te responderemos a la brevedad.</p>
                    </div>
                </div>
            <?php elseif (isset($errores['general'])): ?>
                <div class="alerta alerta--error" role="alert"><?= e($errores['general']) ?></div>
            <?php endif; ?>

            <form method="post" action="contacto.php" novalidate data-contacto-api>
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
                <!-- Campo trampa: los usuarios no lo ven; los bots suelen llenarlo -->
                <div class="trampa" aria-hidden="true">
                    <label for="sitio_web">No llenar</label>
                    <input type="text" id="sitio_web" name="sitio_web" tabindex="-1" autocomplete="off">
                </div>

                <div class="form-grid">
                    <div class="campo">
                        <label for="nombre">Nombre y apellidos *</label>
                        <input id="nombre" name="nombre" required maxlength="120" value="<?= e($datos['nombre']) ?>" autocomplete="name"<?= isset($errores['nombre']) ? ' aria-invalid="true"' : '' ?>>
                        <?= $error('nombre') ?>
                    </div>
                    <div class="campo">
                        <label for="entidad">Entidad o empresa</label>
                        <input id="entidad" name="entidad" maxlength="150" value="<?= e($datos['entidad']) ?>" autocomplete="organization" placeholder="Opcional">
                        <?= $error('entidad') ?>
                    </div>
                    <div class="campo">
                        <label for="email">Correo electrónico *</label>
                        <input id="email" name="email" type="email" required maxlength="150" value="<?= e($datos['email']) ?>" autocomplete="email"<?= isset($errores['email']) ? ' aria-invalid="true"' : '' ?>>
                        <?= $error('email') ?>
                    </div>
                    <div class="campo">
                        <label for="telefono">Teléfono / celular</label>
                        <input id="telefono" name="telefono" type="tel" maxlength="20" value="<?= e($datos['telefono']) ?>" autocomplete="tel" placeholder="Opcional"<?= isset($errores['telefono']) ? ' aria-invalid="true"' : '' ?>>
                        <?= $error('telefono') ?>
                    </div>
                    <div class="campo campo--ancho">
                        <label for="tipo">Tipo de consulta</label>
                        <select id="tipo" name="tipo"<?= isset($errores['tipo']) ? ' aria-invalid="true"' : '' ?>>
                            <?php foreach ($tipos as $valorTipo => $nombreTipo): ?>
                                <option value="<?= e($valorTipo) ?>"<?= $datos['tipo'] === $valorTipo ? ' selected' : '' ?>><?= e($nombreTipo) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <?= $error('tipo') ?>
                    </div>
                    <div class="campo campo--ancho">
                        <label for="servicio">Servicio de interés</label>
                        <select id="servicio" name="servicio" data-servicios="select">
                            <option value="">Selecciona…</option>
                            <?php foreach ($servicios as $slug => $nombre): ?>
                                <option value="<?= e($slug) ?>"<?= $datos['servicio'] === $slug ? ' selected' : '' ?>><?= e($nombre) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <?= $error('servicio') ?>
                    </div>
                    <div class="campo campo--ancho">
                        <label for="mensaje">Cuéntanos sobre tu proyecto *</label>
                        <textarea id="mensaje" name="mensaje" rows="6" required maxlength="3000" placeholder="Tipo de obra, ubicación, etapa en la que se encuentra, plazos…"<?= isset($errores['mensaje']) ? ' aria-invalid="true"' : '' ?>><?= e($datos['mensaje']) ?></textarea>
                        <?= $error('mensaje') ?>
                    </div>
                </div>
                <button class="boton boton--primario" type="submit">Enviar mensaje <?= icono('flecha') ?></button>
                <p class="nota">Tus datos solo se usan para responder tu consulta. <a href="privacidad.php">Política de privacidad</a>.</p>
            </form>
        </div>

        <aside class="contacto__datos">
            <?php if (hay_whatsapp()): ?>
            <a class="dato" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener">
                <span class="dato__icono dato__icono--wsp"><?= icono('whatsapp') ?></span>
                <span><strong>WhatsApp</strong><?= e(EMPRESA['telefono'] !== '' ? EMPRESA['telefono'] : 'Escríbenos') ?></span>
            </a>
            <?php endif; ?>
            <?php if (EMPRESA['telefono'] !== ''): ?>
            <a class="dato" href="tel:<?= e(telefono_enlace()) ?>">
                <span class="dato__icono"><?= icono('telefono') ?></span>
                <span><strong>Llámanos</strong><?= e(EMPRESA['telefono']) ?></span>
            </a>
            <?php endif; ?>
            <?php if (EMPRESA['email'] !== ''): ?>
            <a class="dato" href="mailto:<?= e(EMPRESA['email']) ?>">
                <span class="dato__icono"><?= icono('correo') ?></span>
                <span><strong>Correo</strong><?= e(EMPRESA['email']) ?></span>
            </a>
            <?php endif; ?>
            <?php if (EMPRESA['direccion'] !== ''): ?>
            <a class="dato" href="https://www.google.com/maps/search/?api=1&amp;query=<?= $mapa ?>" target="_blank" rel="noopener">
                <span class="dato__icono"><?= icono('mapa') ?></span>
                <span><strong>Oficina</strong><?= e(direccion_completa()) ?></span>
            </a>
            <?php endif; ?>
            <?php if (EMPRESA['horario'] !== ''): ?>
            <div class="dato dato--estatico">
                <span class="dato__icono"><?= icono('reloj') ?></span>
                <span><strong>Horario de atención</strong><?= e(EMPRESA['horario']) ?></span>
            </div>
            <?php endif; ?>
        </aside>
    </div>
</section>

