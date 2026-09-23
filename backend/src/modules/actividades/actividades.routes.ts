import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './actividades.controller';
import { actualizarActividadSchema, crearActividadSchema, listarActividadesQuery } from './actividades.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// El acceso al proyecto del sprint/actividad se verifica en el service
router.get(
  '/sprints/:id/actividades',
  validate({ params: idParamSchema, query: listarActividadesQuery }),
  controller.listarPorSprint,
);
router.post('/sprints/:id/actividades', admin, validate({ params: idParamSchema, body: crearActividadSchema }), controller.crear);
// Mover en el tablero (estado/avance). Solo ADMIN: el rol USUARIO solo sube evidencias.
router.patch('/actividades/:id', admin, validate({ params: idParamSchema, body: actualizarActividadSchema }), controller.actualizar);
router.delete('/actividades/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
