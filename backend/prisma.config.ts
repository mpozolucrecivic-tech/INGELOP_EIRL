// Configuración de la CLI de Prisma 7 (migraciones, seed y conexión). Prisma 7 ya no lee .env solo.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` no se conecta: en la compilación de Docker puede faltar la variable
    url: process.env.DATABASE_URL ?? '',
  },
});
