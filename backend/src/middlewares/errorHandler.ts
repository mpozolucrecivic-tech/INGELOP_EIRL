import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const formatZodError = (error: ZodError) =>
  error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ message: err.message, ...(err.details !== undefined && { details: err.details }) });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({ message: 'Error de validación', errors: formatZodError(err) });
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `El archivo supera el máximo de ${env.MAX_UPLOAD_MB} MB` });
    }
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const campos = (err.meta?.target as string[] | undefined)?.join(', ');
        return res
          .status(409)
          .json({ message: `Ya existe un registro con el mismo valor${campos ? ` (${campos})` : ''}` });
      }
      case 'P2003':
        return res
          .status(409)
          .json({ message: 'La operación viola una relación entre registros (referencia inexistente o en uso)' });
      case 'P2025':
        return res.status(404).json({ message: 'Recurso no encontrado' });
    }
  }

  // Errores de body-parser (express.json)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON mal formado en el cuerpo de la petición' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande' });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({
    message: 'Error interno del servidor',
    ...(env.NODE_ENV === 'development' && err instanceof Error && { error: err.message }),
  });
};
