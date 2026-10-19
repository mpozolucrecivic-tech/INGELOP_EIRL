import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './cobros.controller';
import {
  actualizarCartaSchema,
  actualizarCobroSchema,
  crearCartaSchema,
  crearCobroSchema,
  listarCartasQuery,
  listarCobrosQuery,
  renovarCartaSchema,
} from './cobros.schema';

// Dinero de los contratos: todo el módulo es solo de la jefatura
const router = Router();
const admin = requireRole(Rol.ADMIN);

// Cobros al cliente
router.get('/cobros', admin, validate({ query: listarCobrosQuery }), controller.listarTodos);
router.get('/proyectos/:id/cobros', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.listarPorProyecto);
router.post('/proyectos/:id/cobros', admin, validate({ params: idParamSchema, body: crearCobroSchema }), requireProjectAccess(), controller.crear);
router.put('/cobros/:id', admin, validate({ params: idParamSchema, body: actualizarCobroSchema }), controller.actualizar);
router.delete('/cobros/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

// Cartas fianza
router.get('/cartas-fianza', admin, validate({ query: listarCartasQuery }), controller.listarCartas);
router.get('/proyectos/:id/cartas-fianza', admin, validate({ params: idParamSchema }), requireProjectAccess(), controller.listarCartasPorProyecto);
router.post('/proyectos/:id/cartas-fianza', admin, validate({ params: idParamSchema, body: crearCartaSchema }), requireProjectAccess(), controller.crearCarta);
router.put('/cartas-fianza/:id', admin, validate({ params: idParamSchema, body: actualizarCartaSchema }), controller.actualizarCarta);
router.post('/cartas-fianza/:id/renovar', admin, validate({ params: idParamSchema, body: renovarCartaSchema }), controller.renovarCarta);
router.delete('/cartas-fianza/:id', admin, validate({ params: idParamSchema }), controller.eliminarCarta);

export default router;
