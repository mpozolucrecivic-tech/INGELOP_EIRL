import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './materiales.controller';
import { actualizarMaterialSchema, crearMaterialSchema, crearMovimientoSchema } from './materiales.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/proyectos/:id/materiales', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.listarPorProyecto);
router.post(
  '/proyectos/:id/materiales',
  admin,
  validate({ params: idParamSchema, body: crearMaterialSchema }),
  requireProjectAccess(),
  controller.crear,
);
// Alertas de stock bajo: visible para cualquier usuario con acceso a la obra
router.get('/proyectos/:id/materiales/alertas', validate({ params: idParamSchema }), requireProjectAccess(), controller.alertas);

router.put('/materiales/:id', admin, validate({ params: idParamSchema, body: actualizarMaterialSchema }), controller.actualizar);
router.get('/materiales/:id/movimientos', admin, validate({ params: idParamSchema }), controller.listarMovimientos);
router.post(
  '/materiales/:id/movimientos',
  admin,
  validate({ params: idParamSchema, body: crearMovimientoSchema }),
  controller.registrarMovimiento,
);

export default router;
