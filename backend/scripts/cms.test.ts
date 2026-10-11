import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contenidoSchema, enlaceSchema } from '../src/modules/cms/cms.schema';
import { predeterminados } from '../src/modules/cms/cms.defaults';
import { esImagenPermitida } from '../src/modules/cms/cms.images';

test('Los documentos iniciales cumplen el contrato editorial', () => {
  for (const doc of Object.values(predeterminados)) assert.equal(contenidoSchema.safeParse(doc).success, true);
});
test('Una extensión de imagen no hace válido un archivo con otra firma', () => {
  assert.equal(esImagenPermitida(Buffer.from('<script>mal</script>'), 'image/png'), false);
  assert.equal(esImagenPermitida(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'), true);
  assert.equal(esImagenPermitida(Buffer.from([255, 216, 255]), 'image/jpeg'), true);
  assert.equal(esImagenPermitida(Buffer.from('RIFF0000WEBP'), 'image/webp'), true);
  assert.equal(esImagenPermitida(Buffer.from('RIFF0000WAVE'), 'image/webp'), false);
});
test('Enlaces y formularios rechazan contenido peligroso o ambiguo', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//otro.example', 'https://x.com\nmal', '../admin.php'])
    assert.equal(enlaceSchema.safeParse(url).success, false, url);
  for (const url of ['https://example.com', 'contacto.php', 'pagina.php?slug=equipo']) assert.equal(enlaceSchema.safeParse(url).success, true);
  const pagina = structuredClone(predeterminados['pagina.contacto']);
  assert.equal(pagina.tipo, 'pagina');
  if (pagina.tipo !== 'pagina') return;
  pagina.bloques.push({ ...pagina.bloques[0] });
  assert.equal(contenidoSchema.safeParse(pagina).success, false);
  // La página de contacto no puede quedarse sin formulario (ni quitándolo ni ocultándolo)
  const sinFormulario = structuredClone(predeterminados['pagina.contacto']);
  if (sinFormulario.tipo !== 'pagina') return;
  assert.equal(contenidoSchema.safeParse({ ...sinFormulario, bloques: [] }).success, false);
  assert.equal(contenidoSchema.safeParse({ ...sinFormulario, bloques: sinFormulario.bloques.map((b) => ({ ...b, visible: false })) }).success, false);
});

// Prueba HTTP con persistencia simulada: no necesita una BD ni toca datos reales.
test('API CMS: permisos, aislamiento de borradores, publicación, conflictos, historial y vista previa', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'cms-test-secret-with-at-least-32-characters';
  const { prisma } = await import('../src/config/prisma');
  const { env } = await import('../src/config/env');
  const { default: jwt } = await import('jsonwebtoken');
  const usuarios = new Map<number, any>([
    [1, { id: 1, nombre: 'Jefatura', rol: 'ADMIN', activo: true, puedeEditarWeb: false }],
    [2, { id: 2, nombre: 'Editor', rol: 'USUARIO', activo: true, puedeEditarWeb: true }],
    [3, { id: 3, nombre: 'Técnico', rol: 'USUARIO', activo: true, puedeEditarWeb: false }],
  ]);
  const documentos = new Map<string, any>();
  const revisiones: any[] = [];
  const clone = (x: any) => x === null || x === undefined ? x : structuredClone(x);
  const docDelegate = {
    findMany: async ({ where, select }: any = {}) => [...documentos.values()].filter((d) => !where || d.publicado !== null).map((d) => select ? { clave: d.clave, publicado: clone(d.publicado) } : clone(d)),
    findUnique: async ({ where }: any) => clone(documentos.get(where.clave) ?? null),
    findUniqueOrThrow: async ({ where }: any) => clone(documentos.get(where.clave)),
    create: async ({ data }: any) => { const d = { ...clone(data), publicado: null, publicadoEn: null, actualizadoEn: new Date() }; documentos.set(d.clave, d); return clone(d); },
    updateMany: async ({ where, data }: any) => {
      const d = documentos.get(where.clave);
      if (!d || d.version !== where.version) return { count: 0 };
      const patch = { ...data };
      // Prisma DbNull es un valor especial que structuredClone no conserva.
      if (patch.publicado && typeof patch.publicado === 'object' && !('tipo' in patch.publicado)) patch.publicado = null;
      documentos.set(where.clave, { ...d, ...clone(patch) }); return { count: 1 };
    },
  };
  Object.assign(prisma.documentoCms, docDelegate);
  Object.assign(prisma.usuario, {
    findUnique: async ({ where }: any) => clone(usuarios.get(where.id) ?? null),
    findUniqueOrThrow: async ({ where }: any) => clone(usuarios.get(where.id)),
  });
  Object.assign(prisma.revisionCms, {
    create: async ({ data }: any) => { const r = { id: revisiones.length + 1, ...clone(data), fecha: new Date() }; revisiones.push(r); return r; },
    findMany: async ({ where }: any) => revisiones.filter((r) => r.documentoClave === where.documentoClave).slice().reverse(),
    findFirst: async ({ where }: any) => revisiones.find((r) => r.id === where.id && r.documentoClave === where.documentoClave) ?? null,
  });
  Object.assign(prisma.datoSitio, { findMany: async () => [] });
  Object.assign(prisma.proyectoWeb, { findMany: async () => [] });
  Object.assign(prisma.servicio, { findMany: async () => [] });
  Object.assign(prisma.medioCms, { findMany: async () => [], count: async () => 0 });
  (prisma as any).$transaction = async (fn: any) => fn(prisma);
  // Auditoría simulada: se comprueba qué eventos registra la API
  const auditoria: any[] = [];
  (prisma as any).$queryRaw = async () => [];
  (prisma as any).$executeRaw = async () => 0;
  Object.assign(prisma.auditoria, {
    findFirst: async () => (auditoria.length ? { hash: auditoria[auditoria.length - 1].hash } : null),
    create: async ({ data }: any) => { auditoria.push(data); return data; },
    count: async () => 0,
  });
  const { app } = await import('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const tokens = [1, 2, 3].map((id) => jwt.sign({ id, rol: usuarios.get(id).rol }, env.JWT_SECRET, { expiresIn: '1h' }));
  const call = async (path: string, method = 'GET', body?: unknown, token?: string) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json(), headers: r.headers };
  };
  try {
    assert.equal((await call('/cms/documentos')).status, 401);
    assert.equal((await call('/cms/documentos', 'GET', undefined, tokens[2])).status, 403);
    assert.equal((await call('/cms/documentos', 'GET', undefined, tokens[1])).status, 200);
    const contenido = { tipo: 'pagina', slug: 'prueba', titulo: 'Borrador privado', descripcion: '', imagenSocialId: null, bloques: [] };
    const path = '/cms/documentos/pagina.prueba';
    assert.equal((await call(path, 'PUT', { version: 0, contenido }, tokens[1])).status, 200);
    assert.equal((await call('/web')).body.cms['pagina.prueba'], undefined);
    assert.equal((await call(`${path}/publicar`, 'POST', { version: 1 }, tokens[1])).status, 403);
    assert.equal((await call(`${path}/publicar`, 'POST', { version: 1 }, tokens[0])).status, 200);
    assert.equal((await call('/web')).body.cms['pagina.prueba'].titulo, contenido.titulo);
    assert.equal((await call(path, 'PUT', { version: 2, contenido: { ...contenido, titulo: 'Nueva versión privada' } }, tokens[1])).status, 200);
    assert.equal((await call('/web')).body.cms['pagina.prueba'].titulo, contenido.titulo);
    assert.equal((await call(path, 'PUT', { version: 2, contenido }, tokens[1])).status, 409);
    const preview = await call(`${path}/vista-previa`, 'POST', { version: 3 }, tokens[1]);
    assert.equal(preview.status, 200);
    const token = new URL(preview.body.url).searchParams.get('vista_previa')!;
    const p = await call(`/cms/vista-previa/${token}`);
    assert.equal(p.body.cms['pagina.prueba'].titulo, 'Nueva versión privada');
    assert.equal(p.headers.get('cache-control'), 'no-store');
    assert.equal((await call('/cms/documentos', 'GET', undefined, token)).status, 401);
    assert.equal((await call(`${path}/restaurar`, 'POST', { version: 3, revisionId: 1 }, tokens[1])).status, 200);
    assert.equal((await call(`/cms/vista-previa/${token}`)).status, 409);
    assert.equal((await call(`${path}/historial`, 'GET', undefined, tokens[1])).body.length, 4);
    assert.equal((await call(`${path}/retirar`, 'POST', { version: 4 }, tokens[0])).status, 200);
    assert.equal((await call('/web')).body.cms['pagina.prueba'], undefined);
    const invalid = await call(path, 'PUT', { version: 5, contenido: { ...contenido, slug: 'otra' } }, tokens[1]);
    assert.equal(invalid.status, 400);
    usuarios.get(2).puedeEditarWeb = false;
    assert.equal((await call('/cms/documentos', 'GET', undefined, tokens[1])).status, 403);
    usuarios.get(1).rol = 'USUARIO';
    assert.equal((await call('/usuarios', 'GET', undefined, tokens[0])).status, 403);
    usuarios.get(3).activo = false;
    assert.equal((await call('/proyectos', 'GET', undefined, tokens[2])).status, 401);
    // Auditoría: accesos denegados, publicación, token de vista previa usado como sesión y cuenta desactivada
    await new Promise((r) => setTimeout(r, 50));
    const acciones = auditoria.map((e) => e.accion);
    assert.ok(acciones.includes('ACCESO_DENEGADO'), acciones.join(','));
    assert.ok(auditoria.some((e) => e.accion === 'PUBLICAR' && e.registroId === 'pagina.prueba' && e.usuarioId === 1), acciones.join(','));
    assert.ok(acciones.includes('TOKEN_ALTERADO'), acciones.join(','));
    assert.ok(acciones.includes('SESION_RECHAZADA'), acciones.join(','));
    assert.ok(auditoria.every((e, i) => e.hashAnterior === (i === 0 ? '0'.repeat(64) : auditoria[i - 1].hash)), 'cadena de huellas');
    assert.ok(auditoria.every((e) => !String(e.ruta).includes(token)), 'la ruta nunca guarda el token de vista previa');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve()));
    await prisma.$disconnect();
  }
});
