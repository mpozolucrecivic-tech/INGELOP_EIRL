import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Cliente de Prisma 7 con el driver pg. Valores como los de Prisma 6: 5 s para conectar y un pool pequeño
 * (Neon y el plan gratuito de Render admiten pocas conexiones). SSL se toma de la URL (?sslmode=require).
 * Lo usan la API y los scripts de mantenimiento, que no cargan toda la configuración (env.ts).
 */
export function crearClientePrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Falta DATABASE_URL');
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5_000, max: 10, idleTimeoutMillis: 300_000 });
  return new PrismaClient({ adapter, log: ['warn'] });
}
