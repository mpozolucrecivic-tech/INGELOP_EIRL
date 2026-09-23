import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './clientes.controller';
import { actualizarClienteSchema, crearClienteSchema, listarClientesQuery } from './clientes.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// Todo el módulo es solo ADMIN
router.get('/clientes', admin, validate({ query: listarClientesQuery }), controller.listar);
router.post('/clientes', admin, validate({ body: crearClienteSchema }), controller.crear);
router.get('/clientes/:id', admin, validate({ params: idParamSchema }), controller.obtener);
router.put('/clientes/:id', admin, validate({ params: idParamSchema, body: actualizarClienteSchema }), controller.actualizar);
router.delete('/clientes/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
