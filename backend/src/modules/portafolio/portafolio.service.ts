import type { ProyectoWeb } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage, toStorageKey } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import type { ActualizarProyectoWebInput, CrearProyectoWebInput } from './portafolio.schema';

/** Nunca expone la ruta interna: fotoUrl es relativa a la URL de la API y cambia con ?v= al editar */
const aPublico = ({ foto, ...p }: ProyectoWeb) => ({
  ...p,
  fotoUrl: foto ? `/portafolio/${p.id}/foto?v=${p.actualizadoEn.getTime()}` : null,
});

const orden = [{ orden: 'asc' as const }, { id: 'asc' as const }];

/** Web pública: solo los activos, en el orden definido */
export async function listarPublicos() {
  return (await prisma.proyectoWeb.findMany({ where: { activo: true }, orderBy: orden })).map(aPublico);
}

/** Intranet (ADMIN): todos, incluidos los ocultos */
export async function listarTodos() {
  return (await prisma.proyectoWeb.findMany({ orderBy: orden })).map(aPublico);
}

async function buscar(id: number) {
  const proyecto = await prisma.proyectoWeb.findUnique({ where: { id } });
  if (!proyecto) throw AppError.notFound('Proyecto realizado no encontrado');
  return proyecto;
}

export async function crear(data: CrearProyectoWebInput) {
  const ordenFinal = data.orden ?? ((await prisma.proyectoWeb.aggregate({ _max: { orden: true } }))._max.orden ?? 0) + 1;
  return aPublico(await prisma.proyectoWeb.create({ data: { ...data, orden: ordenFinal } }));
}

export async function actualizar(id: number, data: ActualizarProyectoWebInput) {
  await buscar(id);
  return aPublico(await prisma.proyectoWeb.update({ where: { id }, data }));
}

/** Baja lógica: deja de verse en la web, pero se conserva */
export async function ocultar(id: number) {
  await buscar(id);
  await prisma.proyectoWeb.update({ where: { id }, data: { activo: false } });
}

/** Ruta local de la foto. Solo se sirven fotos de proyectos activos (la web es pública). */
export async function obtenerFoto(id: number) {
  const p = await buscar(id);
  if (!p.activo || !p.foto || !(await storage.exists(p.foto))) throw AppError.notFound('El proyecto no tiene foto');
  return storage.resolve(p.foto);
}

/** Reemplaza la foto. Si falla la BD, el middleware borra el archivo nuevo; si no, se borra la anterior. */
export async function cambiarFoto(id: number, archivo: Express.Multer.File | undefined) {
  if (!archivo) throw AppError.badRequest('Adjunta una foto en el campo "archivo"');
  const anterior = await buscar(id);
  const p = await prisma.proyectoWeb.update({ where: { id }, data: { foto: toStorageKey(archivo.path) } });
  if (anterior.foto) await storage.remove(anterior.foto).catch(() => {});
  return aPublico(p);
}

export async function quitarFoto(id: number) {
  const anterior = await buscar(id);
  const p = await prisma.proyectoWeb.update({ where: { id }, data: { foto: null } });
  if (anterior.foto) await storage.remove(anterior.foto).catch(() => {});
  return aPublico(p);
}
