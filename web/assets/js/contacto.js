// Formulario de contacto -> API (POST /contacto).
// Respaldo: si la API no responde (sin conexión, demora o error 5xx), el formulario
// se envía por PHP como siempre (correo + storage/mensajes.csv). Sin JavaScript, funciona solo con PHP.
(function () {
  var API = document.body.getAttribute('data-api');
  var form = document.querySelector('form[data-contacto-api]');
  if (!API || !form || !window.fetch) return;

  var contenedor = form.parentNode;
  var boton = form.querySelector('button[type="submit"]');
  var enviando = false;

  // Nombre del campo en la API -> nombre del campo en el formulario
  var CAMPOS = { nombre: 'nombre', correo: 'email', telefono: 'telefono', entidad: 'entidad', servicio: 'servicio', tipo: 'tipo', mensaje: 'mensaje' };

  function valor(nombre) {
    var campo = form.elements[nombre];
    return campo ? campo.value.trim() : '';
  }

  function limpiarAvisos() {
    contenedor.querySelectorAll('.alerta').forEach(function (a) { a.remove(); });
    form.querySelectorAll('.campo__error').forEach(function (p) { p.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (c) { c.removeAttribute('aria-invalid'); });
  }

  // Mismo HTML que los avisos de contacto.php
  function aviso(tipo, titulo, texto) {
    var div = document.createElement('div');
    div.className = 'alerta alerta--' + tipo;
    div.setAttribute('role', tipo === 'exito' ? 'status' : 'alert');
    div.tabIndex = -1;
    if (tipo === 'exito') {
      var icono = document.getElementById('iconos-api');
      var check = icono && icono.content.querySelector('[data-icono="check"]');
      if (check) div.appendChild(check.firstElementChild.cloneNode(true));
      var cuerpo = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = titulo;
      var p = document.createElement('p');
      p.textContent = texto;
      cuerpo.append(strong, p);
      div.appendChild(cuerpo);
    } else {
      div.textContent = texto;
    }
    contenedor.insertBefore(div, form);
    div.focus();
  }

  function errorDeCampo(campoApi, mensaje) {
    var campo = form.elements[CAMPOS[campoApi] || campoApi];
    if (!campo) return false;
    campo.setAttribute('aria-invalid', 'true');
    var p = document.createElement('p');
    p.className = 'campo__error';
    p.textContent = mensaje;
    campo.parentNode.appendChild(p);
    return true;
  }

  // Respaldo: envío normal del formulario a contacto.php (form.submit() no vuelve a disparar este evento)
  function enviarPorPhp() {
    form.submit();
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (enviando) return;
    enviando = true;
    boton.disabled = true;
    limpiarAvisos();

    var datos = {
      nombre: valor('nombre'),
      correo: valor('email'),
      telefono: valor('telefono'),
      entidad: valor('entidad'),
      servicio: valor('servicio'),
      tipo: valor('tipo') || 'CONTACTO',
      mensaje: valor('mensaje'),
      sitio_web: valor('sitio_web'), // campo trampa
    };

    var control = window.AbortController ? new AbortController() : null;
    var limite = setTimeout(function () { if (control) control.abort(); }, 8000);

    fetch(API + '/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(datos),
      signal: control ? control.signal : undefined,
    })
      // Segundo argumento de then(): solo fallas de red o tiempo agotado van al respaldo PHP.
      // Así un error al mostrar el resultado nunca reenvía (y duplica) un mensaje ya guardado.
      .then(function (res) {
        clearTimeout(limite);
        if (res.status >= 500) return enviarPorPhp(); // API con fallas: respaldo PHP
        return res.json().catch(function () { return {}; }).then(function (cuerpo) {
          if (res.status === 201) {
            form.reset();
            aviso('exito', '¡Mensaje enviado!', 'Gracias por escribirnos. Te responderemos a la brevedad.');
          } else if (res.status === 422 && cuerpo.errors) {
            var sinCampo = [];
            cuerpo.errors.forEach(function (e) {
              if (!errorDeCampo(String(e.campo).replace(/^body\./, ''), e.mensaje)) sinCampo.push(e.mensaje);
            });
            if (sinCampo.length) aviso('error', '', sinCampo.join(' '));
            var primero = form.querySelector('[aria-invalid="true"]');
            if (primero) primero.focus();
          } else {
            // 429 (demasiados envíos) u otro error con mensaje de la API
            aviso('error', '', cuerpo.message || 'No se pudo enviar el mensaje. Inténtalo de nuevo.');
          }
          enviando = false;
          boton.disabled = false;
        });
      }, function () {
        clearTimeout(limite);
        enviarPorPhp();
      });
  });
})();
