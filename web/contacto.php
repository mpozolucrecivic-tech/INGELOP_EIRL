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

<section class="contacto-portada">
    <div class="contenedor contacto-portada__contenido">
        
        <span class="badge-verde-boton">
            <span class="punto-verde-pulso"></span>
            Canales de Atención Directa
        </span>

        <h1 class="contacto-portada__titulo">
            Conversemos sobre <br>
            <span class="resalte-verde">tu proyecto</span>
        </h1>

        <p class="contacto-portada__descripcion">
            Déjanos tus datos y el detalle de lo que necesitas. Te respondemos con una propuesta técnica y económica formal adaptada a tus requerimientos.
        </p>

        <div class="contacto-portada__pildoras">
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Respuesta técnica en 24-48 hrs</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Evaluación preliminar sin costo</span>
            </div>
            <div class="metrica-pila">
                <span class="metrica-pila__icono"><?= icono('check') ?></span>
                <span class="metrica-pila__texto">Atención presencial en Chiclayo</span>
            </div>
        </div>
    </div>
</section>

<!-- SECCIÓN: INFORMACIÓN DE NUESTRA OFICINA -->
<section class="seccion seccion--datos-contacto">
    <div class="contenedor">
        
        <div class="seccion__cabecera text-center">
            <span class="badge-verde-boton">
                <span class="punto-verde-pulso"></span>
                Sede Central
            </span>
            <h2 class="seccion__titulo">
                Información de nuestra <span class="resalte-verde">oficina</span>
            </h2>
            <p class="seccion__subtitulo">
                Escríbenos o visítanos para evaluar tu proyecto. Te brindamos atención personalizada en gabinete y campo en Chiclayo y la región norte.
            </p>
        </div>

        <div class="oficina-cards-grid">
            
            <!-- Tarjeta 1: Nuestra Ubicación -->
            <article class="tarjeta-oficina">
                <div class="tarjeta-oficina__icono">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                </div>
                <h3 class="tarjeta-oficina__titulo">Nuestra ubicación</h3>
                <div class="tarjeta-oficina__separador"></div>
                <p class="tarjeta-oficina__texto">
                    Calle Yahuar Huaca 137, Asoc. Las Quintas Sector Uno<br>
                    <strong>La Victoria, Chiclayo — Lambayeque</strong>
                </p>
                <a href="https://maps.google.com/?q=Calle+Yahuar+Huaca+137+La+Victoria+Chiclayo" target="_blank" rel="noopener" class="tarjeta-oficina__enlace">
                    <span>Ver en Google Maps</span>
                    <?= icono('flecha') ?>
                </a>
            </article>

            <!-- Tarjeta 2: Canales de Comunicación -->
            <article class="tarjeta-oficina tarjeta-oficina--destacada">
                <div class="tarjeta-oficina__icono">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </div>
                <h3 class="tarjeta-oficina__titulo">Canales directos</h3>
                <div class="tarjeta-oficina__separador"></div>
                <div class="tarjeta-oficina__datos">
                    <p>
                        <small>WhatsApp y Celular:</small>
                        <a href="tel:979660255" class="dato-link">979 660 255</a>
                    </p>
                    <p>
                        <small>Correo electrónico:</small>
                        <a href="mailto:luisalbertolopez19@gmail.com" class="dato-link">luisalbertolopez19@gmail.com</a>
                    </p>
                </div>
                <a href="<?= e(whatsapp('Hola INGELOP, deseo comunicarme con la oficina técnica.')) ?>" target="_blank" rel="noopener" class="btn-card btn-card--cotizar w-100">
                    <span>Escribir por WhatsApp</span>
                </a>
            </article>

            <!-- Tarjeta 3: Horario de Atención -->
            <article class="tarjeta-oficina">
                <div class="tarjeta-oficina__icono">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <h3 class="tarjeta-oficina__titulo">Horario de atención</h3>
                <div class="tarjeta-oficina__separador"></div>
                <div class="tarjeta-oficina__horarios">
                    <div class="fila-horario">
                        <span>Lunes a Viernes:</span>
                        <strong>8:00 a. m. – 6:00 p. m.</strong>
                    </div>
                    <div class="fila-horario">
                        <span>Sábados:</span>
                        <strong>Previa coordinación</strong>
                    </div>
                    <div class="fila-horario">
                        <span>Domingos:</span>
                        <strong class="texto-cerrado">Cerrado</strong>
                    </div>
                </div>
            </article>

        </div>
    </div>
</section>

