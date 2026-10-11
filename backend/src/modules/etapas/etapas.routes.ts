import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './etapas.controller';
import { editarEtapaSchema, iniciarEtapaSchema, observarEtapaSchema } from './etapas.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// Todos los asignados al proyecto ven el estado de cada etapa
router.get('/proyectos/:id/etapas', validate({ params: idParamSchema }), requireProjectAccess(), controller.listar);

// Solo la jefatura inicia etapas, cambia fechas, aprueba, observa o elimina
router.post('/proyectos/:id/etapas', admin, validate({ params: idParamSchema, body: iniciarEtapaSchema }), requireProjectAccess(), controller.iniciar);
router.patch('/etapas/:id', admin, validate({ params: idParamSchema, body: editarEtapaSchema }), controller.editarFechas);
router.post('/etapas/:id/aprobar', admin, validate({ params: idParamSchema }), controller.aprobar);
router.post('/etapas/:id/observar', admin, validate({ params: idParamSchema, body: observarEtapaSchema }), controller.observar);
router.delete('/etapas/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

// El responsable (cualquier asignado) envía a revisión; el acceso al proyecto se verifica en el servicio
router.post('/etapas/:id/enviar', validate({ params: idParamSchema }), controller.enviarARevision);

export default router;
