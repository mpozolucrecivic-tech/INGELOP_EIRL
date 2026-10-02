/**
 * Crea (o reactiva y cambia la contraseña de) un usuario ADMIN, sin tocar ningún otro dato.
 * Pensado para producción, donde NO se debe ejecutar el seed de demostración.
 *
 * Uso en el servidor:
 *   docker compose ... exec -e ADMIN_PASSWORD='<clave-segura>' api \
 *     node dist/scripts/crearAdmin.js admin@tudominio.pe "Nombre Apellido"
 */
import bcrypt from 'bcryptjs';
import { PrismaClient, Rol } from '@prisma/client';

async function main() {
  const [email, nombre = 'Administrador'] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Uso: node dist/scripts/crearAdmin.js <email> "<nombre>"   (contraseña en la variable ADMIN_PASSWORD)');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.upsert({
      where: { email: email.toLowerCase() },
      update: { nombre, passwordHash, rol: Rol.ADMIN, activo: true },
      create: { nombre, email: email.toLowerCase(), passwordHash, rol: Rol.ADMIN },
    });
    console.log(`✅ Administrador listo: ${usuario.email} (id ${usuario.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ No se pudo crear el administrador:', e);
  process.exit(1);
});
