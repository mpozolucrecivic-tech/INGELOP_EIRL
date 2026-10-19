import { EstadoAmpliacion, EstadoObservacion, Prisma, Rol, TipoCorrespondencia } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import { verificarFirmaArchivo } from '../../utils/firmaArchivo';
import type { UsuarioAutenticado } from '../../types/express';
import { hoyEnLima } from '../notificaciones/notificaciones.service';
import {
  CAMPOS_EQUIPO,
  ESTADOS_EQUIPO,
  type ActualizarAmpliacionInput,
  type ActualizarCorrespondenciaInput,
  type ActualizarObservacionInput,
  type CrearAmpliacionInput,
  type CrearCorrespondenciaInput,
  type CrearObservacionInput,
  type ListarCorrespondenciaQuery,
  type ListarObservacionesQuery,
  type ResolverAmpliacionInput,
} from './contrato.schema';

const DIA_MS = 86_400_000;
const sumarDias = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA_MS);
const diasEntre = (desde: Date, hasta: Date) => Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);
/** Mismo formato 422 que el middleware validate */
const invalido = (campo: string, message: string) => new ZodError([{ code: 'custom', path: ['body', campo], message }]);
const ABIERTAS: EstadoObservacion[] = [EstadoObservacion.PENDIENTE, EstadoObservacion.EN_PROCESO];

/** Siguiente correlativo dentro del proyecto (el índice único evita duplicados si dos personas registran a la vez) */
async function siguiente(modelo: 'observacionEntidad' | 'ampliacionPlazo', proyectoId: number) {
  const agg =
    modelo === 'observacionEntidad'
      ? await prisma.observacionEntidad.aggregate({ where: { proyectoId }, _max: { numero: true } })
      : await prisma.ampliacionPlazo.aggregate({ where: { proyectoId }, _max: { numero: true } });
  return (agg._max.numero ?? 0) + 1;
}

// ---------- Observaciones de la entidad ----------

const incluirObservacion = {
  responsable: { select: { id: true, nombre: true } },
  etapa: { select: { id: true, tipo: true } },
  correspondencia: { select: { id: true, numero: true } },
} as const;

function conPlazo<T extends { estado: EstadoObservacion; fechaLimite: Date | null }>(o: T, hoy = hoyEnLima()) {
  const abierta = ABIERTAS.includes(o.estado);
  return { ...o, diasParaVencer: abierta && o.fechaLimite ? diasEntre(hoy, o.fechaLimite) : null };
}

/** La etapa, la carta y el responsable deben ser del mismo proyecto (el responsable, con acceso a él) */
async function validarReferenciasObservacion(proyectoId: number, d: { etapaId?: number | null; correspondenciaId?: number | null; responsableId?: number | null }) {
  if (d.etapaId) {
    const etapa = await prisma.etapa.findUnique({ where: { id: d.etapaId }, select: { proyectoId: true } });
    if (etapa?.proyectoId !== proyectoId) throw invalido('etapaId', 'La etapa no pertenece a este proyecto');
  }
  if (d.correspondenciaId) {
    const carta = await prisma.correspondencia.findUnique({ where: { id: d.correspondenciaId }, select: { proyectoId: true } });
    if (carta?.proyectoId !== proyectoId) throw invalido('correspondenciaId', 'La carta no pertenece a este proyecto');
  }
  if (d.responsableId) {
    const u = await prisma.usuario.findUnique({ where: { id: d.responsableId }, select: { id: true, rol: true, activo: true } });
    if (!u?.activo) throw invalido('responsableId', 'El responsable no existe o está inactivo');
    if (u.rol !== Rol.ADMIN) {
      await assertProjectAccess({ id: u.id, rol: u.rol }, proyectoId).catch(() => {
        throw invalido('responsableId', 'El responsable no tiene acceso a este proyecto');
      });
    }
  }
}

