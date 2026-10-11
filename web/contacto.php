<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/includes/config.php';

$servicios = array_column(SERVICIOS, 'titulo', 'slug');
// Mismos valores que la API (TipoMensaje)
$tipos = ['CONTACTO' => 'Contacto', 'CONSULTA_TECNICA' => 'Consulta técnica'];
$datos = ['nombre' => '', 'email' => '', 'telefono' => '', 'entidad' => '', 'servicio' => '', 'tipo' => 'CONTACTO', 'mensaje' => ''];
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
    // La lista puede venir de la API (servicios nuevos): se acepta cualquier slug con formato válido
    if ($datos['servicio'] !== '' && !isset($servicios[$datos['servicio']]) && !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $datos['servicio'])) $errores['servicio'] = 'Selecciona un servicio de la lista.';
    if (!isset($tipos[$datos['tipo']])) $errores['tipo'] = 'Selecciona un tipo de consulta válido.';
    if (mb_strlen($datos['mensaje']) < 10) $errores['mensaje'] = 'Cuéntanos un poco más sobre tu proyecto (mínimo 10 caracteres).';
    foreach (['nombre' => 120, 'email' => 150, 'entidad' => 150, 'mensaje' => 3000] as $campo => $max) {
        if (mb_strlen($datos[$campo]) > $max) $errores[$campo] = 'Texto demasiado largo.';
    }

    if (!$errores) {
        if (!$esBot) {
            guardarMensaje($datos, $servicios, $tipos);
            enviarCorreo($datos, $servicios, $tipos);
        }
        // Al bot se le responde igual que a un usuario real, sin guardar nada
        $_SESSION['ultimo_envio'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $enviado = true;
        $datos = array_map(fn () => '', $datos);
        $datos['tipo'] = 'CONTACTO';
    }
} elseif (isset($_GET['servicio'], $servicios[$_GET['servicio']])) {
    $datos['servicio'] = $_GET['servicio'];
}

/**
 * Respaldo: cada mensaje queda en storage/mensajes.csv (carpeta protegida por .htaccess).
 * Solo se usa si la API no responde (o sin JavaScript); normalmente los mensajes llegan a la intranet.
 */
function guardarMensaje(array $d, array $servicios, array $tipos): void
{
    $dir = __DIR__ . '/storage';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $archivo = $dir . '/mensajes.csv';
    $nuevo = !file_exists($archivo);
    $fp = @fopen($archivo, 'ab');
    if (!$fp) return;
    // "tipo" va al final para no desordenar las columnas de un mensajes.csv ya existente
    if ($nuevo) fputcsv($fp, ['fecha', 'nombre', 'email', 'telefono', 'entidad', 'servicio', 'mensaje', 'ip', 'tipo']);
    // Evita inyección de fórmulas al abrir el CSV en Excel
    $limpio = fn (string $v) => preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;
    fputcsv($fp, array_map($limpio, [
        date('Y-m-d H:i:s'), $d['nombre'], $d['email'], $d['telefono'], $d['entidad'],
        $servicios[$d['servicio']] ?? $d['servicio'], $d['mensaje'], $_SERVER['REMOTE_ADDR'] ?? '',
        $tipos[$d['tipo']] ?? '',
    ]));
    fclose($fp);
}

/** Envía el aviso por correo con mail() (funciona en la mayoría de hostings compartidos) */
function enviarCorreo(array $d, array $servicios, array $tipos): void
{
    $sinSaltos = fn (string $v) => str_replace(["\r", "\n"], ' ', $v);
    $asunto = '=?UTF-8?B?' . base64_encode('Nuevo mensaje desde la web – ' . $sinSaltos($d['nombre'])) . '?=';
    $cuerpo = "Nombre: {$d['nombre']}\nCorreo: {$d['email']}\nTeléfono: {$d['telefono']}\n"
        . "Entidad / empresa: {$d['entidad']}\nTipo de consulta: " . ($tipos[$d['tipo']] ?? '-')
        . "\nServicio: " . ($servicios[$d['servicio']] ?? ($d['servicio'] ?: '-')) . "\n\n{$d['mensaje']}\n";
    $cabeceras = [
        'From: Web INGELOP <no-responder@' . ($_SERVER['SERVER_NAME'] ?? 'localhost') . '>',
        'Reply-To: ' . $sinSaltos($d['email']),
        'Content-Type: text/plain; charset=UTF-8',
    ];
    @mail(EMPRESA['email_formulario'], $asunto, $cuerpo, implode("\r\n", $cabeceras));
}

$pagina = 'contacto';
$titulo = 'Contacto';
$descripcion = 'Solicita una cotización de expedientes técnicos, diseño o supervisión de obras. Oficina en Chiclayo.';
$error = fn (string $campo) => isset($errores[$campo]) ? '<p class="campo__error">' . e($errores[$campo]) . '</p>' : '';
$mapa = rawurlencode(direccion_completa() . ', Perú');
require __DIR__ . '/includes/header.php';

?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Contacto</p>
        <h1>Conversemos sobre tu proyecto</h1>
        <p class="encabezado__lead">Déjanos tus datos y el detalle de lo que necesitas. Te respondemos con una propuesta técnica y económica.</p>
    </div>
</section>

<?php require __DIR__ . '/includes/contacto-form.php'; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
