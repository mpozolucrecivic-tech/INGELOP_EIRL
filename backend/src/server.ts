import fs from 'node:fs';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { app } from './app';

async function main() {
  fs.mkdirSync(env.UPLOAD_PATH, { recursive: true });
  await prisma.$connect();

  const server = app.listen(env.PORT, () => {
    console.log(`🚧 API INGELOP escuchando en http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} recibido, cerrando servidor...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  console.error('❌ No se pudo iniciar el servidor:', err);
  await prisma.$disconnect();
  process.exit(1);
});
