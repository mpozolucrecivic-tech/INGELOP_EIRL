import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './sprints.controller';
import { actualizarSprintSchema, crearSprintSchema } from './sprints.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/proyectos/:id/sprints', validate({ params: idParamSchema }), requireProjectAccess(), controller.listarPorProyecto);
router.post(
  '/proyectos/:id/sprints',
  admin,
  validate({ params: idParamSchema, body: crearSprintSchema }),
  requireProjectAccess(),
  controller.crear,
);
router.put('/sprints/:id', admin, validate({ params: idParamSchema, body: actualizarSprintSchema }), controller.actualizar);
router.delete('/sprints/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
