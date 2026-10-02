import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(50),
  MAX_FOTO_MB: z.coerce.number().positive().default(5),
  // Detrás de un proxy (Render, Caddy) hay que confiar en él para conocer la IP real del visitante
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  // Límite de peticiones: ventana en minutos y máximo por IP
  RATE_LIMIT_VENTANA_MIN: z.coerce.number().positive().default(15),
  RATE_LIMIT_CONTACTO: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  UPLOAD_PATH: path.resolve(process.cwd(), parsed.data.UPLOAD_DIR),
};
