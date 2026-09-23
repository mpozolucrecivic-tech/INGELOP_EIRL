import path from 'node:path';
import { EstadoRevision, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import type { UsuarioAutenticado } from '../../types/express';
import type { ActualizarPlanoInput, CrearPlanoInput, ListarPlanosQuery, NuevaVersionInput } from './planos.schema';

const versionSelect = {
  id: true,
  revision: true,
  nombreArchivo: true,
  tamano: true,
  comentario: true,
  fecha: true,
  usuario: { select: { id: true, nombre: true } },
} satisfies Prisma.PlanoVersionSelect;

type VersionRow = Prisma.PlanoVersionGetPayload<{ select: typeof versionSelect }>;

const conDescarga = (v: VersionRow) => ({ ...v, descargaUrl: `/api/v1/planos/versiones/${v.id}/archivo` });

async function assertResponsable(id: number | null | undefined) {
  if (!id) return;
  const u = await prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
  if (!u || !u.activo) throw AppError.badRequest('responsableId: el usuario no existe o está inactivo');
}

export async function listarPorProyecto(proyectoId: number, filtros: ListarPlanosQuery) {
  const planos = await prisma.plano.findMany({
    where: { proyectoId, ...filtros },
    include: {
      responsable: { select: { id: true, nombre: true } },
      versiones: { select: versionSelect, orderBy: { revision: 'desc' }, take: 1 },
      _count: { select: { versiones: true } },
    },
    orderBy: [{ especialidad: 'asc' }, { codigo: 'asc' }],
  });
  return planos.map(({ versiones, _count, ...p }) => ({
    ...p,
    ultimaVersion: versiones[0] ? conDescarga(versiones[0]) : null,
    totalVersiones: _count.versiones,
  }));
}

/** Plano con su historial de revisiones; verifica acceso al proyecto */
export async function obtener(usuario: UsuarioAutenticado, id: number) {
  const plano = await prisma.plano.findUnique({
    where: { id },
    include: {
      responsable: { select: { id: true, nombre: true } },
      versiones: { select: versionSelect, orderBy: { revision: 'desc' } },
    },
  });
  if (!plano) throw AppError.notFound('Plano no encontrado');
  await assertProjectAccess(usuario, plano.proyectoId);
  return { ...plano, versiones: plano.versiones.map(conDescarga) };
}

/**
 * Crea el plano. Si viene archivo, se registra como revisión 1 y el plano pasa a EN_REVISION;
 * sin archivo queda en BORRADOR (plano pendiente de elaborar).
 */
export async function crear(proyectoId: number, usuarioId: number, data: CrearPlanoInput, archivo?: Express.Multer.File) {
  await assertResponsable(data.responsableId);
  const { comentario, ...campos } = data;

  const plano = await prisma.plano.create({
    data: {
      ...campos,
      responsableId: campos.responsableId ?? usuarioId, // por defecto, quien lo registra
      proyectoId,
      estado: archivo ? EstadoRevision.EN_REVISION : EstadoRevision.BORRADOR,
      ...(archivo && {
        versiones: {
          create: {
            revision: 1,
            archivoUrl: toStorageKey(archivo.path),
            nombreArchivo: archivo.originalname,
            tamano: archivo.size,
            comentario,
            usuarioId,
          },
        },
      }),
    },
  }); // código repetido en el proyecto -> P2002 -> 409

  return (await listarPorProyecto(proyectoId, {})).find((p) => p.id === plano.id);
}

/** Resuelve el proyecto del plano antes de aceptar el archivo (para la carpeta y el control de acceso) */
export async function prepararSubida(usuario: UsuarioAutenticado, planoId: number) {
  const plano = await prisma.plano.findUnique({ where: { id: planoId }, select: { proyectoId: true } });
  if (!plano) throw AppError.notFound('Plano no encontrado');
  await assertProjectAccess(usuario, plano.proyectoId);
  return plano.proyectoId;
}

/** Sube una nueva revisión: numeración correlativa y el plano vuelve a EN_REVISION */
export async function nuevaVersion(planoId: number, usuarioId: number, data: NuevaVersionInput, archivo?: Express.Multer.File) {
  if (!archivo) throw AppError.badRequest('Adjunta el archivo del plano en el campo "archivo"');

  return prisma.$transaction(async (tx) => {
    const ultima = await tx.planoVersion.aggregate({ where: { planoId }, _max: { revision: true } });
    const version = await tx.planoVersion.create({
      data: {
        planoId,
        revision: (ultima._max.revision ?? 0) + 1,
        archivoUrl: toStorageKey(archivo.path),
        nombreArchivo: archivo.originalname,
        tamano: archivo.size,
        comentario: data.comentario,
        usuarioId,
      },
      select: versionSelect,
    });
    await tx.plano.update({ where: { id: planoId }, data: { estado: EstadoRevision.EN_REVISION } });
    return conDescarga(version);
  });
}

export async function actualizar(id: number, data: ActualizarPlanoInput) {
  await assertResponsable(data.responsableId);
  const plano = await prisma.plano.findUnique({ where: { id }, include: { _count: { select: { versiones: true } } } });
  if (!plano) throw AppError.notFound('Plano no encontrado');
  const estadoRevisable: EstadoRevision[] = [EstadoRevision.OBSERVADO, EstadoRevision.APROBADO];
  if (data.estado && estadoRevisable.includes(data.estado) && plano._count.versiones === 0) {
    throw AppError.conflict('No se puede revisar un plano sin archivo; sube primero una versión');
  }
  // Al aprobar se limpia la observación anterior
  const observacion = data.estado === EstadoRevision.APROBADO && data.observacion === undefined ? null : data.observacion;
  return prisma.plano.update({
    where: { id },
    data: { ...data, observacion },
    include: { responsable: { select: { id: true, nombre: true } } },
  });
}

export async function obtenerArchivoVersion(usuario: UsuarioAutenticado, versionId: number) {
  const version = await prisma.planoVersion.findUnique({
    where: { id: versionId },
    include: { plano: { select: { proyectoId: true, codigo: true } } },
  });
  if (!version) throw AppError.notFound('Versión no encontrada');
  await assertProjectAccess(usuario, version.plano.proyectoId);
  if (!(await storage.exists(version.archivoUrl))) throw AppError.notFound('El archivo del plano no existe en el servidor');

  const letra = revisionLetra(version.revision);
  const ext = path.extname(version.nombreArchivo);
  return {
    ruta: storage.resolve(version.archivoUrl),
    nombreDescarga: `${version.plano.codigo}_Rev${letra}${ext}`,
  };
}

export async function eliminar(id: number) {
  const versiones = await prisma.planoVersion.findMany({ where: { planoId: id }, select: { archivoUrl: true } });
  await prisma.plano.delete({ where: { id } });
  await Promise.all(versiones.map((v) => storage.remove(v.archivoUrl)));
}

/** 1 -> A, 2 -> B, …, 27 -> AA */
export function revisionLetra(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
