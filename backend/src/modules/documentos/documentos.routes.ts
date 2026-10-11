import { Router } from 'express';
import { Rol } from '@prisma/client';
import { requireRole } from '../../middlewares/auth';
import { requireProjectAccess } from '../../middlewares/projectAccess';
import { uploadDocumento } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../utils/schemas';
import * as controller from './documentos.controller';
import { documentosProyectoQuery, editarDocumentoSchema, etapaParams, listarDocumentosQuery, subirDocumentoSchema } from './documentos.schema';

const router = Router();
const admin = requireRole(Rol.ADMIN);

// Listados (antes que /documentos/:id)
router.get('/documentos', admin, validate({ query: listarDocumentosQuery }), controller.listarTodos);
router.get('/documentos/mios', validate({ query: listarDocumentosQuery }), controller.listarMios);
router.get(
  '/proyectos/:id/documentos',
  validate({ params: idParamSchema, query: documentosProyectoQuery }),
  requireProjectAccess(),
  controller.listarPorProyecto,
);

// Subida: jefatura o asignados al proyecto. El acceso se verifica ANTES de aceptar el archivo.
router.post(
  '/proyectos/:id/etapas/:etapaId/documentos',
  validate({ params: etapaParams }),
  requireProjectAccess(),
  uploadDocumento,
  validate({ body: subirDocumentoSchema }),
  controller.subir,
);

// Archivo, edición (dueño o jefatura) y eliminación (solo jefatura)
router.get('/documentos/:id/archivo', validate({ params: idParamSchema }), controller.descargar);
router.patch('/documentos/:id', validate({ params: idParamSchema, body: editarDocumentoSchema }), controller.editar);
router.delete('/documentos/:id', admin, validate({ params: idParamSchema }), controller.eliminar);

export default router;
