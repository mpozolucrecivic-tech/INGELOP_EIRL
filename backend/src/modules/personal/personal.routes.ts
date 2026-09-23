import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema, rangoFechasQuery } from '../../utils/schemas';
import * as controller from './personal.controller';
import {
  actualizarTrabajadorSchema,
  cerrarAsignacionSchema,
  crearAsignacionSchema,
  crearRegistroHorasSchema,
  crearTrabajadorSchema,
  listarRegistrosQuery,
  listarTrabajadoresQuery,
} from './personal.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// Trabajadores
router.get('/trabajadores', admin, validate({ query: listarTrabajadoresQuery }), controller.listarTrabajadores);
router.post('/trabajadores', admin, validate({ body: crearTrabajadorSchema }), controller.crearTrabajador);
router.put(
  '/trabajadores/:id',
  admin,
  validate({ params: idParamSchema, body: actualizarTrabajadorSchema }),
  controller.actualizarTrabajador,
);

// Asignaciones a obra
router.get('/proyectos/:id/asignaciones', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.listarAsignaciones);
router.post(
  '/proyectos/:id/asignaciones',
  admin,
  validate({ params: idParamSchema, body: crearAsignacionSchema }),
  requireProjectAccess(),
  controller.crearAsignacion,
);
router.patch(
  '/asignaciones/:id',
  admin,
  validate({ params: idParamSchema, body: cerrarAsignacionSchema }),
  controller.cerrarAsignacion,
);

// Registro de horas del equipo técnico
router.get(
  '/proyectos/:id/registros-horas',
  admin,
  validate({ params: idParamSchema, query: listarRegistrosQuery }),
  requireProjectAccess(),
  controller.listarRegistros,
);
router.post(
  '/proyectos/:id/registros-horas',
  admin,
  validate({ params: idParamSchema, body: crearRegistroHorasSchema }),
  requireProjectAccess(),
  controller.registrarHoras,
);
router.delete('/registros-horas/:id', admin, validate({ params: idParamSchema }), controller.eliminarRegistro);

// Resumen de horas: cualquier usuario con acceso a la obra
router.get(
  '/proyectos/:id/horas',
  validate({ params: idParamSchema, query: rangoFechasQuery }),
  requireProjectAccess(),
  controller.resumenHoras,
);

export default router;
