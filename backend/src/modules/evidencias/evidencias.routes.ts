import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { uploadEvidencia } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './evidencias.controller';
import { crearEvidenciaSchema, listarEvidenciasQuery } from './evidencias.schema';

const router = Router();

router.get(
  '/proyectos/:id/evidencias',
  validate({ params: idParamSchema, query: listarEvidenciasQuery }),
  requireProjectAccess(),
  controller.listarPorProyecto,
);

// ADMIN y USUARIO (solo en sus obras asignadas). El acceso se verifica ANTES de aceptar el archivo.
router.post(
  '/proyectos/:id/evidencias',
  requireRole(Rol.ADMIN, Rol.USUARIO),
  validate({ params: idParamSchema }),
  requireProjectAccess(),
  uploadEvidencia,
  validate({ body: crearEvidenciaSchema }),
  controller.crear,
);

// Archivos protegidos: se sirven solo a usuarios con acceso al proyecto (no hay carpeta pública)
router.get('/evidencias/:id/archivo', validate({ params: idParamSchema }), controller.descargarArchivo);
router.delete('/evidencias/:id', requireRole(Rol.ADMIN), validate({ params: idParamSchema }), controller.eliminar);

export default router;
