import { Router } from 'express';
import { z } from 'zod';
import { Rol } from '@prisma/client';
import { requireEditorWeb, requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { uploadFotoCms } from '../../middlewares/upload';
import * as controller from './cms.controller';
import { claveParams, guardarCmsSchema, medioParams, versionSchema } from './cms.schema';

// ---------- Públicas (las usa el PHP de la web): se montan ANTES de verifyToken ----------
export const cmsPublicRoutes = Router();

cmsPublicRoutes.get('/cms/vista-previa/:token', controller.vistaPrevia);
cmsPublicRoutes.get('/cms/medios/:id/archivo', validate({ params: medioParams }), controller.archivoMedio);

// ---------- Intranet: jefatura o usuarios con permiso de editor web; publicar y retirar, solo jefatura ----------
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.use('/cms', requireEditorWeb);
router.get('/cms/documentos', controller.listar);
router.put('/cms/documentos/:clave', validate({ params: claveParams, body: guardarCmsSchema }), controller.guardar);
router.post('/cms/documentos/:clave/publicar', admin, validate({ params: claveParams, body: versionSchema }), controller.publicar);
router.post('/cms/documentos/:clave/retirar', admin, validate({ params: claveParams, body: versionSchema }), controller.retirar);
router.get('/cms/documentos/:clave/historial', validate({ params: claveParams }), controller.historial);
router.post(
  '/cms/documentos/:clave/restaurar',
  validate({ params: claveParams, body: versionSchema.extend({ revisionId: z.number().int().positive() }) }),
  controller.restaurar,
);
router.post('/cms/documentos/:clave/vista-previa', validate({ params: claveParams, body: versionSchema }), controller.crearVistaPrevia);
router.get('/cms/medios', controller.listarMedios);
router.post('/cms/medios', uploadFotoCms, controller.subirMedio);
router.put('/cms/medios/:id', validate({ params: medioParams, body: z.object({ textoAlternativo: z.string().trim().max(300) }) }), controller.editarMedio);
router.get('/cms/medios/:id/miniatura', validate({ params: medioParams }), controller.miniatura);

export default router;
