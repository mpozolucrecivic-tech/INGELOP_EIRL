import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router';
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
import AjustesTab from './AjustesTab';

export default function ProyectoPage() {
  const id = Number(useParams().id);
  const { esAdmin } = useAuth();
  const { data: proyecto, isLoading, error, refetch } = useProyecto(id);

  if (!Number.isInteger(id) || id <= 0) return <Navigate to="/proyectos" replace />;
  if (isLoading) return <Spinner />;
  if (error || !proyecto) return <ErrorState error={error} onRetry={refetch} />;

  const base = `/proyectos/${id}`;
  const tabs = [
    { to: base, label: 'Resumen', end: true },
    { to: `${base}/planos`, label: 'Planos' },
    { to: `${base}/presupuestos`, label: 'Presupuestos' },
    { to: `${base}/entregables`, label: 'Entregables' },
    { to: `${base}/tablero`, label: 'Tareas' },
    ...(esAdmin ? [{ to: `${base}/equipo`, label: 'Equipo y horas' }] : []),
    ...(esAdmin ? [{ to: `${base}/gastos`, label: 'Gastos' }] : []),
    { to: `${base}/documentos`, label: 'Documentos' },
    ...(esAdmin ? [{ to: `${base}/ajustes`, label: 'Ajustes' }] : []),
  ];

  return (
    <>
      <Link to="/proyectos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" />
        Proyectos
      </Link>

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{proyecto.nombre}</h1>
          <EstadoProyectoBadge estado={proyecto.estado} />
          <Badge color="violet">{TIPO_SERVICIO[proyecto.tipoServicio]}</Badge>
          <Badge color="blue">{RUBRO_OBRA[proyecto.rubro]}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Briefcase className="size-4" />
            {proyecto.cliente.nombre}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {proyecto.ubicacion}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatFecha(proyecto.fechaInicio)} – {formatFecha(proyecto.fechaFin)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="size-4" />
            {proyecto.responsable.nombre}
          </span>
        </div>
      </div>

      <nav className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0" aria-label="Secciones del proyecto">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                clsx(
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'border-brand-500 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Routes>
        <Route index element={<ResumenTab proyectoId={id} />} />
        <Route path="planos" element={<PlanosTab proyectoId={id} />} />
        <Route path="presupuestos" element={<PresupuestosTab proyectoId={id} />} />
        <Route path="entregables" element={<EntregablesTab proyectoId={id} />} />
        <Route path="tablero" element={<TableroTab proyectoId={id} />} />
        <Route path="documentos" element={<EvidenciasTab proyectoId={id} />} />
        {esAdmin && (
          <>
            <Route path="equipo" element={<EquipoTab proyectoId={id} />} />
            <Route path="gastos" element={<GastosTab proyectoId={id} />} />
            <Route path="ajustes" element={<AjustesTab proyecto={proyecto} />} />
          </>
        )}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </>
  );
}
