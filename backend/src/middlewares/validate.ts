import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { formatZodError } from './errorHandler';

interface ValidationSchemas {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
}

/**
 * Valida params/query/body con Zod antes de llegar al controller.
 * Reemplaza cada parte por su versión parseada (tipos coercionados, valores por defecto, campos desconocidos eliminados).
 * Responde 422 con el detalle de los campos inválidos.
 */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, res, next) => {
    const errors: { campo: string; mensaje: string }[] = [];

    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        for (const e of formatZodError(result.error)) {
          errors.push({ campo: e.campo ? `${key}.${e.campo}` : key, mensaje: e.mensaje });
        }
        continue;
      }
      // En Express 5 req.query es un getter de solo lectura: se redefine la propiedad
      Object.defineProperty(req, key, { value: result.data, writable: true, enumerable: true, configurable: true });
    }

    if (errors.length) {
      return res.status(422).json({ message: 'Error de validación', errors });
    }
    next();
  };
