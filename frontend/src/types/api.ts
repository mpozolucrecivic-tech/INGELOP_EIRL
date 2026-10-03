// Tipos de las respuestas de la API (/api/v1). Decimales llegan como number; fechas como string ISO.

export type Rol = 'ADMIN' | 'USUARIO';
export type EstadoProyecto = 'PLANIFICADA' | 'EN_EJECUCION' | 'FINALIZADA';
export type EstadoActividad = 'BACKLOG' | 'POR_HACER' | 'EN_PROCESO' | 'EN_REVISION' | 'COMPLETADA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
export type CategoriaGasto = 'MATERIALES' | 'MANO_DE_OBRA' | 'TRANSPORTE' | 'EQUIPOS' | 'OTROS';
export type TipoEvidencia = 'FOTO' | 'INFORME' | 'DOCUMENTO' | 'OBSERVACION';
export type TipoCliente = 'ENTIDAD_PUBLICA' | 'EMPRESA' | 'PERSONA';
export type TipoServicio =
  | 'ESTUDIO_PREINVERSION'
  | 'EXPEDIENTE_TECNICO'
  | 'DISENO_ARQUITECTONICO'
  | 'DISENO_ESTRUCTURAL'
  | 'SUPERVISION'
  | 'LIQUIDACION_OBRA'
  | 'CONSULTORIA'
  | 'OTRO';
export type RubroObra = 'EDIFICACIONES' | 'SANEAMIENTO' | 'VIALES' | 'ELECTROMECANICAS' | 'REPRESAS_IRRIGACIONES';
export type Especialidad =
  | 'ARQUITECTURA'
  | 'ESTRUCTURAS'
  | 'INSTALACIONES_SANITARIAS'
  | 'INSTALACIONES_ELECTRICAS'
  | 'INSTALACIONES_MECANICAS'
  | 'SANEAMIENTO'
  | 'VIALIDAD'
  | 'TOPOGRAFIA'
  | 'OTROS';
export type EstadoRevision = 'BORRADOR' | 'EN_REVISION' | 'OBSERVADO' | 'APROBADO';

export interface UsuarioRef {
  id: number;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  proyectosAsignados?: { proyecto: { id: number; nombre: string } }[];
}

export interface LoginResponse {
  token: string;
  usuario: Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol'>;
}

export interface Cliente {
  id: number;
  tipo: TipoCliente;
  nombre: string;
  documento: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  creadoEn: string;
  _count?: { proyectos: number };
}

export interface Proyecto {
  id: number;
  nombre: string;
  clienteId: number;
  cliente: Pick<Cliente, 'id' | 'nombre' | 'tipo'>;
  tipoServicio: TipoServicio;
  rubro: RubroObra;
  ubicacion: string;
  fechaInicio: string;
  fechaFin: string;
  montoContrato: number;
  estado: EstadoProyecto;
  responsableId: number;
  creadoEn: string;
  responsable: { id: number; nombre: string; email: string };
  _count?: Partial<Record<'sprints' | 'gastos' | 'evidencias' | 'asignaciones' | 'usuarios' | 'planos' | 'presupuestos' | 'entregables', number>>;
}

export interface ProyectoDetalle extends Proyecto {
  usuarios: Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol'>[];
}

export interface Sprint {
  id: number;
  proyectoId: number;
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string;
  vigente: boolean;
  totalActividades: number;
  actividadesPorEstado: Record<EstadoActividad, number>;
  avance: number;
}

export interface Actividad {
  id: number;
  sprintId: number;
  nombre: string;
  responsableId: number;
  estado: EstadoActividad;
  avance: number;
  responsable: UsuarioRef;
  _count: { evidencias: number };
}

export interface Material {
  id: number;
  proyectoId: number;
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  enAlerta: boolean;
  faltante: number;
}

export interface Movimiento {
  id: number;
  materialId: number;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  observacion: string | null;
  usuario: UsuarioRef;
}

export interface Trabajador {
  id: number;
  dni: string;
  nombre: string;
  cargo: string;
  costoHora: number;
  activo: boolean;
  asignaciones?: { id: number; fechaInicio: string; fechaFin: string | null; proyecto: { id: number; nombre: string } }[];
}

