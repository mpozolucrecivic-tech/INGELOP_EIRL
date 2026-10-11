import jwt from 'jsonwebtoken';
import { open } from 'node:fs/promises';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { storage, toStorageKey } from '../../config/storage';
import { contenidoSchema, type ContenidoCms } from './cms.schema';
import { predeterminados } from './cms.defaults';
import { esImagenPermitida } from './cms.images';

export async function listar() {
  const guardados = await prisma.documentoCms.findMany({ orderBy: { clave: 'asc' } });
  const claves = new Set(guardados.map((d) => d.clave));
  return [...guardados, ...Object.entries(predeterminados).filter(([c]) => !claves.has(c)).map(([clave, borrador]) =>
    ({ clave, borrador, publicado: null, version: 0, publicadoEn: null, actualizadoEn: null }))];
}

async function validarContenido(clave: string, contenido: ContenidoCms) {
  if (clave !== (contenido.tipo === 'pagina' ? `pagina.${contenido.slug}` : 'configuracion'))
    throw AppError.badRequest('La clave no coincide con el contenido');
  const ids = contenido.tipo === 'pagina'
    ? [contenido.imagenSocialId, ...contenido.bloques.map((b) => b.medioId)] : [contenido.logoId];
  const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
  if (unicos.length && await prisma.medioCms.count({ where: { id: { in: unicos } } }) !== unicos.length)
    throw AppError.badRequest('Una de las imágenes seleccionadas ya no existe');
}

