import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './usuarios.controller';
import { actualizarUsuarioSchema, crearUsuarioSchema, listarUsuariosQuery } from './usuarios.schema';

const router = Router();

// verifyToken se aplica globalmente en app.ts; todo el módulo es solo ADMIN
router.get('/usuarios', requireRole(Rol.ADMIN), validate({ query: listarUsuariosQuery }), controller.listar);
router.post('/usuarios', requireRole(Rol.ADMIN), validate({ body: crearUsuarioSchema }), controller.crear);
router.put(
  '/usuarios/:id',
  requireRole(Rol.ADMIN),
  validate({ params: idParamSchema, body: actualizarUsuarioSchema }),
  controller.actualizar,
);
router.delete('/usuarios/:id', requireRole(Rol.ADMIN), validate({ params: idParamSchema }), controller.eliminar);

export default router;
