/**
 * Carga los 6 servicios iniciales de la web si no existen, sin tocar ningún otro dato.
 * Pensado para producción, donde NO se debe ejecutar el seed de demostración.
 *
 * Uso:  node dist/scripts/cargarServicios.js        (en local: npx tsx src/scripts/cargarServicios.ts)
 */
import { PrismaClient } from '@prisma/client';
import { cargarServiciosIniciales } from '../data/serviciosIniciales';

async function main() {
  const prisma = new PrismaClient();
  try {
    const creados = await cargarServiciosIniciales(prisma);
    console.log(`✅ Servicios iniciales: ${creados} creados (los existentes no se modificaron).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ No se pudieron cargar los servicios:', e);
  process.exit(1);
});