<section class="seccion seccion--formulario-dark">
    <div class="contenedor contenedor--ancho">
        
        <div class="formulario-box-dark formulario-box-dark--horizontal">

            <!-- COLUMNA IZQUIERDA: INFORMACIÓN Y ACCIÓN DE ENVÍO -->
            <div class="formulario-box-dark__lateral">
                <div>
                    <span class="subtitulo-codigo-dark">// COTIZACIÓN TÉCNICA</span>
                    <h2 class="formulario-box-dark__titulo">
                        Envíanos los requerimientos de <span class="resalte-verde">tu proyecto</span>
                    </h2>
                    <p class="formulario-box-dark__bajada">
                        Completa el formulario y nuestro equipo revisará la información para emitir una estimación formal de alcance y honorarios.
                    </p>
                </div>

                <div class="lateral-accion-desktop">
                    <button class="btn-cta btn-cta--primario w-100" type="submit" form="form-contacto-principal">
                        <span>Enviar mensaje</span>
                        <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                    </button>
                    <p class="form-privacidad-dark">
                        <span class="punto-verde-fijo"></span> Tus datos solo se usan para responder tu consulta.
                    </p>
                </div>
            </div>

            <!-- COLUMNA DERECHA: CAMPOS DEL FORMULARIO -->
            <div class="formulario-box-dark__campos">
                
                <?php if ($enviado): ?>
                    <div class="alerta alerta--exito-dark" role="status">
                        <?= icono('check') ?>
                        <div>
                            <strong>¡Mensaje enviado con éxito!</strong>
                            <p>Gracias por escribirnos. Nos comunicaremos contigo a la brevedad.</p>
                        </div>
                    </div>
                <?php elseif (isset($errores['general'])): ?>
                    <div class="alerta alerta--error-dark" role="alert"><?= e($errores['general']) ?></div>
                <?php endif; ?>

                <form method="post" action="contacto.php" id="form-contacto-principal" class="form-dark" novalidate>
                    <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
                    
                    <!-- Campo trampa antibot -->
                    <div class="trampa" aria-hidden="true">
                        <label for="sitio_web">No llenar</label>
                        <input type="text" id="sitio_web" name="sitio_web" tabindex="-1" autocomplete="off">
                    </div>

                    <div class="form-grid-horizontal">
                        
                        <!-- Fila 1: Nombre y Entidad -->
                        <div class="campo">
                            <label for="nombre" class="form-label-dark">
                                Nombre y apellidos <span class="campo-obligatorio">*</span>
                            </label>
                            <input id="nombre" name="nombre" class="form-input-dark" required maxlength="120" value="<?= e($datos['nombre']) ?>" autocomplete="name" placeholder="Ej. Juan Pérez Ramos"<?= isset($errores['nombre']) ? ' aria-invalid="true"' : '' ?>>
                            <?= $error('nombre') ?>
                        </div>

                        <div class="campo">
                            <label for="entidad" class="form-label-dark">
                                Entidad o empresa <span class="campo-opcional-dark">(Opcional)</span>
                            </label>
                            <input id="entidad" name="entidad" class="form-input-dark" maxlength="150" value="<?= e($datos['entidad']) ?>" autocomplete="organization" placeholder="Ej. Municipalidad / Constructora SAC">
                            <?= $error('entidad') ?>
                        </div>

                        <!-- Fila 2: Correo y Teléfono -->
                        <div class="campo">
                            <label for="email" class="form-label-dark">
                                Correo electrónico <span class="campo-obligatorio">*</span>
                            </label>
                            <input id="email" name="email" type="email" class="form-input-dark" required maxlength="150" value="<?= e($datos['email']) ?>" autocomplete="email" placeholder="correo@ejemplo.com"<?= isset($errores['email']) ? ' aria-invalid="true"' : '' ?>>
                            <?= $error('email') ?>
                        </div>

                        <div class="campo">
                            <label for="telefono" class="form-label-dark">
                                Teléfono / celular <span class="campo-opcional-dark">(Opcional)</span>
                            </label>
                            <input id="telefono" name="telefono" type="tel" class="form-input-dark" maxlength="20" value="<?= e($datos['telefono']) ?>" autocomplete="tel" placeholder="Ej. 979 660 255"<?= isset($errores['telefono']) ? ' aria-invalid="true"' : '' ?>>
                            <?= $error('telefono') ?>
                        </div>

                        <!-- Fila 3: Servicio a todo el ancho -->
                        <div class="campo campo--full">
                            <label for="servicio" class="form-label-dark">
                                Servicio de interés <span class="campo-obligatorio">*</span>
                            </label>
                            <select id="servicio" name="servicio" class="form-select-dark">
                                <option value="">Selecciona un servicio...</option>
                                <?php foreach ($servicios as $slug => $nombre): ?>
                                    <option value="<?= e($slug) ?>"<?= $datos['servicio'] === $slug ? ' selected' : '' ?>><?= e($nombre) ?></option>
                                <?php endforeach; ?>
                            </select>
                            <?= $error('servicio') ?>
                        </div>

                        <!-- Fila 4: Mensaje -->
                        <div class="campo campo--full">
                            <label for="mensaje" class="form-label-dark">
                                Cuéntanos sobre tu proyecto <span class="campo-obligatorio">*</span>
                            </label>
                            <textarea id="mensaje" name="mensaje" rows="3" class="form-textarea-dark" required maxlength="3000" placeholder="Tipo de obra, ubicación geográfica, etapa actual, plazos tentativos…"<?= isset($errores['mensaje']) ? ' aria-invalid="true"' : '' ?>><?= e($datos['mensaje']) ?></textarea>
                            <?= $error('mensaje') ?>
                        </div>

                    </div>

                    <!-- Botón en móvil -->
                    <div class="lateral-accion-mobile">
                        <button class="btn-cta btn-cta--primario w-100" type="submit">
                            <span>Enviar mensaje</span>
                            <span class="btn-cta__icono"><?= icono('flecha') ?></span>
                        </button>
                        <p class="form-privacidad-dark">
                            <span class="punto-verde-fijo"></span> Tus datos solo se usan para responder tu consulta.
                        </p>
                    </div>

                </form>

            </div>

        </div>

    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
