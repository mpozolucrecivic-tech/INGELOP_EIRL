import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './gastos.controller';
import { actualizarGastoSchema, crearGastoSchema, listarGastosQuery } from './gastos.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get(
  '/proyectos/:id/gastos',
  admin,
  validate({ params: idParamSchema, query: listarGastosQuery }),
  requireProjectAccess(),
  controller.listarPorProyecto,
);
router.post(
  '/proyectos/:id/gastos',
  admin,
  validate({ params: idParamSchema, body: crearGastoSchema }),
  requireProjectAccess(),
  controller.crear,
);
// Resumen: cualquier usuario con acceso a la obra
router.get('/proyectos/:id/gastos/resumen', validate({ params: idParamSchema }), requireProjectAccess(), controller.resumen);

router.put('/gastos/:id', admin, validate({ params: idParamSchema, body: actualizarGastoSchema }), controller.actualizar);
router.delete('/gastos/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
