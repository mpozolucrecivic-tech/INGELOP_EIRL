import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { uploadFotoCms } from '../../middlewares/upload';
import { AppError } from '../../utils/AppError';
import { claveParams, guardarCmsSchema, medioParams, versionSchema } from './cms.schema';
import * as cms from './cms.service';
import { contenidoWeb } from '../sitio/sitio.service';

export const cmsPublicRoutes = Router();
cmsPublicRoutes.get('/cms/vista-previa/:token', async (req, res) => {
  const preview = await cms.leerVistaPrevia(String(req.params.token));
  const web = await contenidoWeb();
  res.set('Cache-Control', 'no-store').json({ ...web, medios: await cms.medios(), cms: { ...web.cms, [preview.clave]: preview.contenido } });
});
cmsPublicRoutes.get('/cms/medios/:id/archivo', validate({ params: medioParams }), async (req, res) => {
  let preview = false;
  if (typeof req.query.vista_previa === 'string') {
    const p = await cms.leerVistaPrevia(req.query.vista_previa);
    const { contenidoSchema } = await import('./cms.schema');
    const c = contenidoSchema.parse(p.contenido);
    const id = Number(req.params.id);
    preview = c.tipo === 'pagina' ? c.imagenSocialId === id || c.bloques.some((b) => b.medioId === id) : c.logoId === id;
    res.set('Cache-Control', 'no-store');
  }
  res.sendFile(await cms.archivoMedio(Number(req.params.id), preview));
});

const router = Router();
router.use('/cms', async (req, _res, next) => {
  const u = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
  if (!u?.activo || (u.rol !== 'ADMIN' && !u.puedeEditarWeb)) throw AppError.forbidden();
  next();
});
router.get('/cms/documentos', async (_req, res) => { res.json(await cms.listar()); });
router.put('/cms/documentos/:clave', validate({ params: claveParams, body: guardarCmsSchema }), async (req, res) => {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'GUARDAR', req.body.contenido));
});
for (const [ruta, accion] of [['publicar', 'PUBLICAR'], ['retirar', 'RETIRAR']] as const) {
  router.post(`/cms/documentos/:clave/${ruta}`, requireRole('ADMIN'), validate({ params: claveParams, body: versionSchema }), async (req, res) => {
    res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, accion));
  });
}
router.get('/cms/documentos/:clave/historial', validate({ params: claveParams }), async (req, res) => { res.json(await cms.historial(String(req.params.clave))); });
router.post('/cms/documentos/:clave/restaurar', validate({ params: claveParams, body: versionSchema.extend({ revisionId: z.number().int().positive() }) }), async (req, res) => {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'RESTAURAR', undefined, req.body.revisionId));
});
router.post('/cms/documentos/:clave/vista-previa', validate({ params: claveParams, body: versionSchema }), async (req, res) => {
  res.json(await cms.crearVistaPrevia(String(req.params.clave), req.body.version, req.usuario.id));
});
router.get('/cms/medios', async (_req, res) => { res.json(await cms.medios()); });
router.post('/cms/medios', uploadFotoCms, async (req, res) => { res.status(201).json(await cms.subirMedio(req.file)); });
router.put('/cms/medios/:id', validate({ params: medioParams, body: z.object({ textoAlternativo: z.string().trim().max(300) }) }), async (req, res) => {
  await prisma.medioCms.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json({ message: 'Texto alternativo guardado' });
});
router.get('/cms/medios/:id/miniatura', validate({ params: medioParams }), async (req, res) => {
  res.set('Cache-Control', 'no-store').sendFile(await cms.archivoMedio(Number(req.params.id), true));
});
export default router;
