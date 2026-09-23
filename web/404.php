<?php
http_response_code(404);
$pagina = '404';
$titulo = 'Página no encontrada';
require __DIR__ . '/includes/header.php';
?>

<section class="seccion">
    <div class="contenedor" style="text-align:center;max-width:36rem">
        <p class="etiqueta">Error 404</p>
        <h1>No encontramos esta página</h1>
        <p style="color:var(--texto-suave)">Es posible que la dirección haya cambiado. Puedes volver al inicio o escribirnos.</p>
        <p style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
            <a class="boton boton--primario" href="index.php">Ir al inicio</a>
            <a class="boton boton--contorno" href="contacto.php">Contacto</a>
        </p>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
