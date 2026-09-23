import { z } from 'zod';
import { TipoCliente } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const opcional = (schema: z.ZodString) => z.preprocess(emptyToUndefined, schema.optional());

const clienteBase = z.object({
  tipo: z.nativeEnum(TipoCliente),
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(200),
  // RUC (11 dígitos) o DNI (8 dígitos)
  documento: opcional(z.string().trim().regex(/^(\d{8}|\d{11})$/, 'Debe ser un DNI (8 dígitos) o RUC (11 dígitos)')),
  contacto: opcional(z.string().trim().max(150)),
  telefono: opcional(z.string().trim().max(30)),
  email: opcional(z.string().trim().toLowerCase().email('Email inválido')),
  direccion: opcional(z.string().trim().max(300)),
});

export const crearClienteSchema = clienteBase;

export const actualizarClienteSchema = clienteBase
  .extend({ activo: z.boolean() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarClientesQuery = z.object({
  q: z.string().trim().min(1).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
export type ListarClientesQuery = z.infer<typeof listarClientesQuery>;
