import { Router } from 'express';
import { Rol } from '../../generated/prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { uploadCorrespondencia } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './contrato.controller';
import {
  actualizarAmpliacionSchema,
  actualizarCorrespondenciaSchema,
  actualizarObservacionSchema,
  crearAmpliacionSchema,
  crearCorrespondenciaSchema,
  crearObservacionSchema,
  listarCorrespondenciaQuery,
  listarObservacionesQuery,
  resolverAmpliacionSchema,
} from './contrato.schema';

// Consulta: jefatura y usuarios con acceso al proyecto. Registro: jefatura
// (salvo observaciones: el equipo puede avanzar el estado y redactar la respuesta).
const router = Router();
const admin = requireRole(Rol.ADMIN);

// Observaciones de la entidad
router.get('/proyectos/:id/observaciones', validate({ params: idParamSchema, query: listarObservacionesQuery }), requireProjectAccess(), controller.listarObservaciones);
router.post('/proyectos/:id/observaciones', admin, validate({ params: idParamSchema, body: crearObservacionSchema }), requireProjectAccess(), controller.crearObservacion);
router.patch('/observaciones/:id', validate({ params: idParamSchema, body: actualizarObservacionSchema }), controller.actualizarObservacion);
router.delete('/observaciones/:id', admin, validate({ params: idParamSchema }), controller.eliminarObservacion);

// Correspondencia (cartas, oficios, informes)
router.get('/correspondencia/siguiente-numero', admin, controller.siguienteNumeroCarta);
router.get('/proyectos/:id/correspondencia', validate({ params: idParamSchema, query: listarCorrespondenciaQuery }), requireProjectAccess(), controller.listarCorrespondencia);
router.post(
  '/proyectos/:id/correspondencia',
  admin,
  validate({ params: idParamSchema }),
  requireProjectAccess(),
  uploadCorrespondencia,
  validate({ body: crearCorrespondenciaSchema }),
  controller.crearCorrespondencia,
);
router.get('/correspondencia/:id/archivo', validate({ params: idParamSchema }), controller.descargarCorrespondencia);
router.put('/correspondencia/:id', admin, validate({ params: idParamSchema, body: actualizarCorrespondenciaSchema }), controller.actualizarCorrespondencia);
router.delete('/correspondencia/:id', admin, validate({ params: idParamSchema }), controller.eliminarCorrespondencia);

// Plazo y ampliaciones
router.get('/proyectos/:id/ampliaciones', validate({ params: idParamSchema }), requireProjectAccess(), controller.listarAmpliaciones);
router.post('/proyectos/:id/ampliaciones', admin, validate({ params: idParamSchema, body: crearAmpliacionSchema }), requireProjectAccess(), controller.crearAmpliacion);
router.put('/ampliaciones/:id', admin, validate({ params: idParamSchema, body: actualizarAmpliacionSchema }), controller.actualizarAmpliacion);
router.post('/ampliaciones/:id/resolver', admin, validate({ params: idParamSchema, body: resolverAmpliacionSchema }), controller.resolverAmpliacion);
router.delete('/ampliaciones/:id', admin, validate({ params: idParamSchema }), controller.eliminarAmpliacion);

export default router;
