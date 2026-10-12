const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

test('Web PHP: páginas CMS, contacto, SEO, imágenes, publicación vacía y caché de vista previa', async () => {
  const php = process.env.PHP_BIN || 'php';
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ingelop-cms-test-'));
  fs.cpSync(path.resolve('web'), temporal, { recursive: true, filter: (p) => !p.includes(`${path.sep}storage`) });
  const sesiones = path.join(temporal, 'sesiones');
  fs.mkdirSync(sesiones);
  const bloque = { id: 'texto', tipo: 'texto', titulo: 'Contenido <seguro>', texto: '<script>alert(1)</script>', visible: true, medioId: 7, botonTexto: 'Contacto', botonUrl: 'contacto.php' };
  const pagina = (slug, bloques = [bloque]) => ({ tipo: 'pagina', slug, titulo: 'Título editorial', descripcion: 'Descripción para buscadores', imagenSocialId: 7, bloques });
  const web = { datos: {}, proyectos: [], servicios: [], medios: [{ id: 7, textoAlternativo: 'Foto del equipo' }], sitioUrl: 'https://ingelop.example', cms: {
    configuracion: { tipo: 'configuracion', nombre: 'Marca </script><script>alert(2)</script>', subtitulo: 'Consultoría', descripcion: 'Descripción de marca', logoId: null, menu: [{ etiqueta: 'Equipo', slug: 'equipo' }] },
    'pagina.equipo': pagina('equipo'), 'pagina.contacto': pagina('contacto', [{ ...bloque, medioId: null, tipo: 'contacto' }]),
  } };
  let disponible = true;
  const api = http.createServer((req, res) => {
    if (!disponible) { res.writeHead(503); return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/cms/vista-previa/')) {
      return res.end(JSON.stringify({ ...web, cms: { ...web.cms, 'pagina.equipo': { ...pagina('equipo'), titulo: 'Título privado' } } }));
    }
    res.end(JSON.stringify(web));
  });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
  const reserva = http.createServer();
  await new Promise((r) => reserva.listen(0, '127.0.0.1', r));
  const port = reserva.address().port;
  await new Promise((r) => reserva.close(r));
  const url = `http://127.0.0.1:${port}`;
  const apiUrl = `http://127.0.0.1:${api.address().port}`;
  const proc = spawn(php, ['-d', `session.save_path=${sesiones}`, '-S', `127.0.0.1:${port}`, '-t', temporal], { env: { ...process.env, API_URL: apiUrl, API_URL_SERVIDOR: apiUrl }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  let spawnError;
  proc.on('error', (e) => { spawnError = e; });
  proc.stderr.on('data', (d) => { logs += d; });
  try {
    let listo = false;
    for (let i = 0; i < 50; i++) {
      if (spawnError) throw spawnError;
      try { await fetch(url + '/assets/css/estilos.css'); listo = true; break; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    assert.ok(listo, logs);
    const r = await fetch(url + '/pagina.php?slug=equipo');
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes('Marca &lt;/script&gt;&lt;script&gt;alert(2)&lt;/script&gt;'));
    assert.ok(!html.includes('</script><script>alert(2)</script>'));
    assert.ok(html.includes('Marca \\u003C/script\\u003E\\u003Cscript\\u003Ealert(2)\\u003C/script\\u003E'));
    assert.ok(html.includes('Contenido &lt;seguro&gt;'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('alt="Foto del equipo"'));
    assert.ok(html.includes('rel="canonical" href="https://ingelop.example/pagina.php?slug=equipo"'));
    assert.ok(html.includes('property="og:image"'));
    assert.equal((await fetch(url + '/pagina.php?slug=no-existe')).status, 404);
    const contact = await fetch(url + '/contacto.php');
    const contactHtml = await contact.text();
    assert.ok(contactHtml.includes('name="csrf"'));
    assert.ok(contactHtml.includes('data-contacto-api'));
    assert.equal((contactHtml.match(/<form /g) || []).length, 1);
    const cookie = contact.headers.get('set-cookie').split(';')[0];
    const post = await fetch(url + '/contacto.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie }, body: 'csrf=invalido&nombre=Persona&email=persona%40example.com&mensaje=Mensaje+de+prueba&tipo=CONTACTO' });
    assert.ok((await post.text()).includes('La sesión expiró'));
    const cached = fs.readFileSync(path.join(temporal, 'storage/cache/web.json'), 'utf8');
    const preview = await fetch(url + '/pagina.php?slug=equipo&vista_previa=' + 'a'.repeat(30));
    const previewHtml = await preview.text();
    assert.ok(previewHtml.includes('Título privado'));
    assert.equal(preview.headers.get('cache-control'), 'no-store, private');
    assert.equal(preview.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(fs.readFileSync(path.join(temporal, 'storage/cache/web.json'), 'utf8'), cached);
    const servicesHtml = await (await fetch(url + '/servicios.php')).text();
    assert.ok(!servicesHtml.includes('<h2>Estudios de preinversión</h2>'));
    assert.ok(!servicesHtml.includes('servicios.php#preinversion'));
    const sitemap = await (await fetch(url + '/sitemap.php')).text();
    assert.ok(sitemap.includes('https://ingelop.example/pagina.php?slug=equipo'));
    disponible = false;
    const fallaPreview = await fetch(url + '/pagina.php?slug=equipo&vista_previa=' + 'a'.repeat(30));
    assert.equal(fallaPreview.status, 401);
    const cachePath = path.join(temporal, 'storage/cache/web.json');
    // API caída: se usa la copia de respaldo aunque sea antigua (no vence)
    const vieja = new Date(Date.now() - 24 * 3600 * 1000);
    fs.utimesSync(cachePath, vieja, vieja);
    const conCopia = await fetch(url + '/pagina.php?slug=equipo');
    assert.equal(conCopia.status, 200);
    // API caída y sin copia: los servicios fijos evitan que la web se vea vacía
    fs.rmSync(cachePath);
    fs.rmSync(path.join(temporal, 'storage/cache/web.fallo'), { force: true });
    const sinCopia = await (await fetch(url + '/servicios.php')).text();
    assert.ok(sinCopia.includes('Estudios de preinversión'));
    assert.ok(!logs.includes('PHP Warning') && !logs.includes('PHP Fatal'), logs);
  } finally {
    if (proc.exitCode === null && !spawnError) { const cerrado = new Promise((r) => proc.once('exit', r)); proc.kill(); await cerrado; }
    await new Promise((r) => api.close(r));
    // Solo elimina el directorio temporal creado por esta prueba.
    assert.ok(path.resolve(temporal).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temporal, { recursive: true, force: true });
  }
});