/** Control optimista: dos editores no pueden sobrescribir sus cambios silenciosamente. */
export async function cambiar(clave: string, version: number, autorId: number, accion: 'GUARDAR' | 'PUBLICAR' | 'RETIRAR' | 'RESTAURAR', contenido?: ContenidoCms, revisionId?: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const autor = await tx.usuario.findUniqueOrThrow({ where: { id: autorId }, select: { nombre: true } });
      const actual = await tx.documentoCms.findUnique({ where: { clave } });
      if ((actual?.version ?? 0) !== version) throw AppError.conflict('Otra persona cambió este documento. Recarga antes de guardar.');
      if (!actual && accion !== 'GUARDAR') throw AppError.notFound('Guarda primero el borrador');
      let siguiente = contenido ?? (actual?.borrador as ContenidoCms);
      if (accion === 'RESTAURAR') {
        const revision = await tx.revisionCms.findFirst({ where: { id: revisionId, documentoClave: clave } });
        if (!revision) throw AppError.notFound('Revisión no encontrada');
        siguiente = contenidoSchema.parse(revision.contenido);
      }
      siguiente = contenidoSchema.parse(siguiente);
      await validarContenido(clave, siguiente);
      const json = siguiente as Prisma.InputJsonValue;
      const datos = {
        borrador: json, version: version + 1,
        ...(accion === 'PUBLICAR' ? { publicado: json, publicadoEn: new Date() } : {}),
        ...(accion === 'RETIRAR' ? { publicado: Prisma.DbNull, publicadoEn: null } : {}),
      };
      if (actual) {
        const r = await tx.documentoCms.updateMany({ where: { clave, version }, data: datos });
        if (!r.count) throw AppError.conflict('Otra persona cambió este documento. Recarga antes de guardar.');
      } else await tx.documentoCms.create({ data: { clave, ...datos } });
      await tx.revisionCms.create({ data: { documentoClave: clave, contenido: json, accion, autorId, autorNombre: autor.nombre } });
      return tx.documentoCms.findUniqueOrThrow({ where: { clave } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      throw AppError.conflict('Otra persona creó este documento. Recarga antes de guardar.');
    throw err;
  }
}

export function historial(clave: string) {
  return prisma.revisionCms.findMany({ where: { documentoClave: clave }, orderBy: { id: 'desc' }, take: 100 });
}

export async function publicados() {
  const documentos = await prisma.documentoCms.findMany({ where: { publicado: { not: Prisma.DbNull } }, select: { clave: true, publicado: true } });
  return Object.fromEntries(documentos.map((d) => [d.clave, d.publicado]));
}

export async function mediosPublicados() {
  const docs = Object.values(await publicados()).map((d) => contenidoSchema.parse(d));
  const ids = docs.flatMap((d) => d.tipo === 'pagina' ? [d.imagenSocialId, ...d.bloques.filter((b) => b.visible).map((b) => b.medioId)] : [d.logoId])
    .filter((id): id is number => id !== null);
  return (await prisma.medioCms.findMany({ where: { id: { in: ids } } })).map(medioPublico);
}

export async function crearVistaPrevia(clave: string, version: number, autorId: number) {
  const doc = await prisma.documentoCms.findUnique({ where: { clave } });
  if (!doc || doc.version !== version) throw AppError.conflict('Guarda el borrador antes de abrir la vista previa');
  const token = jwt.sign({ purpose: 'cms-preview', clave, version, autorId }, env.JWT_SECRET, { expiresIn: '10m' });
  const contenido = contenidoSchema.parse(doc.borrador);
  const slug = contenido.tipo === 'pagina' ? contenido.slug : 'inicio';
  return { url: `${env.CMS_WEB_URL.replace(/\/$/, '')}/${slug === 'contacto' ? 'contacto.php?' : `pagina.php?slug=${slug}&`}vista_previa=${token}`, minutos: 10 };
}

export async function leerVistaPrevia(token: string) {
  let payload: jwt.JwtPayload;
  try {
    const p = jwt.verify(token, env.JWT_SECRET);
    if (typeof p === 'string' || p.purpose !== 'cms-preview' || typeof p.clave !== 'string' || typeof p.autorId !== 'number') throw new Error();
    payload = p;
  } catch { throw AppError.unauthorized('La vista previa expiró o no es válida'); }
  const autor = await prisma.usuario.findUnique({ where: { id: payload.autorId } });
  if (!autor?.activo || (autor.rol !== 'ADMIN' && !autor.puedeEditarWeb)) throw AppError.forbidden();
  const doc = await prisma.documentoCms.findUnique({ where: { clave: payload.clave } });
  if (!doc || doc.version !== payload.version) throw AppError.conflict('El borrador cambió. Genera otra vista previa');
  return { clave: doc.clave, contenido: doc.borrador };
}

const medioPublico = ({ archivo, ...m }: { archivo: string; id: number; nombre: string; textoAlternativo: string; tamano: number; creadoEn: Date }) =>
  ({ ...m, url: `/cms/medios/${m.id}/archivo` });
export async function medios() {
  return (await prisma.medioCms.findMany({ orderBy: { id: 'desc' } })).map(medioPublico);
}
export async function subirMedio(archivo?: Express.Multer.File) {
  if (!archivo) throw AppError.badRequest('Adjunta una imagen');
  const handle = await open(archivo.path, 'r');
  try {
    const firma = Buffer.alloc(12);
    const { bytesRead } = await handle.read(firma, 0, 12, 0);
    if (!esImagenPermitida(firma.subarray(0, bytesRead), archivo.mimetype)) throw AppError.badRequest('El archivo no corresponde a una imagen JPG, PNG o WEBP');
  } finally { await handle.close(); }
  return medioPublico(await prisma.medioCms.create({ data: { archivo: toStorageKey(archivo.path), nombre: archivo.originalname, tamano: archivo.size } }));
}
export async function archivoMedio(id: number, preview = false) {
  const medio = await prisma.medioCms.findUnique({ where: { id } });
  if (!medio || !(await storage.exists(medio.archivo))) throw AppError.notFound('Imagen no encontrada');
  if (!preview) {
    const docs = Object.values(await publicados()).map((d) => contenidoSchema.parse(d));
    const usado = docs.some((d) => d.tipo === 'pagina'
      ? d.imagenSocialId === id || d.bloques.some((b) => b.visible && b.medioId === id)
      : d.logoId === id);
    if (!usado) throw AppError.notFound('Imagen no publicada');
  }
  return storage.resolve(medio.archivo);
}