export async function listarObservaciones(proyectoId: number, { estado }: ListarObservacionesQuery) {
  const hoy = hoyEnLima();
  const todas = await prisma.observacionEntidad.findMany({ where: { proyectoId }, include: incluirObservacion, orderBy: { numero: 'desc' } });
  const observaciones = todas.map((o) => conPlazo(o, hoy)).filter((o) => !estado || (estado === 'ABIERTAS' ? ABIERTAS.includes(o.estado) : o.estado === estado));
  const abiertas = todas.filter((o) => ABIERTAS.includes(o.estado));
  return {
    resumen: {
      total: todas.length,
      abiertas: abiertas.length,
      vencidas: abiertas.filter((o) => o.fechaLimite && o.fechaLimite < hoy).length,
      levantadas: todas.filter((o) => o.estado === EstadoObservacion.LEVANTADA).length,
    },
    observaciones,
  };
}

export async function crearObservacion(proyectoId: number, data: CrearObservacionInput) {
  await validarReferenciasObservacion(proyectoId, data);
  const levantada = data.estado === EstadoObservacion.LEVANTADA;
  const observacion = await prisma.observacionEntidad.create({
    data: {
      ...data,
      ...(levantada && !data.fechaRespuesta && { fechaRespuesta: hoyEnLima() }),
      proyectoId,
      numero: await siguiente('observacionEntidad', proyectoId),
    },
    include: incluirObservacion,
  }); // correlativo repetido por una carrera -> P2002 -> 409
  return conPlazo(observacion);
}

export async function actualizarObservacion(usuario: UsuarioAutenticado, id: number, data: ActualizarObservacionInput) {
  const actual = await prisma.observacionEntidad.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Observación no encontrada');
  await assertProjectAccess(usuario, actual.proyectoId);

  if (usuario.rol !== Rol.ADMIN) {
    const ajenos = Object.keys(data).filter((c) => !(CAMPOS_EQUIPO as readonly string[]).includes(c));
    if (ajenos.length) throw AppError.forbidden('Solo puedes cambiar el estado (pendiente o en proceso) y redactar la respuesta');
    if (!ABIERTAS.includes(actual.estado)) throw AppError.forbidden('La observación ya está cerrada; solo la jefatura puede reabrirla');
    if (data.estado && !ESTADOS_EQUIPO.includes(data.estado)) throw AppError.forbidden('Solo la jefatura marca una observación como levantada o que no procede');
  }

  await validarReferenciasObservacion(actual.proyectoId, data);
  const recepcion = data.fechaRecepcion ?? actual.fechaRecepcion;
  const limite = data.fechaLimite === undefined ? actual.fechaLimite : data.fechaLimite;
  if (limite && limite < recepcion) throw invalido('fechaLimite', 'El plazo no puede ser anterior a la recepción');

  const pasaALevantada = data.estado === EstadoObservacion.LEVANTADA && actual.estado !== EstadoObservacion.LEVANTADA;
  const fechaRespuesta = data.fechaRespuesta === undefined ? actual.fechaRespuesta : data.fechaRespuesta;
  return conPlazo(
    await prisma.observacionEntidad.update({
      where: { id },
      data: { ...data, ...(pasaALevantada && !fechaRespuesta && { fechaRespuesta: hoyEnLima() }) },
      include: incluirObservacion,
    }),
  );
}

export async function eliminarObservacion(id: number) {
  await prisma.observacionEntidad.delete({ where: { id } }); // inexistente -> P2025 -> 404
}

// ---------- Correspondencia ----------

const incluirCorrespondencia = {
  respondeA: { select: { id: true, numero: true } },
  respuestas: { select: { id: true, numero: true } },
  usuario: { select: { id: true, nombre: true } },
} as const;

/** Sin la ruta interna del archivo: solo si tiene uno y cómo descargarlo */
function aPublica<T extends { id: number; ruta: string | null }>({ ruta, ...c }: T) {
  return { ...c, tieneArchivo: !!ruta, descargaUrl: ruta ? `/api/v1/correspondencia/${c.id}/archivo` : null };
}

async function validarRespondeA(proyectoId: number, respondeAId: number | null | undefined, propioId?: number) {
  if (!respondeAId) return;
  if (respondeAId === propioId) throw invalido('respondeAId', 'Un documento no puede responderse a sí mismo');
  const otra = await prisma.correspondencia.findUnique({ where: { id: respondeAId }, select: { proyectoId: true } });
  if (otra?.proyectoId !== proyectoId) throw invalido('respondeAId', 'El documento al que responde no es de este proyecto');
}

