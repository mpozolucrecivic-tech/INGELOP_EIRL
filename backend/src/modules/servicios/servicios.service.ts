import type { Servicio } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import type { ActualizarServicioInput, CrearServicioInput } from './servicios.schema';

/**
 * Respuesta pública: nunca expone la ruta interna del archivo.
 * fotoUrl es relativa a la URL base de la API (ej. "/servicios/3/foto?v=1696000000000");
 * ?v= cambia al actualizar el servicio para que el navegador no muestre una foto vieja.
 */
const aPublico = ({ foto, ...servicio }: Servicio) => ({
  ...servicio,
  fotoUrl: foto ? `/servicios/${servicio.id}/foto?v=${servicio.actualizadoEn.getTime()}` : null,
});

const orden = [{ orden: 'asc' as const }, { id: 'asc' as const }];

/** Web pública: solo activos, en el orden definido por la empresa */
export async function listarActivos() {
  const servicios = await prisma.servicio.findMany({ where: { activo: true }, orderBy: orden });
  return servicios.map(aPublico);
}

/** Intranet (ADMIN): todos, incluidos los inactivos */
export async function listarTodos() {
  const servicios = await prisma.servicio.findMany({ orderBy: orden });
  return servicios.map(aPublico);
}

async function buscar(id: number) {
  const servicio = await prisma.servicio.findUnique({ where: { id } });
  if (!servicio) throw AppError.notFound('Servicio no encontrado');
  return servicio;
}

export async function crear(data: CrearServicioInput) {
  // Sin orden explícito, el servicio nuevo va al final
  const ordenFinal = data.orden ?? ((await prisma.servicio.aggregate({ _max: { orden: true } }))._max.orden ?? 0) + 1;
  const servicio = await prisma.servicio.create({ data: { ...data, orden: ordenFinal } }); // slug duplicado -> 409
  return aPublico(servicio);
}

export async function actualizar(id: number, data: ActualizarServicioInput) {
  await buscar(id);
  return aPublico(await prisma.servicio.update({ where: { id }, data }));
}

/** Baja lógica: deja de mostrarse en la web, pero se conserva para poder reactivarlo */
export async function desactivar(id: number) {
  await buscar(id);
  await prisma.servicio.update({ where: { id }, data: { activo: false } });
}

/** Ruta local de la foto. Solo se sirven fotos de servicios activos (la web es pública). */
export async function obtenerFoto(id: number, incluirInactivos = false) {
  const servicio = await buscar(id);
  if ((!servicio.activo && !incluirInactivos) || !servicio.foto || !(await storage.exists(servicio.foto))) {
    throw AppError.notFound('El servicio no tiene foto');
  }
  return storage.resolve(servicio.foto);
}

/**
 * Reemplaza la foto. Si falla la BD, el middleware de subida borra el archivo nuevo;
 * si la BD se actualiza, se borra la foto anterior.
 */
export async function cambiarFoto(id: number, archivo: Express.Multer.File | undefined) {
  if (!archivo) throw AppError.badRequest('Adjunta una foto en el campo "archivo"');
  const anterior = await buscar(id);
  const servicio = await prisma.servicio.update({ where: { id }, data: { foto: toStorageKey(archivo.path) } });
  if (anterior.foto) await storage.remove(anterior.foto).catch(() => {});
  return aPublico(servicio);
}

/** Quita la foto: la web vuelve a mostrar el icono */
export async function quitarFoto(id: number) {
  const anterior = await buscar(id);
  const servicio = await prisma.servicio.update({ where: { id }, data: { foto: null } });
  if (anterior.foto) await storage.remove(anterior.foto).catch(() => {});
  return aPublico(servicio);
}