export interface Asignacion {
  id: number;
  trabajadorId: number;
  proyectoId: number;
  fechaInicio: string;
  fechaFin: string | null;
  trabajador: Pick<Trabajador, 'id' | 'dni' | 'nombre' | 'cargo' | 'costoHora' | 'activo'>;
}

export interface RegistroHoras {
  id: number;
  trabajadorId: number;
  proyectoId: number;
  fecha: string;
  horas: number;
  descripcion: string | null;
  trabajador: Pick<Trabajador, 'id' | 'nombre' | 'cargo'>;
}

export interface ResumenHoras {
  totalHoras: number;
  costoTotal: number;
  trabajadores: {
    trabajadorId: number;
    nombre: string;
    cargo: string;
    costoHora: number;
    diasTrabajados: number;
    horas: number;
    costo: number;
  }[];
}

export interface Gasto {
  id: number;
  proyectoId: number;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  fecha: string;
}

export interface ResumenGastos {
  montoContrato: number;
  totalGastado: number;
  saldo: number;
  porcentajeEjecutado: number;
  sobrepresupuesto: boolean;
  cantidadGastos: number;
  porCategoria: { categoria: CategoriaGasto; monto: number; porcentaje: number }[];
  porMes: { mes: string; monto: number }[];
}

export interface Evidencia {
  id: number;
  proyectoId: number;
  actividadId: number | null;
  tipo: TipoEvidencia;
  titulo: string;
  descripcion: string | null;
  archivoUrl: string | null;
  descargaUrl: string | null;
  fecha: string;
  usuario: UsuarioRef;
  actividad: UsuarioRef | null;
}

export interface PlanoVersion {
  id: number;
  revision: number;
  nombreArchivo: string;
  tamano: number;
  comentario: string | null;
  fecha: string;
  usuario: UsuarioRef;
  descargaUrl: string;
}

export interface Plano {
  id: number;
  proyectoId: number;
  codigo: string;
  titulo: string;
  especialidad: Especialidad;
  estado: EstadoRevision;
  observacion: string | null;
  responsableId: number | null;
  responsable: UsuarioRef | null;
  creadoEn: string;
  actualizadoEn: string;
  ultimaVersion: PlanoVersion | null;
  totalVersiones: number;
}

export interface PlanoDetalle extends Omit<Plano, 'ultimaVersion' | 'totalVersiones'> {
  versiones: PlanoVersion[];
}

export interface Partida {
  id?: number;
  item: string;
  descripcion: string;
  esTitulo: boolean;
  unidad: string | null;
  metrado: number | null;
  precioUnitario: number | null;
  parcial?: number;
}

export interface TotalesPresupuesto {
  costoDirecto: number;
  gastosGenerales: number;
  utilidad: number;
  subtotal: number;
  igv: number;
  total: number;
  cantidadPartidas: number;
}

export interface Presupuesto {
  id: number;
  proyectoId: number;
  nombre: string;
  version: number;
  fecha: string;
  estado: EstadoRevision;
  gastosGeneralesPct: number;
  utilidadPct: number;
  igvPct: number;
  observaciones: string | null;
  creadoEn: string;
  actualizadoEn: string;
  totales: TotalesPresupuesto;
}

export interface PresupuestoDetalle extends Presupuesto {
  partidas: Partida[];
}

export interface Entregable {
  id: number;
  proyectoId: number;
  orden: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoRevision;
  fechaLimite: string | null;
  fechaEntrega: string | null;
  responsableId: number | null;
  responsable: UsuarioRef | null;
  vencido: boolean;
}

export interface IndicadoresTiempo {
  diasTotales: number;
  diasTranscurridos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  vencido: boolean;
}

