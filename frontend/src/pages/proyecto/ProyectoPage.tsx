import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import clsx from 'clsx';
import { ArrowLeft, Briefcase, Calendar, MapPin, User } from 'lucide-react';
import { useProyecto } from '@/api/proyectos';
import { EstadoProyectoBadge } from '@/components/Common';
import { Badge, ErrorState, Spinner } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';
import { formatFecha, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import ResumenTab from './ResumenTab';
import TableroTab from './TableroTab';
import PlanosTab from './PlanosTab';
import PresupuestosTab from './PresupuestosTab';
import EntregablesTab from './EntregablesTab';
import EquipoTab from './EquipoTab';
import GastosTab from './GastosTab';
import EvidenciasTab from './EvidenciasTab';
import EtapasTab from './EtapasTab';
import AjustesTab from './AjustesTab';

const primaryClass = (active: boolean) =>
  clsx(
    '-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
    active ? 'border-brand-500 text-slate-950' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
  );

const secondaryClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900',
  );

export default function ProyectoPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const { esAdmin } = useAuth();
  const { data: proyecto, isLoading, error, refetch } = useProyecto(id);

  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/proyectos" replace />;
  if (isLoading) return <Spinner />;
  if (error || !proyecto) return <ErrorState error={error} onRetry={refetch} />;

  const base = `/proyectos/${id}`;
  const enExpediente = location.pathname.startsWith(`${base}/expediente`);
  const enRecursos = location.pathname.startsWith(`${base}/recursos`);
  const primary = [
    { to: base, label: 'Resumen', active: location.pathname === base || location.pathname === `${base}/` },
    { to: `${base}/expediente/etapas`, label: 'Expediente', active: enExpediente },
    { to: `${base}/planificacion`, label: 'Planificación', active: location.pathname.startsWith(`${base}/planificacion`) },
    ...(esAdmin ? [{ to: `${base}/recursos/equipo`, label: 'Recursos', active: enRecursos }] : []),
    ...(esAdmin ? [{ to: `${base}/configuracion`, label: 'Configuración', active: location.pathname.startsWith(`${base}/configuracion`) }] : []),
  ];
  const expediente = [
    { to: `${base}/expediente/etapas`, label: 'Etapas y documentos' },
    { to: `${base}/expediente/planos`, label: 'Planos' },
    { to: `${base}/expediente/entregables`, label: 'Entregables' },
    { to: `${base}/expediente/presupuestos`, label: 'Presupuestos' },
    { to: `${base}/expediente/fotos`, label: 'Fotos y visitas' },
  ];
  const recursos = [
    { to: `${base}/recursos/equipo`, label: 'Equipo y horas' },
    { to: `${base}/recursos/gastos`, label: 'Gastos' },
  ];

  return (
    <>
      <Link to="/proyectos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" />
        Todos los proyectos
      </Link>

      <div className="mb-5 border-l-4 border-brand-500 pl-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{proyecto.nombre}</h1>
          <EstadoProyectoBadge estado={proyecto.estado} />
          <Badge color="violet">{TIPO_SERVICIO[proyecto.tipoServicio]}</Badge>
          <Badge color="blue">{RUBRO_OBRA[proyecto.rubro]}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
          <span className="flex items-center gap-1.5"><Briefcase className="size-4 text-slate-400" />{proyecto.cliente.nombre}</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" />{proyecto.ubicacion}</span>
          <span className="flex items-center gap-1.5"><Calendar className="size-4 text-slate-400" />{formatFecha(proyecto.fechaInicio)} – {formatFecha(proyecto.fechaFin)}</span>
          <span className="flex items-center gap-1.5"><User className="size-4 text-slate-400" />{proyecto.responsable.nombre}</span>
        </div>
      </div>

      <nav className="-mx-4 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:mx-0 sm:rounded-t-lg sm:border-x sm:border-t sm:px-3" aria-label="Áreas del proyecto">
        <div className="flex gap-1">
          {primary.map((item) => (
            <Link key={item.to} to={item.to} className={primaryClass(item.active)}>{item.label}</Link>
          ))}
        </div>
      </nav>

      {(enExpediente || enRecursos) && (
        <nav className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2 sm:mx-0 sm:px-3" aria-label={enExpediente ? 'Secciones del expediente' : 'Secciones de recursos'}>
          <div className="flex gap-1">
            {(enExpediente ? expediente : recursos).map((item) => (
              <NavLink key={item.to} to={item.to} className={secondaryClass}>{item.label}</NavLink>
            ))}
          </div>
        </nav>
      )}
      {!enExpediente && !enRecursos && <div className="mb-6" />}

      <Routes>
        <Route index element={<ResumenTab proyectoId={id} />} />
        <Route path="expediente" element={<Navigate to={`${base}/expediente/etapas`} replace />} />
        <Route path="expediente/etapas" element={<EtapasTab proyectoId={id} />} />
        <Route path="expediente/planos" element={<PlanosTab proyectoId={id} />} />
        <Route path="expediente/entregables" element={<EntregablesTab proyectoId={id} />} />
        <Route path="expediente/presupuestos" element={<PresupuestosTab proyectoId={id} />} />
        <Route path="expediente/fotos" element={<EvidenciasTab proyectoId={id} />} />
        <Route path="planificacion" element={<TableroTab proyectoId={id} />} />
        {esAdmin && (
          <>
            <Route path="recursos" element={<Navigate to={`${base}/recursos/equipo`} replace />} />
            <Route path="recursos/equipo" element={<EquipoTab proyectoId={id} />} />
            <Route path="recursos/gastos" element={<GastosTab proyectoId={id} />} />
            <Route path="configuracion" element={<AjustesTab proyecto={proyecto} />} />
          </>
        )}

        <Route path="etapas" element={<Navigate to={`${base}/expediente/etapas`} replace />} />
        <Route path="planos" element={<Navigate to={`${base}/expediente/planos`} replace />} />
        <Route path="entregables" element={<Navigate to={`${base}/expediente/entregables`} replace />} />
        <Route path="presupuestos" element={<Navigate to={`${base}/expediente/presupuestos`} replace />} />
        <Route path="fotos" element={<Navigate to={`${base}/expediente/fotos`} replace />} />
        <Route path="documentos" element={<Navigate to={`${base}/expediente/fotos`} replace />} />
        <Route path="tablero" element={<Navigate to={`${base}/planificacion`} replace />} />
        {esAdmin && <Route path="equipo" element={<Navigate to={`${base}/recursos/equipo`} replace />} />}
        {esAdmin && <Route path="gastos" element={<Navigate to={`${base}/recursos/gastos`} replace />} />}
        {esAdmin && <Route path="ajustes" element={<Navigate to={`${base}/configuracion`} replace />} />}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </>
  );
}
