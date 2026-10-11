import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { UsuarioAutenticado } from '../../types/express';
import type { LoginInput } from './auth.schema';
import { fallosRecientes } from '../auditoria/auditoria.service';

/**
 * Fallo de inicio de sesión. El cliente solo recibe un mensaje genérico (no revela si el correo existe);
 * el motivo real queda solo para la auditoría.
 */
export class LoginFallido extends AppError {
  constructor(
    statusCode: number,
    message: string,
    public readonly motivo: 'credenciales' | 'usuario inexistente' | 'cuenta desactivada' | 'cuenta bloqueada',
    public readonly usuarioId: number | null = null,
  ) {
    super(statusCode, message);
  }
}

/** Campos públicos del usuario (nunca el passwordHash) */
export const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  puedeEditarWeb: true,
  creadoEn: true,
} as const;

// Hash de relleno para que un email inexistente tarde lo mismo que una contraseña incorrecta
const DUMMY_HASH = bcrypt.hashSync('dummy-password-para-timing', 10);

export async function login({ email, password }: LoginInput) {
  // Bloqueo por cuenta: cuenta también los correos que no existen, así no revela cuáles existen
  if ((await fallosRecientes(email)) >= env.LOGIN_BLOQUEO_INTENTOS) {
    throw new LoginFallido(429, `Demasiados intentos fallidos para esta cuenta. Inténtalo de nuevo en ${env.LOGIN_BLOQUEO_MIN} minutos.`, 'cuenta bloqueada');
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  const passwordOk = await bcrypt.compare(password, usuario?.passwordHash ?? DUMMY_HASH);
  if (!usuario || !passwordOk || !usuario.activo) {
    const motivo = !usuario ? 'usuario inexistente' : !passwordOk ? 'credenciales' : 'cuenta desactivada';
    throw new LoginFallido(401, 'Credenciales inválidas', motivo, usuario?.id ?? null);
  }

  const payload: UsuarioAutenticado = { id: usuario.id, rol: usuario.rol };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return {
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, puedeEditarWeb: usuario.puedeEditarWeb },
  };
}

export async function me(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioPublicoSelect });
  if (!usuario || !usuario.activo) throw AppError.unauthorized('Usuario no encontrado o inactivo');
  return usuario;
}
