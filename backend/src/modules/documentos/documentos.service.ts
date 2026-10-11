import crypto from 'node:crypto';
import path from 'node:path';
import { open } from 'node:fs/promises';
import { EstadoEtapa, Prisma, Rol } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import { BYTES_FIRMA, firmaValida } from '../../utils/firmaArchivo';
import type { UsuarioAutenticado } from '../../types/express';
import type { DocumentosProyectoQuery, EditarDocumentoInput, ListarDocumentosQuery, SubirDocumentoInput } from './documentos.schema';

const incluir = {
  usuario: { select: { id: true, nombre: true } },
  etapa: { select: { id: true, tipo: true, estado: true } },
  proyecto: { select: { id: true, nombre: true } },
} as const;

/** Nunca se expone la ruta interna; la descarga va por una URL protegida con JWT */
const aPublico = <T extends { id: number; ruta: string }>({ ruta: _ruta, ...d }: T) => ({ ...d, descargaUrl: `/api/v1/documentos/${d.id}/archivo` });

const esAdmin = (u: UsuarioAutenticado) => u.rol === Rol.ADMIN;

/**
 * Documentos de un proyecto. Jefatura: todos. Arquitecto o ingeniero: SOLO los que subió él,
 * también dentro de sus proyectos. (El estado de las etapas sí lo ven todos los asignados.)
 */
export async function listarPorProyecto(usuario: UsuarioAutenticado, proyectoId: number, filtros: DocumentosProyectoQuery) {
  const documentos = await prisma.documento.findMany({
    where: { proyectoId, ...filtros, ...(!esAdmin(usuario) && { usuarioId: usuario.id }) },
    include: incluir,
    orderBy: { fecha: 'desc' },
  });
  return documentos.map(aPublico);
}

function filtroListado(f: ListarDocumentosQuery): Prisma.DocumentoWhereInput {
  return {
    ...(f.proyectoId && { proyectoId: f.proyectoId }),
    ...(f.etapa && { etapa: { tipo: f.etapa } }),
    ...(f.categoria && { categoria: f.categoria }),
    ...(f.usuarioId && { usuarioId: f.usuarioId }),
    ...((f.desde || f.hasta) && { fecha: { ...(f.desde && { gte: f.desde }), ...(f.hasta && { lte: f.hasta }) } }),
    ...(f.q && {
      OR: [
        { nombreArchivo: { contains: f.q, mode: 'insensitive' } },
        { descripcion: { contains: f.q, mode: 'insensitive' } },
        { proyecto: { nombre: { contains: f.q, mode: 'insensitive' } } },
      ],
    }),
  };
}

async function paginar(where: Prisma.DocumentoWhereInput, f: ListarDocumentosQuery) {
  const [total, documentos] = await Promise.all([
    prisma.documento.count({ where }),
    prisma.documento.findMany({ where, include: incluir, orderBy: { fecha: 'desc' }, skip: (f.pagina - 1) * f.porPagina, take: f.porPagina }),
  ]);
  return { total, pagina: f.pagina, porPagina: f.porPagina, documentos: documentos.map(aPublico) };
}

/** Jefatura: todos los documentos de todos los proyectos, con filtros */
export const listarTodos = (f: ListarDocumentosQuery) => paginar(filtroListado(f), f);

/** Historial personal: solo lo que subió el usuario (el filtro por persona se ignora) */
export const listarMios = (usuario: UsuarioAutenticado, f: ListarDocumentosQuery) =>
  paginar({ ...filtroListado({ ...f, usuarioId: undefined }), usuarioId: usuario.id }, f);

/**
 * Registra un documento ya guardado por Multer. Si algo falla (firma falsa, etapa aprobada, BD),
 * se lanza un error y el middleware de subida borra el archivo: nunca quedan archivos huérfanos.
 */
export async function subir(
  usuario: UsuarioAutenticado,
  proyectoId: number,
  etapaId: number,
  data: SubirDocumentoInput,
  archivo: Express.Multer.File | undefined,
) {
  if (!archivo) throw AppError.badRequest('Adjunta el archivo en el campo "archivo"');

  const extension = path.extname(archivo.originalname).toLowerCase();
  const handle = await open(archivo.path, 'r');
  try {
    const inicio = Buffer.alloc(BYTES_FIRMA);
    const { bytesRead } = await handle.read(inicio, 0, BYTES_FIRMA, 0);
    if (!firmaValida(extension, inicio.subarray(0, bytesRead))) {
      throw AppError.badRequest(`El contenido del archivo no corresponde a un ${extension.slice(1).toUpperCase()} válido`);
    }
  } finally {
    await handle.close();
  }

  const etapa = await prisma.etapa.findUnique({ where: { id: etapaId } });
  if (!etapa || etapa.proyectoId !== proyectoId) throw AppError.notFound('Etapa no encontrada en este proyecto');
  if (etapa.estado === EstadoEtapa.APROBADO) throw AppError.conflict('La etapa ya está aprobada: no admite documentos nuevos');

  const documento = await prisma.documento.create({
    data: {
      proyectoId,
      etapaId,
      categoria: data.categoria,
      descripcion: data.descripcion,
      nombreArchivo: archivo.originalname.slice(0, 255),
      ruta: toStorageKey(archivo.path),
      tamano: archivo.size,
      tipoArchivo: archivo.mimetype,
      usuarioId: usuario.id,
    },
    include: incluir,
  });
  return aPublico(documento);
}

/** Jefatura: cualquier documento. Arquitecto o ingeniero: solo los suyos y con acceso vigente al proyecto. */
async function documentoPermitido(usuario: UsuarioAutenticado, id: number) {
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) throw AppError.notFound('Documento no encontrado');
  if (!esAdmin(usuario)) {
    if (documento.usuarioId !== usuario.id) throw AppError.forbidden('Solo puedes ver los documentos que subiste');
    await assertProjectAccess(usuario, documento.proyectoId);
  }
  return documento;
}

export async function obtenerArchivo(usuario: UsuarioAutenticado, id: number) {
  const documento = await documentoPermitido(usuario, id);
  if (!(await storage.exists(documento.ruta))) throw AppError.notFound('El archivo ya no está disponible');
  return { ruta: documento.ruta, nombre: documento.nombreArchivo };
}

export async function editar(usuario: UsuarioAutenticado, id: number, data: EditarDocumentoInput) {
  await documentoPermitido(usuario, id);
  return aPublico(await prisma.documento.update({ where: { id }, data, include: incluir }));
}

/**
 * Eliminar sin dejar inconsistencias en ningún sentido:
 * 1) el archivo pasa a una papelera temporal; 2) se borra el registro;
 * 3a) si falla la BD, el archivo vuelve a su lugar; 3b) si todo salió bien, se borra de la papelera.
 */
export async function eliminar(id: number) {
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) throw AppError.notFound('Documento no encontrado');

  const existe = await storage.exists(documento.ruta);
  const papelera = `papelera/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${path.basename(documento.ruta)}`;
  if (existe) await storage.move(documento.ruta, papelera);
  try {
    await prisma.documento.delete({ where: { id } });
  } catch (err) {
    if (existe) await storage.move(papelera, documento.ruta);
    throw err;
  }
  if (existe) await storage.remove(papelera).catch((e) => console.error('[DOCUMENTOS] No se pudo vaciar la papelera', papelera, e));
}
