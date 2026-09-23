import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { usuarioPublicoSelect } from '../auth/auth.service';
import type { ActualizarUsuarioInput, CrearUsuarioInput, ListarUsuariosQuery } from './usuarios.schema';

const BCRYPT_ROUNDS = 10;

async function assertEmailLibre(email: string, exceptoId?: number) {
  const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existente && existente.id !== exceptoId) throw AppError.conflict('El email ya está registrado');
}

/** Impide dejar el sistema sin ningún ADMIN activo */
async function assertNoEsUltimoAdmin(id: number) {
  const adminsActivos = await prisma.usuario.count({ where: { rol: Rol.ADMIN, activo: true, id: { not: id } } });
  if (adminsActivos === 0) throw AppError.conflict('Debe existir al menos un administrador activo');
}

export function listar(filtros: ListarUsuariosQuery) {
  return prisma.usuario.findMany({
    where: filtros,
    select: {
      ...usuarioPublicoSelect,
      proyectosAsignados: { select: { proyecto: { select: { id: true, nombre: true } } } },
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function crear(data: CrearUsuarioInput) {
  await assertEmailLibre(data.email);
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  return prisma.usuario.create({
    data: { nombre: data.nombre, email: data.email, rol: data.rol, passwordHash },
    select: usuarioPublicoSelect,
  });
}

export async function actualizar(id: number, data: ActualizarUsuarioInput, solicitanteId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw AppError.notFound('Usuario no encontrado');

  if (data.email) await assertEmailLibre(data.email, id);

  const pierdeAdmin = usuario.rol === Rol.ADMIN && ((data.rol && data.rol !== Rol.ADMIN) || data.activo === false);
  if (pierdeAdmin) {
    if (id === solicitanteId) throw AppError.conflict('No puedes quitarte el rol de administrador ni desactivarte');
    await assertNoEsUltimoAdmin(id);
  }

  const { password, ...resto } = data;
  return prisma.usuario.update({
    where: { id },
    data: { ...resto, ...(password && { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }) },
    select: usuarioPublicoSelect,
  });
}

/**
 * Baja lógica: el usuario queda inactivo (no puede iniciar sesión) pero se conservan
 * sus evidencias, movimientos y demás registros históricos que lo referencian.
 */
export async function eliminar(id: number, solicitanteId: number) {
  if (id === solicitanteId) throw AppError.conflict('No puedes eliminar tu propio usuario');

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw AppError.notFound('Usuario no encontrado');
  if (usuario.rol === Rol.ADMIN) await assertNoEsUltimoAdmin(id);

  await prisma.$transaction([
    prisma.usuarioProyecto.deleteMany({ where: { usuarioId: id } }),
    prisma.usuario.update({ where: { id }, data: { activo: false } }),
  ]);
}
