import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../../config/env';
import { correoHabilitado, enviarEnSegundoPlano, escaparHtml } from '../../config/mailer';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { UsuarioAutenticado } from '../../types/express';
import type { CambiarContrasenaInput, LoginInput, RestablecerContrasenaInput } from './auth.schema';
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

  return {
    token: firmarSesion(usuario),
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, puedeEditarWeb: usuario.puedeEditarWeb },
  };
}

function firmarSesion(usuario: { id: number; rol: UsuarioAutenticado['rol'] }) {
  const payload: UsuarioAutenticado = { id: usuario.id, rol: usuario.rol };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

// ---------- Cambio y recuperación de contraseña ----------

const BCRYPT_ROUNDS = 10;
const RECUPERACION_MIN = 30; // vigencia del enlace
const ESPERA_ENTRE_ENLACES_MS = 2 * 60_000; // evita llenar la bandeja de alguien pidiendo enlaces seguidos

/** La recuperación por correo necesita SMTP y la dirección de la intranet (para el enlace) */
export const recuperacionHabilitada = () => correoHabilitado && !!env.INTRANET_URL;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Cambio desde "Mi cuenta": exige la contraseña actual. Devuelve un token nuevo; las demás sesiones se cierran. */
export async function cambiarContrasena(id: number, { actual, nueva }: CambiarContrasenaInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario?.activo) throw AppError.unauthorized('Usuario no encontrado o inactivo');
  if (!(await bcrypt.compare(actual, usuario.passwordHash))) {
    // Mismo formato 422 que el middleware validate: el formulario lo muestra en el campo
    throw new ZodError([{ code: 'custom', path: ['body', 'actual'], message: 'La contraseña actual no es correcta' }]);
  }
  await guardarContrasena(id, nueva);
  return { token: firmarSesion(usuario), usuario };
}

/** Nueva contraseña + fecha de cambio (invalida sesiones anteriores) + anula enlaces de recuperación pendientes */
export async function guardarContrasena(usuarioId: number, nueva: string, tx: Prisma.TransactionClient = prisma) {
  const ahora = new Date();
  await tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await bcrypt.hash(nueva, BCRYPT_ROUNDS), contrasenaCambiadaEn: ahora } });
  await tx.recuperacionContrasena.updateMany({ where: { usuarioId, usadoEn: null }, data: { usadoEn: ahora } });
}

export type ResultadoSolicitud = { enviado: true; usuarioId: number; nombre: string } | { enviado: false; motivo: string; usuarioId?: number };

/**
 * "Olvidé mi contraseña". Quien llama responde siempre lo mismo, exista o no la cuenta;
 * el resultado real es solo para la auditoría. El correo se envía en segundo plano para que
 * el tiempo de respuesta tampoco revele si la cuenta existe.
 */
export async function solicitarRecuperacion(email: string, ip: string | null): Promise<ResultadoSolicitud> {
  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nombre: true, email: true, activo: true } });
  if (!usuario) return { enviado: false, motivo: 'usuario inexistente' };
  if (!usuario.activo) return { enviado: false, motivo: 'cuenta desactivada', usuarioId: usuario.id };

  const reciente = await prisma.recuperacionContrasena.findFirst({
    where: { usuarioId: usuario.id, creadoEn: { gte: new Date(Date.now() - ESPERA_ENTRE_ENLACES_MS) } },
    select: { id: true },
  });
  if (reciente) return { enviado: false, motivo: 'ya se envió un enlace hace menos de 2 minutos', usuarioId: usuario.id };

  const token = crypto.randomBytes(32).toString('base64url');
  const ahora = new Date();
  await prisma.$transaction([
    // Solo vale el último enlace enviado
    prisma.recuperacionContrasena.updateMany({ where: { usuarioId: usuario.id, usadoEn: null }, data: { usadoEn: ahora } }),
    prisma.recuperacionContrasena.create({
      data: { usuarioId: usuario.id, tokenHash: hashToken(token), expiraEn: new Date(ahora.getTime() + RECUPERACION_MIN * 60_000), ip },
    }),
  ]);

  // El token va en el fragmento (#): el navegador no lo envía al servidor ni lo deja en logs o en el Referer
  const enlace = `${env.INTRANET_URL}/restablecer-contrasena#${token}`;
  enviarEnSegundoPlano(
    {
      para: usuario.email,
      asunto: 'Restablecer tu contraseña de la intranet INGELOP',
      texto: [
        `Hola, ${usuario.nombre}:`,
        '',
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta de la intranet.',
        `Abre este enlace para elegir una nueva (vence en ${RECUPERACION_MIN} minutos y sirve una sola vez):`,
        '',
        enlace,
        '',
        'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
      ].join('\n'),
      html: `<p>Hola, ${escaparHtml(usuario.nombre)}:</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de la intranet.</p>
<p><a href="${escaparHtml(enlace)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Elegir una nueva contraseña</a></p>
<p style="color:#64748b;font-size:13px">El enlace vence en ${RECUPERACION_MIN} minutos y sirve una sola vez. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>`,
    },
    `recuperación de contraseña del usuario ${usuario.id}`,
  );
  return { enviado: true, usuarioId: usuario.id, nombre: usuario.nombre };
}

export class EnlaceInvalido extends AppError {
  constructor(public readonly motivo: string) {
    super(400, 'El enlace no es válido o ya venció. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».');
  }
}

/** Usa el enlace del correo: una sola vez, antes de que venza y solo si la cuenta sigue activa */
export async function restablecerContrasena({ token, nueva }: RestablecerContrasenaInput) {
  const solicitud = await prisma.recuperacionContrasena.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, nombre: true, email: true, activo: true } } },
  });
  if (!solicitud) throw new EnlaceInvalido('enlace inexistente');
  if (solicitud.usadoEn) throw new EnlaceInvalido('enlace ya usado o reemplazado');
  if (solicitud.expiraEn < new Date()) throw new EnlaceInvalido('enlace vencido');
  if (!solicitud.usuario.activo) throw new EnlaceInvalido('cuenta desactivada');

  await prisma.$transaction(async (tx) => {
    // Marca el uso de forma atómica: si dos pestañas lo usan a la vez, solo una gana
    const { count } = await tx.recuperacionContrasena.updateMany({ where: { id: solicitud.id, usadoEn: null }, data: { usadoEn: new Date() } });
    if (count === 0) throw new EnlaceInvalido('enlace ya usado');
    await guardarContrasena(solicitud.usuarioId, nueva, tx);
  });
  return solicitud.usuario;
}

export async function me(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioPublicoSelect });
  if (!usuario || !usuario.activo) throw AppError.unauthorized('Usuario no encontrado o inactivo');
  return usuario;
}
