import type { PrismaClient } from '@prisma/client';

/**
 * Los 6 servicios de INGELOP, con los mismos textos, iconos y slugs que la web (web/includes/config.php).
 * Si la API no responde, la web muestra esa copia fija: conviene mantener ambas iguales.
 */
export const SERVICIOS_INICIALES = [
  {
    slug: 'preinversion', icono: 'lupa', nombre: 'Estudios de preinversión',
    descripcion: 'Fichas técnicas y estudios de perfil para proyectos de inversión pública en el marco de Invierte.pe.',
    items: ['Diagnóstico y levantamiento de información', 'Planteamiento técnico de alternativas', 'Costos, evaluación social y sostenibilidad'],
  },
  {
    slug: 'expedientes', icono: 'carpeta', nombre: 'Expedientes técnicos',
    descripcion: 'Expedientes completos listos para licitar y ejecutar, con todas las especialidades integradas.',
    items: ['Memoria descriptiva y especificaciones técnicas', 'Planos de todas las especialidades', 'Metrados, análisis de costos unitarios y presupuesto', 'Fórmula polinómica y cronograma de obra'],
  },
  {
    slug: 'diseno', icono: 'compas', nombre: 'Diseño arquitectónico y de ingeniería',
    descripcion: 'Proyectos de arquitectura, estructuras e instalaciones para inversión pública y privada.',
    items: ['Anteproyecto y proyecto arquitectónico', 'Diseño estructural', 'Instalaciones sanitarias y eléctricas', 'Expedientes para licencia de edificación'],
  },
  {
    slug: 'supervision', icono: 'casco', nombre: 'Supervisión de obras',
    descripcion: 'Control técnico, económico y de plazos para que la obra se ejecute según el expediente aprobado.',
    items: ['Control de calidad y valorizaciones', 'Revisión de adicionales y ampliaciones de plazo', 'Informes mensuales a la entidad', 'Recepción de obra'],
  },
  {
    slug: 'liquidacion', icono: 'check', nombre: 'Liquidación de obras',
    descripcion: 'Liquidación técnica y financiera de contratos de obra y consultoría.',
    items: ['Revisión de metrados finales', 'Cálculo de reajustes y saldos', 'Expediente de liquidación'],
  },
  {
    slug: 'consultoria', icono: 'chat', nombre: 'Consultoría técnica',
    descripcion: 'Asesoría a entidades públicas, empresas y particulares en proyectos de construcción.',
    items: ['Evaluación y revisión de expedientes', 'Peritajes e informes técnicos', 'Asesoría en procesos de contratación'],
  },
];

/** Crea los servicios que falten (por slug). Nunca sobrescribe los que el ADMIN ya editó. */
export async function cargarServiciosIniciales(prisma: PrismaClient) {
  let creados = 0;
  for (const [i, servicio] of SERVICIOS_INICIALES.entries()) {
    const existe = await prisma.servicio.findUnique({ where: { slug: servicio.slug }, select: { id: true } });
    if (existe) continue;
    await prisma.servicio.create({ data: { ...servicio, orden: i + 1 } });
    creados++;
  }
  return creados;
}
