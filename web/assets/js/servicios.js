// Servicios desde la API (GET /servicios). Respaldo: si la API no responde, se quedan
// los servicios fijos que el PHP ya dibujó (config.php), así la página nunca se ve vacía.
// Cada bloque reproduce exactamente el HTML y las clases del PHP.
(function () {
  var API = document.body.getAttribute('data-api');
  var bloques = document.querySelectorAll('[data-servicios]');
  if (!API || !bloques.length || !window.fetch) return;

  // ---------- utilidades ----------
  function el(etiqueta, clase, texto) {
    var nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto; // textContent: nunca se interpreta HTML de la API
    return nodo;
  }

  // Íconos SVG que el PHP dejó en <template id="iconos-api">
  var plantilla = document.getElementById('iconos-api');
  function icono(nombre) {
    var origen = plantilla && (plantilla.content.querySelector('[data-icono="' + nombre + '"]') ||
                               plantilla.content.querySelector('[data-icono="regla"]'));
    return origen ? origen.firstElementChild.cloneNode(true) : document.createTextNode('');
  }

  // Foto si existe; si no (o si falla al cargar), el ícono de siempre
  function cabeceraVisual(s) {
    var caja = el('span', 'tarjeta__icono');
    caja.appendChild(icono(s.icono || 'regla'));
    if (!s.fotoUrl) return caja;
    var img = el('img', 'servicio-foto');
    img.src = API + s.fotoUrl;
    img.alt = s.nombre;
    img.loading = 'lazy';
    img.onerror = function () { img.replaceWith(caja); };
    return img;
  }

  function ancla(s) { return s.slug || 'servicio-' + s.id; }

  function enlace(href, texto, conFlecha) {
    var a = el('a', conFlecha ? 'enlace' : null, texto);
    a.href = href;
    if (conFlecha) { a.appendChild(document.createTextNode(' ')); a.appendChild(icono('flecha')); }
    return a;
  }

  // ---------- un render por tipo de bloque ----------
  var render = {
    // index.php: tarjetas de "Qué hacemos" (máximo 6, como el PHP)
    tarjetas: function (cont, lista) {
      cont.replaceChildren.apply(cont, lista.slice(0, 6).map(function (s) {
        var art = el('article', 'tarjeta');
        art.append(cabeceraVisual(s), el('h3', null, s.nombre), el('p', null, s.descripcion),
                   enlace('servicios.php#' + ancla(s), 'Más información', true));
        return art;
      }));
    },

    // servicios.php: detalle con número, puntos y enlace para cotizar
    lista: function (cont, lista) {
      cont.replaceChildren.apply(cont, lista.map(function (s, i) {
        var art = el('article', 'servicio');
        art.id = ancla(s);
        var cab = el('div', 'servicio__cabecera');
        cab.append(cabeceraVisual(s), el('span', 'servicio__num', String(i + 1).padStart(2, '0')));
        var cuerpo = el('div');
        cuerpo.append(el('h2', null, s.nombre), el('p', null, s.descripcion));
        if (s.items && s.items.length) {
          var ul = el('ul', 'lista-check');
          s.items.forEach(function (item) {
            var li = el('li');
            li.append(icono('check'), document.createTextNode(' ' + item));
            ul.appendChild(li);
          });
          cuerpo.appendChild(ul);
        }
        cuerpo.appendChild(enlace('contacto.php' + (s.slug ? '?servicio=' + encodeURIComponent(s.slug) : ''), 'Cotizar este servicio', true));
        art.append(cab, cuerpo);
        return art;
      }));
      // Si se llegó con #ancla, vuelve a ubicar el servicio (el contenido se redibujó)
      var destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (destino) destino.scrollIntoView();
    },

    // Pie de página: lista de enlaces
    pie: function (cont, lista) {
      cont.replaceChildren.apply(cont, lista.map(function (s) {
        var li = el('li');
        li.appendChild(enlace('servicios.php#' + ancla(s), s.nombre));
        return li;
      }));
    },

    // contacto.php: <select> de servicio de interés (conserva la opción elegida)
    select: function (sel, lista) {
      // Opción elegida, o la que pide el enlace "Cotizar este servicio" (contacto.php?servicio=slug)
      var elegido = sel.value || (window.URLSearchParams ? new URLSearchParams(location.search).get('servicio') || '' : '');
      var opciones = [el('option', null, 'Selecciona…')];
      opciones[0].value = '';
      lista.forEach(function (s) {
        if (!s.slug) return; // sin slug no se puede identificar en el mensaje
        var op = el('option', null, s.nombre);
        op.value = s.slug;
        if (s.slug === elegido) op.selected = true;
        opciones.push(op);
      });
      sel.replaceChildren.apply(sel, opciones);
    },
  };

  // ---------- petición con tiempo límite ----------
  var control = window.AbortController ? new AbortController() : null;
  var limite = setTimeout(function () { if (control) control.abort(); }, 4000);

  fetch(API + '/servicios', { signal: control ? control.signal : undefined, headers: { Accept: 'application/json' } })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (lista) {
      if (!Array.isArray(lista) || !lista.length) return; // vacío: se queda el respaldo
      bloques.forEach(function (bloque) {
        var fn = render[bloque.getAttribute('data-servicios')];
        if (fn) fn(bloque, lista);
      });
    })
    .catch(function () { /* API caída o lenta: se quedan los servicios fijos */ })
    .then(function () { clearTimeout(limite); });
})();
