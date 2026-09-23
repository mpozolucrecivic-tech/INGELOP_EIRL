import { Prisma, PrismaClient } from '@prisma/client';

// Los campos Decimal se serializan como number en las respuestas JSON
// (por defecto Prisma los envía como string). La precisión (12,2) cabe sin pérdida en un double.
(Prisma.Decimal.prototype as unknown as { toJSON(): number }).toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toNumber();
};

// Los errores de Prisma no se loguean aquí: los esperados (P2002, P2025...) se traducen a 409/404
// en errorHandler, y los inesperados los registra el propio errorHandler.
export const prisma = new PrismaClient({ log: ['warn'] });
