import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './sitio.controller';
import { guardarSitioSchema } from './sitio.schema';

// ---------- Pública (la lee el PHP de la web): se monta ANTES de verifyToken ----------
export const sitioPublicRoutes = Router();

sitioPublicRoutes.get('/web', controller.contenidoWeb);

// ---------- Intranet: solo ADMIN ----------
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/sitio', admin, controller.listar);
router.put('/sitio', admin, validate({ body: guardarSitioSchema }), controller.guardar);

export default router;