export interface DashboardProyecto {
  proyecto: Pick<Proyecto, 'id' | 'nombre' | 'tipoServicio' | 'ubicacion' | 'estado' | 'fechaInicio' | 'fechaFin'> & {
    cliente: UsuarioRef;
    responsable: UsuarioRef;
  };
  tiempo: IndicadoresTiempo;
  avance: {
    avanceGeneral: number;
    totalActividades: number;
    actividadesPorEstado: Record<EstadoActividad, number>;
    totalSprints: number;
    sprintVigente: Pick<Sprint, 'id' | 'numero' | 'objetivo' | 'fechaInicio' | 'fechaFin'> | null;
  };
  planos: {
    total: number;
    porEstado: Record<EstadoRevision, number>;
    porcentajeAprobados: number;
    porEspecialidad: { especialidad: Especialidad; total: number; aprobados: number }[];
  };
  entregables: {
    total: number;
    aprobados: number;
    porcentaje: number;
    vencidos: number;
    proximos: Pick<Entregable, 'id' | 'nombre' | 'estado' | 'fechaLimite' | 'vencido' | 'responsable'>[];
  };
  presupuestos: { id: number; nombre: string; version: number; estado: EstadoRevision; total: number }[];
  finanzas: ResumenGastos;
  equipo: { profesionalesAsignados: number; totalHoras: number; costoHoras: number };
  evidencias: {
    total: number;
    porTipo: Record<TipoEvidencia, number>;
    ultimas: Pick<Evidencia, 'id' | 'tipo' | 'titulo' | 'fecha' | 'usuario'>[];
  };
}

export interface DashboardGeneral {
  proyectos: {
    total: number;
    porEstado: Record<EstadoProyecto, number>;
    porTipoServicio: Record<TipoServicio, number>;
    porRubro: Record<RubroObra, number>;
  };
  finanzas: {
    montoContratado: number;
    gastoTotal: number;
    margen: number;
    porcentajeEjecutado: number;
    porCategoria: { categoria: CategoriaGasto; monto: number; porcentaje: number }[];
    porMes: { mes: string; monto: number }[];
  };
  planosPorRevisar: {
    id: number;
    codigo: string;
    titulo: string;
    especialidad: Especialidad;
    actualizadoEn: string;
    proyecto: UsuarioRef;
  }[];
  entregablesVencidos: { id: number; nombre: string; fechaLimite: string; proyecto: UsuarioRef }[];
  horasMes: number;
  clientesActivos: number;
  profesionalesActivos: number;
  usuariosActivos: number;
  resumenProyectos: (Pick<Proyecto, 'id' | 'nombre' | 'tipoServicio' | 'rubro' | 'estado' | 'montoContrato' | 'fechaInicio' | 'fechaFin'> & {
    cliente: UsuarioRef;
    gastado: number;
    porcentajeEjecutado: number;
    sobrepresupuesto: boolean;
    avance: number;
    planos: { total: number; aprobados: number };
    entregables: { total: number; aprobados: number };
    planosPorRevisar: number;
    tiempo: IndicadoresTiempo;
  })[];
}

export interface ApiErrorBody {
  message: string;
  errors?: { campo: string; mensaje: string }[];
  details?: Record<string, unknown>;
}

// ---------- Web pública ----------

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  slug: string | null;
  icono: string | null;
  items: string[];
  /** Relativa a la URL base de la API (ej. "/servicios/3/foto?v=…"); null si no tiene foto */
  fotoUrl: string | null;
  orden: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export type TipoMensaje = 'CONTACTO' | 'CONSULTA_TECNICA';

export interface MensajeContacto {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoMensaje;
  entidad: string | null;
  servicioSlug: string | null;
  servicioNombre: string | null;
  mensaje: string;
  leido: boolean;
  fecha: string;
}

export type ClaveSitio = 'telefono' | 'whatsapp' | 'email' | 'direccion' | 'distrito' | 'horario' | 'facebook' | 'linkedin';

export interface DatoSitio {
  clave: ClaveSitio;
  valor: string;
  publicado: boolean;
  actualizadoEn: string | null;
}

/** Proyecto realizado que muestra la web (portafolio) */
export interface ProyectoWeb {
  id: number;
  titulo: string;
  cliente: string | null;
  ubicacion: string | null;
  anio: number | null;
  servicio: string | null;
  /** Relativa a la URL base de la API; null si no tiene foto */
  fotoUrl: string | null;
  orden: number;
  activo: boolean;
}
