import type { ContenidoCms } from './cms.schema';
type Bloque = Extract<ContenidoCms, { tipo: 'pagina' }>['bloques'][number];

const texto = (id: string, titulo: string, contenido: string) => ({ id, tipo: 'texto' as const, titulo, texto: contenido, visible: true, medioId: null, botonTexto: '', botonUrl: '' });
const pagina = (slug: string, titulo: string, descripcion: string, bloques: Bloque[]): ContenidoCms =>
  ({ tipo: 'pagina', slug, titulo, descripcion, imagenSocialId: null, bloques });
export const predeterminados: Record<string, ContenidoCms> = {
  configuracion: {
    tipo: 'configuracion', nombre: 'INGELOP', subtitulo: 'Consultores y Ejecutores',
    descripcion: 'Consultora chiclayana de arquitectura e ingeniería: estudios de preinversión, expedientes técnicos, diseño y supervisión de obras públicas y privadas.',
    logoId: null,
    menu: ['inicio', 'nosotros', 'servicios', 'proyectos', 'contacto'].map((slug) => ({ slug, etiqueta: slug.charAt(0).toUpperCase() + slug.slice(1) })),
  },
  'pagina.inicio': pagina('inicio', 'Ingeniería y arquitectura para obras que transforman Lambayeque', 'Consultoría en ingeniería y arquitectura en Chiclayo.', [
    { ...texto('presentacion', 'Ingeniería y arquitectura para obras que transforman Lambayeque', 'Elaboramos estudios de preinversión, expedientes técnicos y proyectos de arquitectura e ingeniería, y supervisamos su ejecución para entidades públicas, empresas y familias del norte del Perú.'), botonTexto: 'Solicitar una cotización', botonUrl: 'contacto.php' },
    { ...texto('servicios', 'Acompañamos el proyecto desde la idea hasta la obra terminada', 'Un solo equipo técnico para estudiar, diseñar, presupuestar y supervisar.'), tipo: 'servicios' },
    texto('proceso', 'Cómo trabajamos', 'Diagnóstico: visita de campo y definición de alcances.\n\nEstudios y diseño: topografía y especialidades.\n\nMetrados y presupuesto: costos y cronograma.\n\nEntrega y seguimiento: levantamiento de observaciones.'),
  ]),
  'pagina.nosotros': pagina('nosotros', 'Nosotros', 'Conoce a INGELOP, consultora de arquitectura e ingeniería en Chiclayo.', [
    texto('presentacion', 'Ingeniería y arquitectura hecha en Chiclayo', 'Somos una empresa lambayecana dedicada a la consultoría de obras: estudiamos, diseñamos y supervisamos proyectos de infraestructura pública y privada.'),
    texto('empresa', 'Quiénes somos', 'INGELOP Consultores y Ejecutores E.I.R.L. inició actividades en enero de 2023. Trabajamos con entidades públicas, empresas y particulares de Lambayeque y el norte del país.'),
    texto('compromiso', 'Nuestro compromiso', 'Expedientes completos y coherentes entre especialidades.\nPresupuestos sustentados con metrados y análisis de costos.\nCumplimiento de plazos y atención directa del equipo técnico.'),
  ]),
  'pagina.servicios': pagina('servicios', 'Servicios', 'Estudios, expedientes técnicos, diseño, supervisión y liquidación de obras.', [
    { ...texto('servicios', 'Consultoría de obras de principio a fin', 'Desde el estudio de preinversión hasta la liquidación de la obra.'), tipo: 'servicios' },
  ]),
  'pagina.proyectos': pagina('proyectos', 'Proyectos', 'Proyectos realizados por INGELOP.', [
    { ...texto('portafolio', 'Infraestructura para el desarrollo de la región', 'Conoce nuestros proyectos realizados.'), tipo: 'portafolio' },
  ]),
  'pagina.contacto': pagina('contacto', 'Contacto', 'Solicita una propuesta técnica y económica.', [
    { ...texto('contacto', 'Conversemos sobre tu proyecto', 'Déjanos tus datos y el detalle de lo que necesitas.'), tipo: 'contacto' },
  ]),
};
