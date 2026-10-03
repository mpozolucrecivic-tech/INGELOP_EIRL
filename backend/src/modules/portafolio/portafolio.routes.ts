import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { uploadFotoPortafolio } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './portafolio.controller';
import { actualizarProyectoWebSchema, crearProyectoWebSchema } from './portafolio.schema';

// Proyectos realizados que muestra la web. Se usa /portafolio porque /proyectos es de la intranet.

// ---------- Pública: se monta ANTES de verifyToken ----------
export const portafolioPublicRoutes = Router();

portafolioPublicRoutes.get('/portafolio/:id/foto', validate({ params: idParamSchema }), controller.verFoto);

// ---------- Intranet: solo ADMIN ----------
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/portafolio', admin, controller.listarTodos);
router.post('/portafolio', admin, validate({ body: crearProyectoWebSchema }), controller.crear);
router.put('/portafolio/:id', admin, validate({ params: idParamSchema, body: actualizarProyectoWebSchema }), controller.actualizar);
router.delete('/portafolio/:id', admin, validate({ params: idParamSchema }), controller.ocultar);
router.post('/portafolio/:id/foto', admin, validate({ params: idParamSchema }), uploadFotoPortafolio, controller.cambiarFoto);
router.delete('/portafolio/:id/foto', admin, validate({ params: idParamSchema }), controller.quitarFoto);

export default router;
