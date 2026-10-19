import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

/** Misma regla que al crear usuarios (bcrypt solo usa los primeros 72 bytes) */
export const nuevaContrasena = z
  .string({ required_error: 'Ingresa la nueva contraseña' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres');

export const cambiarContrasenaSchema = z
  .object({
    actual: z.string({ required_error: 'Ingresa tu contraseña actual' }).min(1, 'Ingresa tu contraseña actual'),
    nueva: nuevaContrasena,
  })
  .refine((d) => d.actual !== d.nueva, { message: 'La nueva contraseña debe ser distinta de la actual', path: ['nueva'] });

export const solicitarRecuperacionSchema = z.object({
  email: z.string({ required_error: 'Ingresa tu correo' }).trim().toLowerCase().email('Email inválido'),
});

export const restablecerContrasenaSchema = z.object({
  // 32 bytes en base64url = 43 caracteres
  token: z.string({ required_error: 'Falta el código del enlace' }).regex(/^[A-Za-z0-9_-]{43}$/, 'El enlace no es válido'),
  nueva: nuevaContrasena,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaSchema>;
export type RestablecerContrasenaInput = z.infer<typeof restablecerContrasenaSchema>;
