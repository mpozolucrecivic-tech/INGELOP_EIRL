import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './proyectos.controller';
import {
  actualizarProyectoSchema,
  asignarUsuarioSchema,
  crearProyectoSchema,
  listarProyectosQuery,
  usuarioProyectoParams,
} from './proyectos.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// ADMIN: todos | USUARIO: solo asignados (filtrado en el service)
router.get('/proyectos', validate({ query: listarProyectosQuery }), controller.listar);
router.post('/proyectos', admin, validate({ body: crearProyectoSchema }), controller.crear);
router.get('/proyectos/:id', validate({ params: idParamSchema }), requireProjectAccess(), controller.obtener);
router.put(
  '/proyectos/:id',
  admin,
  validate({ params: idParamSchema, body: actualizarProyectoSchema }),
  controller.actualizar,
);
router.delete('/proyectos/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

// Usuarios (rol USUARIO) asignados a la obra
router.get('/proyectos/:id/usuarios', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.listarUsuarios);
router.post(
  '/proyectos/:id/usuarios',
  admin,
  validate({ params: idParamSchema, body: asignarUsuarioSchema }),
  requireProjectAccess(),
  controller.asignarUsuario,
);
router.delete(
  '/proyectos/:id/usuarios/:usuarioId',
  admin,
  validate({ params: usuarioProyectoParams }),
  requireProjectAccess(),
  controller.desasignarUsuario,
);

export default router;
