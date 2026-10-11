/**
 * Borra los registros de auditoría más antiguos que AUDITORIA_RETENCION_DIAS (mínimo 730 días = 2 años)
 * y deja constancia de la purga en la propia auditoría. Es lo único que puede borrar en esa tabla.
 * Uso (por ejemplo, una vez al mes):  node dist/scripts/purgarAuditoria.js
 */
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { purgar } from '../modules/auditoria/auditoria.service';

purgar()
  .then(({ borrados, limite }) =>
    console.log(`✅ Purga completada: ${borrados} registros anteriores a ${limite.toISOString().slice(0, 10)} (conservación: ${env.AUDITORIA_RETENCION_DIAS} días).`),
  )
  .catch((e) => {
    console.error('❌ No se pudo purgar la auditoría:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
