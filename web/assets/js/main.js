// Menú móvil, cabecera, animaciones al hacer scroll, contadores y "Ver más" de los servicios.
// Sin JavaScript todo el contenido se ve igual (las animaciones solo se activan con la clase .js).
(function () {
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var boton = document.getElementById('menu-boton');
  var menu = document.getElementById('menu');
  var cabecera = document.getElementById('cabecera');

  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('menu--abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      // Con el menú abierto la cabecera transparente pasa a blanca para que se lea
      if (cabecera) cabecera.classList.toggle('cabecera--scroll', abierto || window.scrollY > 8);
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

  // Cabecera: sombra (y fondo blanco si es transparente) al bajar; fotos con efecto de profundidad
  var fotos = reducido ? [] : Array.prototype.slice.call(document.querySelectorAll('.portada__foto, .franja__foto'));
  var pendiente = false;
  function alScroll() {
    pendiente = false;
    var y = window.scrollY;
    if (cabecera) cabecera.classList.toggle('cabecera--scroll', y > 8 || (menu && menu.classList.contains('menu--abierto')));
    fotos.forEach(function (foto) {
      var caja = foto.parentElement.getBoundingClientRect();
      if (caja.bottom < 0 || caja.top > window.innerHeight) return;
      foto.style.setProperty('--desplazamiento', Math.round(-caja.top * 0.25) + 'px');
    });
  }
  window.addEventListener('scroll', function () {
    if (!pendiente) { pendiente = true; window.requestAnimationFrame(alScroll); }
  }, { passive: true });
  alScroll();

  // Contadores: data-contar="90" (y opcional data-desde="2015") cuentan hasta el valor al aparecer
  function contar(el) {
    var fin = parseInt(el.getAttribute('data-contar'), 10);
    if (isNaN(fin) || reducido) return;
    var inicio = parseInt(el.getAttribute('data-desde'), 10) || 0;
    var duracion = 1600;
    var t0 = null;
    function paso(t) {
      if (t0 === null) t0 = t;
      var avance = Math.min(1, (t - t0) / duracion);
      var suave = 1 - Math.pow(1 - avance, 3);
      el.textContent = String(Math.round(inicio + (fin - inicio) * suave));
      if (avance < 1) window.requestAnimationFrame(paso);
    }
    el.textContent = String(inicio);
    window.requestAnimationFrame(paso);
  }

  // Aparición progresiva: [data-revelar]; los hijos de [data-revelar-grupo] entran uno tras otro
  document.querySelectorAll('[data-revelar-grupo]').forEach(function (grupo) {
    Array.prototype.forEach.call(grupo.children, function (hijo, i) {
      hijo.setAttribute('data-revelar', '');
      hijo.style.setProperty('--retraso', Math.min(i, 6) * 90 + 'ms');
    });
  });

  var elementos = document.querySelectorAll('[data-revelar], [data-contar]');
  if (!('IntersectionObserver' in window) || reducido) {
    elementos.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        el.classList.add('visible');
        if (el.hasAttribute('data-contar')) contar(el);
        observador.unobserve(el);
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    elementos.forEach(function (el) { observador.observe(el); });
  }

  // Servicios: "Ver más" despliega lo que incluye cada servicio
  document.querySelectorAll('[data-ver-mas]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tarjeta = btn.closest('.tarjeta-foto');
      if (!tarjeta) return;
      var abierto = tarjeta.classList.toggle('abierto');
      btn.setAttribute('aria-expanded', String(abierto));
      btn.textContent = abierto ? 'Ver menos' : 'Ver más';
    });
  });
})();
