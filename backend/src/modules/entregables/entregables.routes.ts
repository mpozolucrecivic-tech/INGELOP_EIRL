import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './entregables.controller';
import { actualizarEntregableSchema, crearEntregableSchema } from './entregables.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// Lectura: cualquier usuario con acceso a la obra · Gestión: solo ADMIN
router.get('/proyectos/:id/entregables', validate({ params: idParamSchema }), requireProjectAccess(), controller.listarPorProyecto);
router.post(
  '/proyectos/:id/entregables',
  admin,
  validate({ params: idParamSchema, body: crearEntregableSchema }),
  requireProjectAccess(),
  controller.crear,
);
router.post('/proyectos/:id/entregables/plantilla', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.aplicarPlantilla);
router.patch('/entregables/:id', admin, validate({ params: idParamSchema, body: actualizarEntregableSchema }), controller.actualizar);
router.delete('/entregables/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
