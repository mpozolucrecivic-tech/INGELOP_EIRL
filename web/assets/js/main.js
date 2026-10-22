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

  // Animación progresiva de contadores de métricas INICIO 
  function animarContadores() {
    var contadores = document.querySelectorAll('.contador');
    contadores.forEach(function (contador) {
      var objetivo = parseInt(contador.getAttribute('data-target'), 10) || 0;
      if (objetivo === 0) return;

      var actual = 0;
      var incremento = Math.ceil(objetivo / 40) || 1;

      var temporizador = setInterval(function () {
        actual += incremento;
        if (actual >= objetivo) {
          contador.textContent = objetivo;
          clearInterval(temporizador);
        } else {
          contador.textContent = actual;
        }
      }, 30);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', animarContadores);
  } else {
    animarContadores();
  }

  // Animación de conteo dinámico para contadores NOSOTROS 
  document.addEventListener('DOMContentLoaded', () => {
      const contadores = document.querySelectorAll('.contador-valor');
      if (!contadores.length) return;

      let animado = false;

      const animarContador = (elemento) => {
          const fin = parseInt(elemento.getAttribute('data-fin'), 10);
          if (isNaN(fin)) return;
          
          const inicio = parseInt(elemento.getAttribute('data-inicio'), 10) || 0;
          const duracion = 1800; // 1.8 segundos
          const pasoTiempo = 20;
          const totalPasos = duracion / pasoTiempo;
          const incremento = (fin - inicio) / totalPasos;
          
          let valorActual = inicio;

          const temporizador = setInterval(() => {
              valorActual += incremento;
              if ((incremento > 0 && valorActual >= fin) || (incremento < 0 && valorActual <= fin)) {
                  elemento.textContent = fin;
                  clearInterval(temporizador);
              } else {
                  elemento.textContent = Math.floor(valorActual);
              }
          }, pasoTiempo);
      };

      // Observa el primer contenedor que coincida o directamente el primer número
      const contenedor = document.querySelector('.contadores-caja') 
                      || document.querySelector('.seccion--contadores-flotante') 
                      || document.querySelector('.seccion--contadores') 
                      || document.querySelector('.caja-metricas')
                      || contadores[0];

      if (contenedor) {
          const observador = new IntersectionObserver((entradas, obs) => {
              entradas.forEach((entrada) => {
                  if (entrada.isIntersecting && !animado) {
                      animado = true;
                      contadores.forEach(animarContador);
                      obs.disconnect(); // Desconecta una vez animado
                  }
              });
          }, { threshold: 0.15 });

          observador.observe(contenedor);
      } else {
          // Fallback inmediato si no encuentra ningún contenedor
          contadores.forEach(animarContador);
      }
  });

  // SERVICIOS BOTON "VER MAS"
  document.addEventListener('DOMContentLoaded', () => {
      const botonesVerMas = document.querySelectorAll('[data-toggle="detalles"]');

      botonesVerMas.forEach((boton) => {
          boton.addEventListener('click', (e) => {
              e.preventDefault();
              const tarjeta = boton.closest('.tarjeta-servicio');
              if (!tarjeta) return;

              const estaAbierto = tarjeta.classList.toggle('abierto');
              const textoBoton = boton.querySelector('span');

              if (textoBoton) {
                  textoBoton.textContent = estaAbierto ? 'Ver menos' : 'Ver más';
              }
          });
      });
  });

})();

