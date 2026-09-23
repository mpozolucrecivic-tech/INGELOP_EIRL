import path from 'node:path';
import { TipoEvidencia } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import type { UsuarioAutenticado } from '../../types/express';
import type { CrearEvidenciaInput, ListarEvidenciasQuery } from './evidencias.schema';

const includeEvidencia = {
  usuario: { select: { id: true, nombre: true } },
  actividad: { select: { id: true, nombre: true } },
} as const;

/** Agrega la URL (protegida con JWT) para descargar el archivo, si lo tiene */
const conDescarga = <T extends { id: number; archivoUrl: string | null }>(e: T) => ({
  ...e,
  descargaUrl: e.archivoUrl ? `/api/v1/evidencias/${e.id}/archivo` : null,
});

export async function listarPorProyecto(proyectoId: number, filtros: ListarEvidenciasQuery) {
  const evidencias = await prisma.evidencia.findMany({
    where: { proyectoId, ...filtros },
    include: includeEvidencia,
    orderBy: { fecha: 'desc' },
  });
  return evidencias.map(conDescarga);
}

/**
 * Crea una evidencia. El acceso al proyecto ya fue verificado (ADMIN o USUARIO asignado).
 * FOTO/INFORME/DOCUMENTO requieren archivo; OBSERVACION puede ser solo texto.
 */
export async function crear(
  proyectoId: number,
  usuarioId: number,
  data: CrearEvidenciaInput,
  archivo?: Express.Multer.File,
) {
  if (data.tipo !== TipoEvidencia.OBSERVACION && !archivo) {
    throw AppError.badRequest(`Las evidencias de tipo ${data.tipo} requieren un archivo en el campo "archivo"`);
  }
  if (data.tipo === TipoEvidencia.FOTO && archivo && !archivo.mimetype.startsWith('image/')) {
    throw AppError.badRequest('Una evidencia de tipo FOTO debe ser una imagen');
  }

  if (data.actividadId) {
    const actividad = await prisma.actividad.findUnique({
      where: { id: data.actividadId },
      select: { sprint: { select: { proyectoId: true } } },
    });
    if (!actividad || actividad.sprint.proyectoId !== proyectoId) {
      throw AppError.badRequest('actividadId: la actividad no existe o pertenece a otro proyecto');
    }
  }

  const evidencia = await prisma.evidencia.create({
    data: { ...data, proyectoId, usuarioId, archivoUrl: archivo ? toStorageKey(archivo.path) : null },
    include: includeEvidencia,
  });
  return conDescarga(evidencia);
}

/** Devuelve la ruta local del archivo, verificando acceso al proyecto de la evidencia */
export async function obtenerArchivo(usuario: UsuarioAutenticado, id: number) {
  const evidencia = await prisma.evidencia.findUnique({ where: { id } });
  if (!evidencia) throw AppError.notFound('Evidencia no encontrada');
  await assertProjectAccess(usuario, evidencia.proyectoId);

  if (!evidencia.archivoUrl || !(await storage.exists(evidencia.archivoUrl))) {
    throw AppError.notFound('La evidencia no tiene archivo asociado');
  }
  const ruta = storage.resolve(evidencia.archivoUrl);
  const extension = path.extname(ruta);
  const nombreDescarga = `${evidencia.titulo.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim() || 'evidencia'}${extension}`;
  return { ruta, nombreDescarga };
}

export async function eliminar(id: number) {
  const evidencia = await prisma.evidencia.delete({ where: { id } });
  if (evidencia.archivoUrl) await storage.remove(evidencia.archivoUrl);
}
