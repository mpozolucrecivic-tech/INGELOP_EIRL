import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { uploadFotoServicio } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './servicios.controller';
import { actualizarServicioSchema, crearServicioSchema } from './servicios.schema';

// ---------- Públicas (web informativa): se montan ANTES de verifyToken ----------
export const serviciosPublicRoutes = Router();

serviciosPublicRoutes.get('/servicios', controller.listarActivos);
serviciosPublicRoutes.get('/servicios/:id/foto', validate({ params: idParamSchema }), controller.verFoto);

// ---------- Intranet: solo ADMIN ----------
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/servicios/todos', admin, controller.listarTodos);
router.post('/servicios', admin, validate({ body: crearServicioSchema }), controller.crear);
router.put('/servicios/:id', admin, validate({ params: idParamSchema, body: actualizarServicioSchema }), controller.actualizar);
router.delete('/servicios/:id', admin, validate({ params: idParamSchema }), controller.desactivar);
// multipart/form-data con el archivo en el campo "archivo"
router.post('/servicios/:id/foto', admin, validate({ params: idParamSchema }), uploadFotoServicio, controller.cambiarFoto);
router.delete('/servicios/:id/foto', admin, validate({ params: idParamSchema }), controller.quitarFoto);

export default router;
