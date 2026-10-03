import { prisma } from '../../config/prisma';
import { CLAVES_SITIO, type ClaveSitio, type GuardarSitioInput } from './sitio.schema';
import { listarPublicos as proyectosPublicos } from '../portafolio/portafolio.service';

/** Intranet (ADMIN): todos los datos, en el orden fijo de las claves, con su estado */
export async function listar() {
  const filas = await prisma.datoSitio.findMany();
  const porClave = new Map(filas.map((f) => [f.clave, f]));
  return CLAVES_SITIO.map((clave) => {
    const f = porClave.get(clave);
    return { clave, valor: f?.valor ?? '', publicado: f?.publicado ?? false, actualizadoEn: f?.actualizadoEn ?? null };
  });
}

export async function guardar({ datos }: GuardarSitioInput) {
  await prisma.$transaction(
    datos.map(({ clave, valor, publicado }) =>
      prisma.datoSitio.upsert({ where: { clave }, update: { valor, publicado }, create: { clave, valor, publicado } }),
    ),
  );
  return listar();
}

/**
 * Web pública: SOLO los datos publicados y con valor, más los proyectos realizados activos.
 * Es una sola respuesta para que cada página de la web haga una sola petición.
 */
export async function contenidoWeb() {
  const [filas, proyectos] = await Promise.all([
    prisma.datoSitio.findMany({ where: { publicado: true, valor: { not: '' } } }),
    proyectosPublicos(),
  ]);
  const datos: Partial<Record<ClaveSitio, string>> = {};
  for (const f of filas) if ((CLAVES_SITIO as string[]).includes(f.clave)) datos[f.clave as ClaveSitio] = f.valor;
  return { datos, proyectos };
}

/** Crea las claves que falten (vacías y ocultas). Nunca modifica las existentes. */
export async function cargarClaves() {
  const { count } = await prisma.datoSitio.createMany({
    data: CLAVES_SITIO.map((clave) => ({ clave, valor: '', publicado: false })),
    skipDuplicates: true,
  });
  return count;
}
