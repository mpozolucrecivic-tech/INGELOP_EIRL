<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/includes/config.php';

$servicios = array_column(SERVICIOS, 'titulo', 'slug');
$datos = ['nombre' => '', 'email' => '', 'telefono' => '', 'entidad' => '', 'servicio' => '', 'mensaje' => ''];
$errores = [];
$enviado = false;

if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($datos as $campo => $_) {
        $datos[$campo] = trim((string) ($_POST[$campo] ?? ''));
    }

    // Protección: token CSRF, campo trampa para bots y un envío cada 30 s por sesión
    $tokenOk = hash_equals($_SESSION['csrf'], (string) ($_POST['csrf'] ?? ''));
    $esBot = ($_POST['sitio_web'] ?? '') !== '';
    $muyRapido = isset($_SESSION['ultimo_envio']) && time() - $_SESSION['ultimo_envio'] < 30;

    if (!$tokenOk) {
        $errores['general'] = 'La sesión expiró. Vuelve a enviar el formulario.';
    } elseif ($muyRapido) {
        $errores['general'] = 'Espera unos segundos antes de enviar otro mensaje.';
    }

    if (mb_strlen($datos['nombre']) < 3) $errores['nombre'] = 'Ingresa tu nombre.';
    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores['email'] = 'Ingresa un correo válido.';
    if ($datos['telefono'] !== '' && !preg_match('/^[0-9 +()-]{6,20}$/', $datos['telefono'])) $errores['telefono'] = 'Teléfono no válido.';
    if ($datos['servicio'] !== '' && !isset($servicios[$datos['servicio']])) $errores['servicio'] = 'Selecciona un servicio de la lista.';
    if (mb_strlen($datos['mensaje']) < 10) $errores['mensaje'] = 'Cuéntanos un poco más sobre tu proyecto (mínimo 10 caracteres).';
    foreach (['nombre' => 120, 'email' => 150, 'entidad' => 150, 'mensaje' => 3000] as $campo => $max) {
        if (mb_strlen($datos[$campo]) > $max) $errores[$campo] = 'Texto demasiado largo.';
    }

    if (!$errores) {
        if (!$esBot) {
            guardarMensaje($datos, $servicios);
            enviarCorreo($datos, $servicios);
        }
        // Al bot se le responde igual que a un usuario real, sin guardar nada
        $_SESSION['ultimo_envio'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $enviado = true;
        $datos = array_map(fn () => '', $datos);
    }
} elseif (isset($_GET['servicio'], $servicios[$_GET['servicio']])) {
    $datos['servicio'] = $_GET['servicio'];
}

/** Respaldo: cada mensaje queda en storage/mensajes.csv (carpeta protegida por .htaccess) */
function guardarMensaje(array $d, array $servicios): void
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $archivo = $dir . '/mensajes.csv';
    $nuevo = !file_exists($archivo);
    $fp = @fopen($archivo, 'ab');
    if (!$fp) return;
    if ($nuevo) fputcsv($fp, ['fecha', 'nombre', 'email', 'telefono', 'entidad', 'servicio', 'mensaje', 'ip']);
    // Evita inyección de fórmulas al abrir el CSV en Excel
    $limpio = fn (string $v) => preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;
    fputcsv($fp, array_map($limpio, [
        date('Y-m-d H:i:s'), $d['nombre'], $d['email'], $d['telefono'], $d['entidad'],
        $servicios[$d['servicio']] ?? '', $d['mensaje'], $_SERVER['REMOTE_ADDR'] ?? '',
    ]));
    fclose($fp);
}

/** Envía el aviso por correo con mail() (funciona en la mayoría de hostings compartidos) */
function enviarCorreo(array $d, array $servicios): void
{
    $sinSaltos = fn (string $v) => str_replace(["\r", "\n"], ' ', $v);
    $asunto = '=?UTF-8?B?' . base64_encode('Nuevo mensaje desde la web – ' . $sinSaltos($d['nombre'])) . '?=';
    $cuerpo = "Nombre: {$d['nombre']}\nCorreo: {$d['email']}\nTeléfono: {$d['telefono']}\n"
        . "Entidad / empresa: {$d['entidad']}\nServicio: " . ($servicios[$d['servicio']] ?? '-') . "\n\n{$d['mensaje']}\n";
    $cabeceras = [
        'From: Web INGELOP <no-responder@' . ($_SERVER['SERVER_NAME'] ?? 'localhost') . '>',
        'Reply-To: ' . $sinSaltos($d['email']),
        'Content-Type: text/plain; charset=UTF-8',
    ];
    @mail(EMPRESA['email'], $asunto, $cuerpo, implode("\r\n", $cabeceras));
}

$pagina = 'contacto';
$titulo = 'Contacto';
$descripcion = 'Solicita una cotización de expedientes técnicos, diseño o supervisión de obras. Oficina en La Victoria, Chiclayo.';
require __DIR__ . '/includes/header.php';

$error = fn (string $campo) => isset($errores[$campo]) ? '<p class="campo__error">' . e($errores[$campo]) . '</p>' : '';
$mapa = rawurlencode(EMPRESA['direccion'] . ', ' . EMPRESA['distrito'] . ', ' . EMPRESA['ciudad'] . ', Perú');
?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Contacto</p>
        <h1>Conversemos sobre tu proyecto</h1>
        <p class="encabezado__lead">Déjanos tus datos y el detalle de lo que necesitas. Te respondemos con una propuesta técnica y económica.</p>
    </div>
</section>

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

            <form method="post" action="contacto.php" novalidate>
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
                        <label for="servicio">Servicio de interés</label>
                        <select id="servicio" name="servicio">
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
                <p class="nota">Tus datos solo se usan para responder tu consulta.</p>
            </form>
        </div>

        <aside class="contacto__datos">
            <a class="dato" href="<?= e(whatsapp()) ?>" target="_blank" rel="noopener">
                <span class="dato__icono dato__icono--wsp"><?= icono('whatsapp') ?></span>
                <span><strong>WhatsApp</strong><?= e(EMPRESA['telefono']) ?></span>
            </a>
            <a class="dato" href="tel:+<?= e(EMPRESA['telefono_e164']) ?>">
                <span class="dato__icono"><?= icono('telefono') ?></span>
                <span><strong>Llámanos</strong><?= e(EMPRESA['telefono']) ?></span>
            </a>
            <a class="dato" href="mailto:<?= e(EMPRESA['email']) ?>">
                <span class="dato__icono"><?= icono('correo') ?></span>
                <span><strong>Correo</strong><?= e(EMPRESA['email']) ?></span>
            </a>
            <a class="dato" href="https://www.google.com/maps/search/?api=1&amp;query=<?= $mapa ?>" target="_blank" rel="noopener">
                <span class="dato__icono"><?= icono('mapa') ?></span>
                <span><strong>Oficina</strong><?= e(EMPRESA['direccion']) ?>, <?= e(EMPRESA['distrito']) ?>, <?= e(EMPRESA['ciudad']) ?></span>
            </a>
            <div class="dato dato--estatico">
                <span class="dato__icono"><?= icono('reloj') ?></span>
                <span><strong>Horario de atención</strong><?= e(EMPRESA['horario']) ?></span>
            </div>
        </aside>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
