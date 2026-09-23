import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './dashboard.controller';
import { dashboardGeneralQuery } from './dashboard.schema';

const router = Router();

router.get('/proyectos/:id/dashboard', validate({ params: idParamSchema }), requireProjectAccess(), controller.proyecto);
router.get('/dashboard/general', requireRole(Rol.ADMIN), validate({ query: dashboardGeneralQuery }), controller.general);

export default router;
