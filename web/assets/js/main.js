// Menú móvil y sombra de la cabecera al hacer scroll
(function () {
  var boton = document.getElementById('menu-boton');
  var menu = document.getElementById('menu');
  var cabecera = document.getElementById('cabecera');

  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('menu--abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    // Cierra el menú con Escape o al elegir una opción
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('menu--abierto')) {
        menu.classList.remove('menu--abierto');
        boton.setAttribute('aria-expanded', 'false');
        boton.focus();
      }
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('menu--abierto');
        boton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (cabecera) {
    var alScroll = function () {
      cabecera.classList.toggle('cabecera--scroll', window.scrollY > 8);
    };
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
  }
})();
