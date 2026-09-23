<?php
/** Íconos SVG en línea (trazo, heredan el color del texto). Uso: icono('casco') */
function icono(string $nombre, string $clase = 'icono'): string
{
    $trazos = [
        'edificio' => '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>',
        'agua'     => '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
        'via'      => '<path d="M4 21 9 3M20 21 15 3M12 5v2M12 11v2M12 17v2"/>',
        'rayo'     => '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
        'represa'  => '<path d="M3 20h18M5 20l2-12h10l2 12"/><path d="M3 12c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
        'lupa'     => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        'carpeta'  => '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8M8 16h5"/>',
        'compas'   => '<circle cx="12" cy="5" r="2"/><path d="m12 7-5 14M12 7l5 14M8.5 16h7"/>',
        'casco'    => '<path d="M3 17h18v2H3zM5 17v-3a7 7 0 0 1 14 0v3"/><path d="M10 7V5h4v2"/>',
        'check'    => '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
        'chat'     => '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
        'telefono' => '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
        'correo'   => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        'mapa'     => '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
        'reloj'    => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'escudo'   => '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
        'flecha'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'menu'     => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'cerrar'   => '<path d="M6 6l12 12M18 6 6 18"/>',
        'whatsapp' => '<path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.8L.5 23.5l5.8-1.5A11.8 11.8 0 0 0 20.5 3.5z" fill="none"/><path d="M8.5 7.5c.3-.6.6-.6.9-.6h.7c.2 0 .5 0 .7.6l.9 2.1c.1.3 0 .5-.1.7l-.6.7c-.2.2-.2.4-.1.6a8 8 0 0 0 3.6 3.2c.2.1.5.1.6-.1l.8-1c.2-.2.4-.3.7-.2l2 1c.3.1.5.3.5.5 0 .8-.3 1.7-1 2.2-.7.5-1.6.6-2.4.4a13 13 0 0 1-7.4-6.6c-.6-1.2-.6-2.6.2-3.5z" fill="currentColor" stroke="none"/>',
        'usuario'  => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        'regla'    => '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    ];
    $d = $trazos[$nombre] ?? $trazos['check'];
    return '<svg class="' . $clase . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
}
