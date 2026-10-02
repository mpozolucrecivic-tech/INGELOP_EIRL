<?php
/**
 * Conexión de la web con la API de INGELOP. ÚNICO lugar donde se define su dirección.
 *
 *   Local:       http://localhost:4000/api/v1
 *   Producción:  https://<tu-servicio>.onrender.com/api/v1   (siempre HTTPS si la web usa HTTPS)
 *
 * En el servidor también se puede definir con la variable de entorno API_URL (tiene prioridad).
 * Dejar vacío ('') para no usar la API: la web muestra los servicios fijos de config.php
 * y el formulario se procesa solo con PHP.
 *
 * Importante: el dominio de esta web debe estar en CORS_ORIGIN del backend.
 */

declare(strict_types=1);

/** Íconos que se pueden asignar a un servicio desde la intranet (nombres de includes/iconos.php) */
const ICONOS_SERVICIO = ['lupa', 'carpeta', 'compas', 'casco', 'check', 'chat', 'edificio', 'agua', 'via', 'rayo', 'represa', 'escudo', 'regla', 'usuario', 'flecha'];

define('API_URL', rtrim(getenv('API_URL') !== false ? (string) getenv('API_URL') : 'http://localhost:4000/api/v1', '/'));
