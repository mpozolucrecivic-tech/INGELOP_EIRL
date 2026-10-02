import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { limiteContacto } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './contacto.controller';
import { crearMensajeSchema, listarMensajesQuery, marcarLeidoSchema } from './contacto.schema';

// ---------- Pública (formulario de la web): se monta ANTES de verifyToken ----------
export const contactoPublicRoutes = Router();

contactoPublicRoutes.post('/contacto', limiteContacto, validate({ body: crearMensajeSchema }), controller.crear);

// ---------- Intranet: solo ADMIN ----------
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/contacto', admin, validate({ query: listarMensajesQuery }), controller.listar);
router.patch('/contacto/:id/leido', admin, validate({ params: idParamSchema, body: marcarLeidoSchema }), controller.marcarLeido);

export default router;
