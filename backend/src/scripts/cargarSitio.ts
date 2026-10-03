/**
 * Crea los datos de contacto de la web que falten (vacíos y OCULTOS), sin tocar nada más.
 * Después se llenan y publican desde la intranet: Página web → Datos de la empresa.
 *
 * Uso:  node dist/scripts/cargarSitio.js        (en local: npx tsx src/scripts/cargarSitio.ts)
 */
import { prisma } from '../config/prisma';
import { cargarClaves } from '../modules/sitio/sitio.service';

cargarClaves()
  .then((creados) => console.log(`✅ Datos de la web: ${creados} creados (los existentes no se modificaron).`))
  .catch((e) => {
    console.error('❌ No se pudieron crear los datos de la web:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
