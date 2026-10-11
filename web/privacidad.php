<?php
/**
 * Política de privacidad (Ley N.° 29733 y su Reglamento, D.S. N.° 016-2024-JUS).
 *
 * BORRADOR TÉCNICO: describe lo que el sistema hace realmente con los datos. Antes de publicarlo en
 * producción, la empresa (o su asesoría legal) debe revisar el texto, en especial los plazos de
 * conservación de los mensajes y el canal para ejercer los derechos.
 */
$pagina = 'privacidad';
$titulo = 'Política de privacidad';
$descripcion = 'Cómo INGELOP trata los datos personales del formulario de contacto y de la intranet.';
require __DIR__ . '/includes/header.php';

$canal = EMPRESA['email'] !== ''
    ? 'escribiendo a <a href="mailto:' . e(EMPRESA['email']) . '">' . e(EMPRESA['email']) . '</a>'
    : 'a través del <a href="contacto.php">formulario de contacto</a>';
?>

<section class="encabezado">
    <div class="contenedor">
        <p class="etiqueta">Privacidad</p>
        <h1>Política de privacidad</h1>
        <p class="encabezado__lead">Qué datos personales recogemos, para qué los usamos y cómo puedes ejercer tus derechos.</p>
    </div>
</section>

<section class="seccion">
    <div class="contenedor texto-largo">
        <h2>Responsable</h2>
        <p>
            <strong><?= e(EMPRESA['razon_social']) ?></strong>, RUC <?= e(EMPRESA['ruc']) ?>, con domicilio en
            <?= e(EMPRESA['ciudad']) ?>, <?= e(EMPRESA['region']) ?> – Perú, es responsable del tratamiento de los datos
            personales descritos en esta página, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento.
        </p>

        <h2>Formulario de contacto de la web</h2>
        <p>
            Cuando nos escribes, guardamos tu <strong>nombre, correo, teléfono (opcional), entidad o empresa (opcional), el
            servicio de interés, el tipo y el texto de tu consulta</strong>, la fecha y la <strong>dirección IP</strong> desde la que
            se envió. Los usamos solo para responder tu consulta y preparar una propuesta, y la IP para prevenir el envío
            masivo de mensajes no deseados (spam). Al enviar el formulario consientes este uso.
        </p>
        <p>Conservamos los mensajes mientras sea necesario para atender la consulta y, como máximo, durante 2 años.</p>

        <h2>Intranet (personal de la empresa)</h2>
        <p>
            Por seguridad, la intranet registra la <strong>fecha y hora, la dirección IP, el navegador y la acción realizada</strong>
            en cada inicio de sesión (correcto o fallido) y en cada creación, modificación, eliminación, subida o descarga de
            información. Este registro sirve para proteger la información de los proyectos, detectar accesos no autorizados y
            cumplir las medidas de seguridad que exige el Reglamento. Se conserva al menos 2 años y solo pueden consultarlo las
            jefaturas. Nunca se registran contraseñas.
        </p>

        <h2>Cookies y almacenamiento</h2>
        <p>
            La web usa una cookie técnica de sesión para proteger el formulario de contacto (token CSRF). La intranet guarda en
            tu navegador la sesión iniciada. No usamos cookies de publicidad ni de seguimiento.
        </p>

        <h2>Con quién se comparten</h2>
        <p>
            No vendemos ni cedemos tus datos. Para funcionar, el sistema se aloja en proveedores de servicios en la nube que
            actúan como encargados del tratamiento (alojamiento de la web, de la aplicación y de la base de datos), algunos de
            ellos fuera del Perú, lo que constituye un flujo transfronterizo de datos. Estos proveedores solo almacenan la
            información y no la usan para fines propios.
        </p>

        <h2>Tus derechos</h2>
        <p>
            Puedes solicitar el <strong>acceso, la rectificación, la cancelación o la oposición</strong> al tratamiento de tus datos
            (derechos ARCO), así como revocar tu consentimiento, <?= $canal ?>. Te responderemos dentro de los plazos que fija la ley.
            Si consideras que no atendimos tu solicitud, puedes acudir a la Autoridad Nacional de Protección de Datos Personales
            del Ministerio de Justicia y Derechos Humanos.
        </p>

        <h2>Seguridad</h2>
        <p>
            Aplicamos medidas técnicas para proteger la información: conexión cifrada (HTTPS), contraseñas cifradas, acceso por
            roles, bloqueo ante intentos repetidos de inicio de sesión y un registro de actividad que no se puede modificar.
        </p>

        <p class="nota">Última actualización: octubre de 2026.</p>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
