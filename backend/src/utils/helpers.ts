import { Prisma } from '@prisma/client';

export const toNumber = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : v.toNumber();

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Porcentaje redondeado a 2 decimales; 0 si el total es 0 */
export const porcentaje = (parte: number, total: number): number =>
  total > 0 ? round2((parte / total) * 100) : 0;

/** Clave YYYY-MM para agrupar por mes */
export const claveMes = (fecha: Date): string => fecha.toISOString().slice(0, 7);

/** Construye el filtro Prisma de un rango de fechas opcional */
export const filtroFechas = (desde?: Date, hasta?: Date): Prisma.DateTimeFilter | undefined =>
  desde || hasta ? { ...(desde && { gte: desde }), ...(hasta && { lte: hasta }) } : undefined;
