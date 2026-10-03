<?php
/**
 * Datos de la empresa usados en todo el sitio.
 * Fuente: Ficha RUC (SUNAT) y Registro Nacional de Proveedores (OSCE), consultados en setiembre de 2026.
 *
 * Los datos de contacto y los proyectos realizados se editan desde la INTRANET
 * (Página web → Datos de la empresa / Proyectos realizados) y llegan por la API (includes/api.php).
 * Los valores de abajo solo se usan si la API nunca respondió y no hay copia de respaldo.
 */

declare(strict_types=1);

date_default_timezone_set('America/Lima');

require_once __DIR__ . '/api.php';

/** Datos de contacto que llegan publicados desde la intranet (vacío si no hay API ni copia) */
function datos_publicados(): array
{
    $datos = contenido_web()['datos'] ?? [];
    $permitidos = ['telefono', 'whatsapp', 'email', 'direccion', 'distrito', 'horario', 'facebook', 'linkedin'];
    return array_map('strval', array_intersect_key(is_array($datos) ? $datos : [], array_flip($permitidos)));
}

// define() (y no const) porque los datos de contacto vienen de la API
define('EMPRESA', array_merge([
    'nombre_corto'   => 'INGELOP',
    'razon_social'   => 'INGELOP Consultores y Ejecutores E.I.R.L.',
    'ruc'            => '20610231676',
    'eslogan'        => 'Ingeniería y arquitectura para obras que transforman Lambayeque',
    'descripcion'    => 'Consultora chiclayana de arquitectura e ingeniería: estudios de preinversión, expedientes técnicos, diseño y supervisión de obras públicas y privadas.',
    'inicio'         => 2023, // inicio de actividades según SUNAT (inscrita el 11/11/2022)
    'ciudad'         => 'Chiclayo',
    'region'         => 'Lambayeque',
    // Correo que RECIBE los mensajes del formulario cuando se envían por PHP (no se muestra en la web).
    // En el servidor se puede definir con la variable de entorno CONTACTO_EMAIL.
    'email_formulario' => getenv('CONTACTO_EMAIL') ?: 'luisalbertolopez19@gmail.com',
    // Datos de contacto VISIBLES: vienen de la intranet. Lo que esté vacío u oculto no se muestra
    // en ninguna página (pie, Contacto, Nosotros, botones de WhatsApp y datos para Google).
    'telefono'       => '',
    'whatsapp'       => '', // formato internacional sin "+": 51 + 9 dígitos
    'email'          => '',
    'direccion'      => '',
    'distrito'       => '',
    'horario'        => '',
    'facebook'       => '',
    'linkedin'       => '',
], datos_publicados()));

/** Especialidades inscritas en el RNP del OSCE como consultor de obras (categoría entre paréntesis) */
const ESPECIALIDADES_OSCE = [
    ['icono' => 'edificio',   'nombre' => 'Obras urbanas, edificaciones y afines',                        'categoria' => 'C',
     'texto' => 'Instituciones educativas, establecimientos de salud, locales municipales, viviendas, habilitaciones urbanas y espacios públicos.'],
    ['icono' => 'agua',       'nombre' => 'Obras de saneamiento y afines',                                'categoria' => 'C',
     'texto' => 'Sistemas de agua potable, redes de alcantarillado, plantas de tratamiento y drenaje pluvial.'],
    ['icono' => 'via',        'nombre' => 'Obras viales, puertos y afines',                               'categoria' => 'B',
     'texto' => 'Pistas, veredas, pavimentos, caminos vecinales, puentes y señalización vial.'],
    ['icono' => 'rayo',       'nombre' => 'Obras electromecánicas, energéticas, telecomunicaciones y afines', 'categoria' => 'A',
     'texto' => 'Redes de distribución eléctrica, alumbrado público, subsistemas de utilización e instalaciones electromecánicas.'],
    ['icono' => 'represa',    'nombre' => 'Obras de represas, irrigaciones y afines',                     'categoria' => 'A',
     'texto' => 'Canales de riego, bocatomas, reservorios y obras de defensa ribereña.'],
];

