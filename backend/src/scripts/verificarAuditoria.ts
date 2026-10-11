/**
 * Comprueba que nadie alteró la auditoría: recalcula la huella de cada fila y su enlace con la anterior.
 * Uso:  node dist/scripts/verificarAuditoria.js      (en local: npx tsx src/scripts/verificarAuditoria.ts)
 * Sale con código 1 si encuentra filas alteradas, borradas o insertadas a mano.
 */
import { prisma } from '../config/prisma';
import { verificarCadena } from '../modules/auditoria/auditoria.service';

verificarCadena()
  .then((r) => {
    if (r.correcta) {
      console.log(`✅ Auditoría íntegra: ${r.revisados} registros verificados.`);
    } else {
      console.error(`❌ Auditoría ALTERADA: ${r.errores.length} problema(s) en ${r.revisados} registros.`);
      for (const e of r.errores) console.error(`   - registro ${e.id}: ${e.problema}`);
      process.exitCode = 1;
    }
  })
  .catch((e) => {
    console.error('❌ No se pudo verificar la auditoría:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
