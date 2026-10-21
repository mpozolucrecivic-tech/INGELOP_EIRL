/**
 * Carga los 6 servicios iniciales de la web si no existen, sin tocar ningún otro dato.
 * Pensado para producción, donde NO se debe ejecutar el seed de demostración.
 *
 * Uso:  node dist/scripts/cargarServicios.js        (en local: npx tsx src/scripts/cargarServicios.ts)
 */
import { cargarServiciosIniciales } from '../data/serviciosIniciales';
import { crearClientePrisma } from '../config/prismaCliente';

async function main() {
  const prisma = crearClientePrisma();
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
