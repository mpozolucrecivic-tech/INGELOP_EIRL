import type { CategoriaGasto, Especialidad, EstadoActividad, EstadoProyecto, EstadoRevision, RubroObra, TipoCliente, TipoEvidencia, TipoMensaje, TipoServicio } from '@/types/api';

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const solesCorto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 });
const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

export const formatSoles = (n: number) => soles.format(n);
export const formatSolesCorto = (n: number) => solesCorto.format(n);
export const formatNumero = (n: number) => numero.format(n);
export const formatPorcentaje = (n: number) => `${numero.format(n)}%`;

// Las fechas de obra se guardan como medianoche UTC: se formatean en UTC para no restar un día en Perú (UTC-5)
const fecha = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fechaHora = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
const mesAnio = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export const formatFecha = (iso: string) => fecha.format(new Date(iso));
export const formatFechaHora = (iso: string) => fechaHora.format(new Date(iso));
/** "2026-09" -> "sept 26" */
export const formatMes = (yyyymm: string) => mesAnio.format(new Date(`${yyyymm}-01T00:00:00Z`));

/** ISO -> "YYYY-MM-DD" para <input type="date"> */
export const aInputFecha = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
export const hoyInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ESTADO_PROYECTO: Record<EstadoProyecto, { label: string; color: 'slate' | 'amber' | 'green' }> = {
  PLANIFICADA: { label: 'Por iniciar', color: 'slate' },
  EN_EJECUCION: { label: 'En desarrollo', color: 'amber' },
  FINALIZADA: { label: 'Finalizado', color: 'green' },
};

export const ESTADO_ACTIVIDAD: Record<EstadoActividad, { label: string; dot: string }> = {
  BACKLOG: { label: 'Backlog', dot: 'bg-slate-400' },
  POR_HACER: { label: 'Por hacer', dot: 'bg-sky-500' },
  EN_PROCESO: { label: 'En proceso', dot: 'bg-amber-500' },
  EN_REVISION: { label: 'En revisión', dot: 'bg-violet-500' },
  COMPLETADA: { label: 'Completada', dot: 'bg-emerald-500' },
};
export const ORDEN_ESTADOS: EstadoActividad[] = ['BACKLOG', 'POR_HACER', 'EN_PROCESO', 'EN_REVISION', 'COMPLETADA'];

// Categorías de gastos propios de la consultora (los valores internos se conservan)
export const CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  MATERIALES: 'Impresiones y útiles',
  MANO_DE_OBRA: 'Honorarios y planilla',
  TRANSPORTE: 'Transporte y viáticos',
  EQUIPOS: 'Equipos y software',
  OTROS: 'Estudios, trámites y otros',
};

export const TIPO_SERVICIO: Record<TipoServicio, string> = {
  ESTUDIO_PREINVERSION: 'Estudio de preinversión',
  EXPEDIENTE_TECNICO: 'Expediente técnico',
  DISENO_ARQUITECTONICO: 'Diseño arquitectónico',
  DISENO_ESTRUCTURAL: 'Diseño estructural',
  SUPERVISION: 'Supervisión de obra',
  LIQUIDACION_OBRA: 'Liquidación de obra',
  CONSULTORIA: 'Consultoría',
  OTRO: 'Otro servicio',
};

/** Especialidades de consultoría de obras del RNP (OSCE) */
export const RUBRO_OBRA: Record<RubroObra, string> = {
  EDIFICACIONES: 'Edificaciones y obras urbanas',
  SANEAMIENTO: 'Saneamiento',
  VIALES: 'Obras viales',
  ELECTROMECANICAS: 'Electromecánicas y energéticas',
  REPRESAS_IRRIGACIONES: 'Represas e irrigaciones',
};

export const TIPO_CLIENTE: Record<TipoCliente, string> = {
  ENTIDAD_PUBLICA: 'Entidad pública',
  EMPRESA: 'Empresa',
  PERSONA: 'Persona natural',
};

export const TIPO_MENSAJE: Record<TipoMensaje, { label: string; color: 'slate' | 'blue' }> = {
  CONTACTO: { label: 'Contacto', color: 'slate' },
  CONSULTA_TECNICA: { label: 'Consulta técnica', color: 'blue' },
};

/** Íconos que la web sabe dibujar (web/includes/api.php → ICONOS_SERVICIO) */
export const ICONOS_WEB: Record<string, string> = {
  lupa: 'Lupa',
  carpeta: 'Carpeta',
  compas: 'Compás',
  casco: 'Casco',
  check: 'Check',
  chat: 'Conversación',
  edificio: 'Edificio',
  agua: 'Agua',
  via: 'Vía',
  rayo: 'Rayo',
  represa: 'Represa',
  escudo: 'Escudo',
  regla: 'Regla',
  usuario: 'Usuario',
};

/** Especialidades con su prefijo habitual de lámina */
export const ESPECIALIDAD: Record<Especialidad, { label: string; prefijo: string }> = {
  ARQUITECTURA: { label: 'Arquitectura', prefijo: 'A' },
  ESTRUCTURAS: { label: 'Estructuras', prefijo: 'E' },
  INSTALACIONES_SANITARIAS: { label: 'Inst. sanitarias', prefijo: 'IS' },
  INSTALACIONES_ELECTRICAS: { label: 'Inst. eléctricas', prefijo: 'IE' },
  INSTALACIONES_MECANICAS: { label: 'Inst. mecánicas', prefijo: 'IM' },
  SANEAMIENTO: { label: 'Redes de agua y alcantarillado', prefijo: 'RS' },
  VIALIDAD: { label: 'Vialidad y pavimentos', prefijo: 'V' },
  TOPOGRAFIA: { label: 'Topografía', prefijo: 'T' },
  OTROS: { label: 'Otros', prefijo: 'O' },
};

export const ESTADO_REVISION: Record<EstadoRevision, { label: string; color: 'slate' | 'blue' | 'amber' | 'green' | 'red' }> = {
  BORRADOR: { label: 'Borrador', color: 'slate' },
  EN_REVISION: { label: 'En revisión', color: 'blue' },
  OBSERVADO: { label: 'Observado', color: 'red' },
  APROBADO: { label: 'Aprobado', color: 'green' },
};
/** En entregables, "borrador" significa que aún se está elaborando */
export const ESTADO_ENTREGABLE: Record<EstadoRevision, string> = {
  BORRADOR: 'En elaboración',
  EN_REVISION: 'En revisión',
  OBSERVADO: 'Observado',
  APROBADO: 'Aprobado',
};
export const ORDEN_REVISION: EstadoRevision[] = ['BORRADOR', 'EN_REVISION', 'OBSERVADO', 'APROBADO'];

/** 1 -> A, 2 -> B … (rótulo de revisión de planos) */
export function revisionLetra(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 ** 2).toFixed(1)} MB`;

export const TIPO_EVIDENCIA: Record<TipoEvidencia, string> = {
  FOTO: 'Foto',
  INFORME: 'Informe',
  DOCUMENTO: 'Documento',
  OBSERVACION: 'Observación',
};

/** Paleta para gráficos (colores distinguibles, orden fijo por categoría) */
export const COLORES_CATEGORIA: Record<CategoriaGasto, string> = {
  MATERIALES: '#d97706',
  MANO_DE_OBRA: '#2563eb',
  TRANSPORTE: '#0d9488',
  EQUIPOS: '#7c3aed',
  OTROS: '#64748b',
};
