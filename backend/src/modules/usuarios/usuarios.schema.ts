import { z } from 'zod';
import { Rol } from '@prisma/client';

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres');

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password,
  rol: z.nativeEnum(Rol).default(Rol.USUARIO),
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email('Email inválido'),
    password,
    rol: z.nativeEnum(Rol),
    activo: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarUsuariosQuery = z.object({
  rol: z.nativeEnum(Rol).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuery>;
