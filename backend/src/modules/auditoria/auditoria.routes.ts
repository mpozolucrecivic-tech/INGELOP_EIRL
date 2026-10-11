import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './auditoria.controller';
import { filtrosAuditoriaQuery } from './auditoria.schema';

// Solo lectura y solo jefatura: la API no ofrece forma de editar ni borrar registros
const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get('/auditoria', admin, validate({ query: filtrosAuditoriaQuery }), controller.listar);
router.get('/auditoria/exportar', admin, validate({ query: filtrosAuditoriaQuery }), controller.exportar);
router.get('/auditoria/alertas', admin, controller.alertas);
router.get('/auditoria/ultimos-accesos', admin, controller.ultimosAccesos);

export default router;
