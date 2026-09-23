import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { uploadPlano } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './planos.controller';
import { actualizarPlanoSchema, crearPlanoSchema, listarPlanosQuery, nuevaVersionSchema } from './planos.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get(
  '/proyectos/:id/planos',
  validate({ params: idParamSchema, query: listarPlanosQuery }),
  requireProjectAccess(),
  controller.listarPorProyecto,
);

// ADMIN y USUARIO asignado pueden registrar planos y subir revisiones (multipart, archivo opcional al crear)
router.post(
  '/proyectos/:id/planos',
  validate({ params: idParamSchema }),
  requireProjectAccess(),
  uploadPlano,
  validate({ body: crearPlanoSchema }),
  controller.crear,
);

// Declarada antes de /planos/:id para que "versiones" no se tome como id
router.get('/planos/versiones/:id/archivo', validate({ params: idParamSchema }), controller.descargarVersion);

router.get('/planos/:id', validate({ params: idParamSchema }), controller.obtener);
router.post(
  '/planos/:id/versiones',
  validate({ params: idParamSchema }),
  controller.prepararSubida,
  uploadPlano,
  validate({ body: nuevaVersionSchema }),
  controller.nuevaVersion,
);

// Revisión (aprobar / observar) y edición: solo ADMIN
router.patch('/planos/:id', admin, validate({ params: idParamSchema, body: actualizarPlanoSchema }), controller.actualizar);
router.delete('/planos/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