export async function listarCorrespondencia(proyectoId: number, { tipo, q }: ListarCorrespondenciaQuery) {
  const where: Prisma.CorrespondenciaWhereInput = {
    proyectoId,
    ...(tipo && { tipo }),
    ...(q && {
      OR: [
        { numero: { contains: q, mode: 'insensitive' } },
        { asunto: { contains: q, mode: 'insensitive' } },
        { entidad: { contains: q, mode: 'insensitive' } },
        { referencia: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };
  const cartas = await prisma.correspondencia.findMany({ where, include: incluirCorrespondencia, orderBy: [{ fecha: 'desc' }, { id: 'desc' }] });
  return cartas.map(aPublica);
}

/** Sugerencia para la próxima carta enviada: correlativo del año en toda la empresa (NNN-AAAA) */
export async function siguienteNumeroCarta() {
  const anio = hoyEnLima().getUTCFullYear();
  const enviadas = await prisma.correspondencia.count({
    where: { tipo: TipoCorrespondencia.ENVIADA, fecha: { gte: new Date(Date.UTC(anio, 0, 1)), lt: new Date(Date.UTC(anio + 1, 0, 1)) } },
  });
  return { sugerido: `${String(enviadas + 1).padStart(3, '0')}-${anio}` };
}

export async function crearCorrespondencia(usuarioId: number, proyectoId: number, data: CrearCorrespondenciaInput, archivo?: Express.Multer.File) {
  if (archivo) await verificarFirmaArchivo(archivo.path, archivo.originalname);
  await validarRespondeA(proyectoId, data.respondeAId);
  const carta = await prisma.correspondencia.create({
    data: {
      ...data,
      proyectoId,
      usuarioId,
      ...(archivo && { ruta: toStorageKey(archivo.path), nombreArchivo: archivo.originalname, tamano: archivo.size, tipoArchivo: archivo.mimetype }),
    },
    include: incluirCorrespondencia,
  });
  return aPublica(carta);
}

export async function actualizarCorrespondencia(id: number, data: ActualizarCorrespondenciaInput) {
  const actual = await prisma.correspondencia.findUnique({ where: { id }, select: { proyectoId: true } });
  if (!actual) throw AppError.notFound('Documento no encontrado');
  await validarRespondeA(actual.proyectoId, data.respondeAId, id);
  return aPublica(await prisma.correspondencia.update({ where: { id }, data, include: incluirCorrespondencia }));
}

export async function obtenerArchivoCorrespondencia(usuario: UsuarioAutenticado, id: number) {
  const carta = await prisma.correspondencia.findUnique({ where: { id }, select: { proyectoId: true, ruta: true, nombreArchivo: true } });
  if (!carta) throw AppError.notFound('Documento no encontrado');
  await assertProjectAccess(usuario, carta.proyectoId);
  if (!carta.ruta || !(await storage.exists(carta.ruta))) throw AppError.notFound('Este documento no tiene archivo');
  return { ruta: carta.ruta, nombre: carta.nombreArchivo ?? 'documento' };
}

/** Borra el registro y luego su archivo (si el archivo no se puede borrar, solo queda en el log) */
export async function eliminarCorrespondencia(id: number) {
  const carta = await prisma.correspondencia.delete({ where: { id } }); // inexistente -> P2025 -> 404
  if (carta.ruta) await storage.remove(carta.ruta).catch((e) => console.error('[CORRESPONDENCIA] No se pudo borrar el archivo', carta.ruta, e));
}

// ---------- Plazo y ampliaciones ----------

export async function listarAmpliaciones(proyectoId: number) {
  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { fechaInicio: true, fechaFin: true } });
  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');
  const ampliaciones = await prisma.ampliacionPlazo.findMany({ where: { proyectoId }, orderBy: { numero: 'desc' } });
  const diasAmpliados = ampliaciones.filter((a) => a.estado === EstadoAmpliacion.APROBADA).reduce((s, a) => s + (a.diasAprobados ?? 0), 0);
  const hoy = hoyEnLima();
  const fechaFinOriginal = sumarDias(proyecto.fechaFin, -diasAmpliados);
  return {
    plazo: {
      fechaInicio: proyecto.fechaInicio,
      fechaFinOriginal,
      fechaFin: proyecto.fechaFin, // vigente (con las ampliaciones aprobadas)
      diasAmpliados,
      plazoOriginalDias: diasEntre(proyecto.fechaInicio, fechaFinOriginal),
      plazoVigenteDias: diasEntre(proyecto.fechaInicio, proyecto.fechaFin),
      diasRestantes: diasEntre(hoy, proyecto.fechaFin), // negativo: plazo vencido
    },
    ampliaciones,
  };
}

export async function crearAmpliacion(proyectoId: number, data: CrearAmpliacionInput) {
  return prisma.ampliacionPlazo.create({ data: { ...data, proyectoId, numero: await siguiente('ampliacionPlazo', proyectoId) } });
}

async function buscarAmpliacion(id: number) {
  const a = await prisma.ampliacionPlazo.findUnique({ where: { id } });
  if (!a) throw AppError.notFound('Ampliación no encontrada');
  return a;
}

export async function actualizarAmpliacion(id: number, data: ActualizarAmpliacionInput) {
  const a = await buscarAmpliacion(id);
  if (a.estado !== EstadoAmpliacion.SOLICITADA) throw AppError.conflict('Solo se edita una ampliación que aún no se resuelve');
  return prisma.ampliacionPlazo.update({ where: { id }, data });
}

/** Aprobar corre la fecha de fin del proyecto los días aprobados; denegar no la cambia */
export async function resolverAmpliacion(id: number, data: ResolverAmpliacionInput) {
  const a = await buscarAmpliacion(id);
  if (a.estado !== EstadoAmpliacion.SOLICITADA) throw AppError.conflict('La ampliación ya fue resuelta');
  if (data.fechaResolucion < a.fechaSolicitud) throw invalido('fechaResolucion', 'La resolución no puede ser anterior a la solicitud');
  const aprobada = data.estado === EstadoAmpliacion.APROBADA;
  return prisma.$transaction(async (tx) => {
    // Atómico: si dos personas resuelven a la vez, solo una corre la fecha
    const { count } = await tx.ampliacionPlazo.updateMany({
      where: { id, estado: EstadoAmpliacion.SOLICITADA },
      data: { estado: data.estado, diasAprobados: aprobada ? data.diasAprobados : null, fechaResolucion: data.fechaResolucion, documentoResolucion: data.documentoResolucion },
    });
    if (count === 0) throw AppError.conflict('La ampliación ya fue resuelta');
    if (aprobada) {
      const p = await tx.proyecto.findUniqueOrThrow({ where: { id: a.proyectoId }, select: { fechaFin: true } });
      await tx.proyecto.update({ where: { id: a.proyectoId }, data: { fechaFin: sumarDias(p.fechaFin, data.diasAprobados!) } });
    }
    return tx.ampliacionPlazo.findUniqueOrThrow({ where: { id } });
  });
}

/** Si estaba aprobada, la fecha de fin del proyecto vuelve atrás los días que se habían sumado */
export async function eliminarAmpliacion(id: number) {
  await prisma.$transaction(async (tx) => {
    const a = await tx.ampliacionPlazo.delete({ where: { id } }); // inexistente -> P2025 -> 404
    if (a.estado === EstadoAmpliacion.APROBADA && a.diasAprobados) {
      const p = await tx.proyecto.findUniqueOrThrow({ where: { id: a.proyectoId }, select: { fechaFin: true } });
      await tx.proyecto.update({ where: { id: a.proyectoId }, data: { fechaFin: sumarDias(p.fechaFin, -a.diasAprobados) } });
    }
  });
}

/** Responsable antes de un cambio (para avisar solo si cambia) */
export async function responsableObservacion(id: number) {
  return (await prisma.observacionEntidad.findUnique({ where: { id }, select: { responsableId: true } }))?.responsableId ?? null;
}