const SERVICIOS = [
    ['slug' => 'preinversion', 'icono' => 'lupa',     'titulo' => 'Estudios de preinversión',
     'resumen' => 'Fichas técnicas y estudios de perfil para proyectos de inversión pública en el marco de Invierte.pe.',
     'items' => ['Diagnóstico y levantamiento de información', 'Planteamiento técnico de alternativas', 'Costos, evaluación social y sostenibilidad']],
    ['slug' => 'expedientes', 'icono' => 'carpeta',   'titulo' => 'Expedientes técnicos',
     'resumen' => 'Expedientes completos listos para licitar y ejecutar, con todas las especialidades integradas.',
     'items' => ['Memoria descriptiva y especificaciones técnicas', 'Planos de todas las especialidades', 'Metrados, análisis de costos unitarios y presupuesto', 'Fórmula polinómica y cronograma de obra']],
    ['slug' => 'diseno', 'icono' => 'compas',         'titulo' => 'Diseño arquitectónico y de ingeniería',
     'resumen' => 'Proyectos de arquitectura, estructuras e instalaciones para inversión pública y privada.',
     'items' => ['Anteproyecto y proyecto arquitectónico', 'Diseño estructural', 'Instalaciones sanitarias y eléctricas', 'Expedientes para licencia de edificación']],
    ['slug' => 'supervision', 'icono' => 'casco',     'titulo' => 'Supervisión de obras',
     'resumen' => 'Control técnico, económico y de plazos para que la obra se ejecute según el expediente aprobado.',
     'items' => ['Control de calidad y valorizaciones', 'Revisión de adicionales y ampliaciones de plazo', 'Informes mensuales a la entidad', 'Recepción de obra']],
    ['slug' => 'liquidacion', 'icono' => 'check',     'titulo' => 'Liquidación de obras',
     'resumen' => 'Liquidación técnica y financiera de contratos de obra y consultoría.',
     'items' => ['Revisión de metrados finales', 'Cálculo de reajustes y saldos', 'Expediente de liquidación']],
    ['slug' => 'consultoria', 'icono' => 'chat',      'titulo' => 'Consultoría técnica',
     'resumen' => 'Asesoría a entidades públicas, empresas y particulares en proyectos de construcción.',
     'items' => ['Evaluación y revisión de expedientes', 'Peritajes e informes técnicos', 'Asesoría en procesos de contratación']],
];

/**
 * Proyectos realizados: se gestionan en la intranet (Página web → Proyectos realizados).
 * Si no hay ninguno, la página "Proyectos" muestra los tipos de proyecto que desarrolla la empresa.
 * Devuelve: [['titulo', 'cliente', 'ubicacion', 'anio', 'servicio', 'imagen'], ...]
 */
function proyectos_realizados(): array
{
    $lista = contenido_web()['proyectos'] ?? [];
    if (!is_array($lista)) return [];
    $proyectos = [];
    foreach ($lista as $p) {
        if (!is_array($p) || empty($p['titulo'])) continue;
        $proyectos[] = [
            'titulo'    => (string) $p['titulo'],
            'cliente'   => (string) ($p['cliente'] ?? ''),
            'ubicacion' => (string) ($p['ubicacion'] ?? ''),
            'anio'      => (string) ($p['anio'] ?? ''),
            'servicio'  => (string) ($p['servicio'] ?? ''),
            // La foto la sirve la API (ruta pública); fotoUrl es relativa a API_URL
            'imagen'    => !empty($p['fotoUrl']) ? API_URL . $p['fotoUrl'] : '',
        ];
    }
    return $proyectos;
}

/** Escapa texto para HTML */
function e(string|int|null $texto): string
{
    return htmlspecialchars((string) $texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** true si hay al menos un dato de contacto publicado */
function hay_contacto_visible(): bool
{
    foreach (['telefono', 'email', 'direccion', 'horario', 'facebook', 'linkedin'] as $clave) {
        if (EMPRESA[$clave] !== '') return true;
    }
    return false;
}

/** Enlace tel: del teléfono publicado (celulares de 9 dígitos con +51; fijos tal cual) */
function telefono_enlace(): string
{
    $digitos = preg_replace('/\D/', '', EMPRESA['telefono']);
    if (strlen($digitos) === 9 && $digitos[0] === '9') return '+51' . $digitos;
    if (strlen($digitos) === 11 && str_starts_with($digitos, '51')) return '+' . $digitos;
    return $digitos;
}

/** Dirección con distrito y ciudad, omitiendo las partes vacías */
function direccion_completa(): string
{
    return implode(', ', array_filter([EMPRESA['direccion'], EMPRESA['distrito'], EMPRESA['ciudad']], fn ($v) => $v !== ''));
}

/** true si hay un número de WhatsApp publicado (si no, se ocultan todos los botones de WhatsApp) */
function hay_whatsapp(): bool
{
    return EMPRESA['whatsapp'] !== '';
}

/** Enlace de WhatsApp con mensaje prellenado */
function whatsapp(string $mensaje = 'Hola INGELOP, quisiera información sobre sus servicios.'): string
{
    return 'https://wa.me/' . EMPRESA['whatsapp'] . '?text=' . rawurlencode($mensaje);
}

function anios_experiencia(): int
{
    return max(1, (int) date('Y') - EMPRESA['inicio']);
}
