<?php
/**
 * Datos de la empresa usados en todo el sitio.
 * Fuente: Ficha RUC (SUNAT) y Registro Nacional de Proveedores (OSCE), consultados en setiembre de 2026.
 * Para actualizar teléfonos, correo, dirección o proyectos basta con editar este archivo.
 */

declare(strict_types=1);

date_default_timezone_set('America/Lima');

// define() (y no const) porque algunos valores se leen de variables de entorno del servidor
define('EMPRESA', [
    'nombre_corto'   => 'INGELOP',
    'razon_social'   => 'INGELOP Consultores y Ejecutores E.I.R.L.',
    'ruc'            => '20610231676',
    'eslogan'        => 'Ingeniería y arquitectura para obras que transforman Lambayeque',
    'descripcion'    => 'Consultora chiclayana de arquitectura e ingeniería: estudios de preinversión, expedientes técnicos, diseño y supervisión de obras públicas y privadas.',
    'inicio'         => 2023, // inicio de actividades según SUNAT (inscrita el 11/11/2022)
    'telefono'       => '979 660 255',
    'telefono_e164'  => '51979660255', // para enlaces tel: y WhatsApp
    // Correo que recibe los mensajes del formulario (en el servidor se puede definir con CONTACTO_EMAIL)
    'email'          => getenv('CONTACTO_EMAIL') ?: 'luisalbertolopez19@gmail.com',
    'direccion'      => 'Calle Yahuar Huaca 137, Asoc. Las Quintas Sector Uno',
    'distrito'       => 'La Victoria',
    'ciudad'         => 'Chiclayo',
    'region'         => 'Lambayeque',
    'horario'        => 'Lunes a viernes de 8:00 a. m. a 6:00 p. m.',
    // Sistema interno del equipo: solo aparece como enlace discreto en el pie de página.
    // Dejar vacío ('') para no mostrarlo en la web.
    'intranet_url'   => getenv('INTRANET_URL') !== false ? (string) getenv('INTRANET_URL') : 'http://localhost:5173',
    // Redes sociales: dejar vacío lo que no exista
    'facebook'       => '',
    'linkedin'       => '',
]);

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
 * Proyectos realizados. Agregar aquí los proyectos reales de la empresa, por ejemplo:
 *   ['titulo' => '...', 'cliente' => '...', 'ubicacion' => 'Chiclayo', 'anio' => 2025,
 *    'servicio' => 'Expediente técnico', 'rubro' => 'Edificaciones', 'imagen' => 'assets/img/proyectos/archivo.jpg'],
 * Mientras esté vacío, la página "Proyectos" muestra los tipos de proyecto que desarrolla la empresa.
 */
const PROYECTOS = [];

/** Escapa texto para HTML */
function e(string|int|null $texto): string
{
    return htmlspecialchars((string) $texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Enlace de WhatsApp con mensaje prellenado */
function whatsapp(string $mensaje = 'Hola INGELOP, quisiera información sobre sus servicios.'): string
{
    return 'https://wa.me/' . EMPRESA['telefono_e164'] . '?text=' . rawurlencode($mensaje);
}

function anios_experiencia(): int
{
    return max(1, (int) date('Y') - EMPRESA['inicio']);
}
