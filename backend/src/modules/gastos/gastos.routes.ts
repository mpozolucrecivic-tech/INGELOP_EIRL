import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './gastos.controller';
import {
  actualizarGastoSchema,
  crearGastoSchema,
  importarGastosSchema,
  listarGastosQuery,
  listarImportacionesQuery,
  verificarImportacionSchema,
} from './gastos.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

router.get(
  '/proyectos/:id/gastos',
  admin,
  validate({ params: idParamSchema, query: listarGastosQuery }),
  requireProjectAccess(),
  controller.listarPorProyecto,
);
router.post(
  '/proyectos/:id/gastos',
  admin,
  validate({ params: idParamSchema, body: crearGastoSchema }),
  requireProjectAccess(),
  controller.crear,
);
// Resumen: cualquier usuario con acceso a la obra
router.get('/proyectos/:id/gastos/resumen', validate({ params: idParamSchema }), requireProjectAccess(), controller.resumen);

// Gastos de la empresa (sin proyecto): solo jefatura
router.get('/gastos/empresa', admin, validate({ query: listarGastosQuery }), controller.listarEmpresa);
router.get('/gastos/empresa/resumen', admin, validate({ query: listarGastosQuery }), controller.resumenEmpresa);
router.post('/gastos/empresa', admin, validate({ body: crearGastoSchema }), controller.crearEmpresa);

// Importación desde Excel (de un proyecto o de la empresa) y su historial
router.post('/gastos/importar/verificar', admin, validate({ body: verificarImportacionSchema }), controller.verificarImportacion);
router.post('/gastos/importar', admin, validate({ body: importarGastosSchema }), controller.importar);
router.get('/gastos/importaciones', admin, validate({ query: listarImportacionesQuery }), controller.listarImportaciones);
router.delete('/gastos/importaciones/:id', admin, validate({ params: idParamSchema }), controller.deshacerImportacion);

router.put('/gastos/:id', admin, validate({ params: idParamSchema, body: actualizarGastoSchema }), controller.actualizar);
router.delete('/gastos/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
