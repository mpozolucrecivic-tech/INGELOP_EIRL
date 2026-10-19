import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './notificaciones.controller';
import { listarNotificacionesQuery } from './notificaciones.schema';

// Cada usuario (jefatura o arquitecto/ingeniero) ve y marca solo sus propias notificaciones
const router = Router();

router.get('/notificaciones', validate({ query: listarNotificacionesQuery }), controller.listar);
router.get('/notificaciones/contador', controller.contador);
router.post('/notificaciones/leer-todas', controller.marcarTodas);
router.post('/notificaciones/:id/leer', validate({ params: idParamSchema }), controller.marcarLeida);

export default router;
