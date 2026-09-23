import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './presupuestos.controller';
import { actualizarPresupuestoSchema, crearPresupuestoSchema, guardarPartidasSchema } from './presupuestos.schema';

const router = Router();

// ADMIN y USUARIO asignado elaboran presupuestos; el acceso al proyecto se verifica en ruta o service
router.get('/proyectos/:id/presupuestos', validate({ params: idParamSchema }), requireProjectAccess(), controller.listarPorProyecto);
router.post(
  '/proyectos/:id/presupuestos',
  validate({ params: idParamSchema, body: crearPresupuestoSchema }),
  requireProjectAccess(),
  controller.crear,
);

router.get('/presupuestos/:id', validate({ params: idParamSchema }), controller.obtener);
router.put('/presupuestos/:id', validate({ params: idParamSchema, body: actualizarPresupuestoSchema }), controller.actualizar);
router.put('/presupuestos/:id/partidas', validate({ params: idParamSchema, body: guardarPartidasSchema }), controller.guardarPartidas);
router.post('/presupuestos/:id/duplicar', validate({ params: idParamSchema }), controller.duplicar);
router.delete('/presupuestos/:id', requireRole(Rol.ADMIN), validate({ params: idParamSchema }), controller.eliminar);

export default router;
