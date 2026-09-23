import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { UsuarioAutenticado } from '../../types/express';
import type { LoginInput } from './auth.schema';

/** Campos públicos del usuario (nunca el passwordHash) */
export const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

// Hash de relleno para que un email inexistente tarde lo mismo que una contraseña incorrecta
const DUMMY_HASH = bcrypt.hashSync('dummy-password-para-timing', 10);

export async function login({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  const passwordOk = await bcrypt.compare(password, usuario?.passwordHash ?? DUMMY_HASH);
  if (!usuario || !passwordOk || !usuario.activo) {
    throw AppError.unauthorized('Credenciales inválidas');
  }

  const payload: UsuarioAutenticado = { id: usuario.id, rol: usuario.rol };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return {
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  };
}

export async function me(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioPublicoSelect });
  if (!usuario || !usuario.activo) throw AppError.unauthorized('Usuario no encontrado o inactivo');
  return usuario;
}
