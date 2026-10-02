import { Link } from 'react-router';
import { AlertTriangle, Briefcase, CheckCircle2, ChevronRight, Circle, Clock, FileStack, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useUsuarios } from '@/api/admin';
import { useDashboardGeneral } from '@/api/proyectos';
import { GastoCategoriaChart, GastoMensualChart } from '@/components/Charts';
import { EstadoProyectoBadge } from '@/components/Common';
import { Badge, Card, CardHeader, ErrorState, PageHeader, ProgressBar, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';
import { ESPECIALIDAD, formatFecha, formatNumero, formatPorcentaje, formatSoles, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import type { DashboardGeneral } from '@/types/api';

/** Guía para empezar: se muestra mientras falte alguno de los pasos básicos */
function PrimerosPasos({ data }: { data: DashboardGeneral }) {
  const { data: tecnicos } = useUsuarios({ rol: 'USUARIO', activo: true });
  if (!tecnicos) return null;

  const primerProyecto = data.resumenProyectos[0];
  const pasos = [
    { hecho: data.clientesActivos > 0, texto: 'Registrar un cliente', detalle: 'La municipalidad, entidad o empresa que contrata el servicio.', to: '/clientes' },
    { hecho: data.proyectos.total > 0, texto: 'Crear un proyecto', detalle: 'Con su cliente, ubicación, plazo y monto del contrato.', to: '/proyectos' },
    { hecho: data.profesionalesActivos > 0, texto: 'Registrar al personal', detalle: 'Arquitectos, ingenieros y dibujantes con su costo por hora.', to: '/trabajadores' },
    { hecho: tecnicos.length > 0, texto: 'Dar acceso a un arquitecto o ingeniero', detalle: 'Para que entre a la intranet y suba planos de sus proyectos.', to: '/usuarios' },
    {
      hecho: data.resumenProyectos.some((p) => p.planos.total > 0),
      texto: 'Subir el primer plano',
      detalle: 'Desde la pestaña Planos de un proyecto.',
      to: primerProyecto ? `/proyectos/${primerProyecto.id}/planos` : '/proyectos',
    },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;

  return (
    <Card className="mb-6">
      <CardHeader title="Primeros pasos" subtitle={`Para empezar a usar la intranet · ${hechos} de ${pasos.length} listos`} />
      <ol className="divide-y divide-slate-100">
        {pasos.map((p) => (
          <li key={p.texto}>
            <Link to={p.to} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              {p.hecho ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : <Circle className="size-5 shrink-0 text-slate-300" />}
              <div className="min-w-0 flex-1">
                <p className={clsx('text-sm font-medium', p.hecho ? 'text-slate-400 line-through' : 'text-slate-900')}>{p.texto}</p>
                {!p.hecho && <p className="text-xs text-slate-500">{p.detalle}</p>}
              </div>
              {!p.hecho && <ChevronRight className="size-4 text-slate-400" />}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardGeneral(12);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const { finanzas, proyectos } = data;
  const enDesarrollo = proyectos.porEstado.EN_EJECUCION;

  return (
    <>
      <PageHeader title={`Hola, ${usuario?.nombre.split(' ')[0]}`} subtitle="Lo más importante de hoy: qué revisar, qué está vencido y cómo van los proyectos." />

      <PrimerosPasos data={data} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Proyectos en desarrollo"
          value={enDesarrollo}
          icon={<Briefcase className="size-5" />}
          hint={`${proyectos.total} en total · ${proyectos.porEstado.PLANIFICADA} por iniciar · ${data.clientesActivos} clientes`}
        />
        <StatCard
          label="Monto contratado"
          value={formatSoles(finanzas.montoContratado)}
          icon={<Wallet className="size-5" />}
          hint={
            <div className="space-y-1.5">
              <ProgressBar value={finanzas.porcentajeEjecutado} />
              <span>
                Gastos {formatSoles(finanzas.gastoTotal)} ({formatPorcentaje(finanzas.porcentajeEjecutado)}) · margen {formatSoles(finanzas.margen)}
              </span>
            </div>
          }
        />
        <StatCard
          label="Planos por revisar"
          value={data.planosPorRevisar.length}
          tone={data.planosPorRevisar.length ? 'warning' : 'success'}
          icon={<FileStack className="size-5" />}
          hint={data.planosPorRevisar.length ? 'Esperan tu aprobación u observación' : 'No hay planos pendientes de revisión'}
        />
        <StatCard
          label="Horas trabajadas este mes"
          value={formatNumero(data.horasMes)}
          icon={<Clock className="size-5" />}
          hint={`${data.profesionalesActivos} profesionales activos`}
        />
      </div>

      {(data.planosPorRevisar.length > 0 || data.entregablesVencidos.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Planos esperando revisión" subtitle="Los más antiguos primero" />
            {data.planosPorRevisar.length ? (
              <ul className="divide-y divide-slate-100">
                {data.planosPorRevisar.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link to={`/proyectos/${p.proyecto.id}/planos`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <span className="w-14 font-mono text-sm font-semibold text-slate-900">{p.codigo}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">{p.titulo}</p>
                        <p className="truncate text-xs text-slate-500">
                          {ESPECIALIDAD[p.especialidad].label} · {p.proyecto.nombre}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">{formatFecha(p.actualizadoEn)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Sin planos pendientes.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Entregables vencidos" subtitle="Pasó la fecha límite y aún no están aprobados" />
            {data.entregablesVencidos.length ? (
              <ul className="divide-y divide-slate-100">
                {data.entregablesVencidos.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <Link to={`/proyectos/${e.proyecto.id}/entregables`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <AlertTriangle className="size-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">{e.nombre}</p>
                        <p className="truncate text-xs text-slate-500">{e.proyecto.nombre}</p>
                      </div>
                      <span className="text-xs font-medium text-red-700">{formatFecha(e.fechaLimite)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Todo al día.</p>
            )}
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Estado de los proyectos" subtitle="Cuántos planos están aprobados, cuántos entregables están listos y cuánto se ha gastado de lo contratado" />
        <Table>
          <thead>
            <tr>
              <th className={th}>Proyecto</th>
              <th className={th}>Estado</th>
              <th className={th}>Planos</th>
              <th className={th}>Entregables</th>
              <th className={th}>Gasto / contrato</th>
              <th className={th}>Plazo</th>
            </tr>
          </thead>
          <tbody>
            {data.resumenProyectos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className={td}>
                  <Link to={`/proyectos/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {p.nombre}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {p.cliente.nombre} · {TIPO_SERVICIO[p.tipoServicio]} · {RUBRO_OBRA[p.rubro]}
                  </p>
                </td>
                <td className={td}>
                  <EstadoProyectoBadge estado={p.estado} />
                </td>
                <td className={`${td} w-40`}>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.planos.total ? (p.planos.aprobados / p.planos.total) * 100 : 0} color="green" />
                    <span className="w-10 text-right text-xs tabular-nums">
                      {p.planos.aprobados}/{p.planos.total}
                    </span>
                  </div>
                  {p.planosPorRevisar > 0 && <p className="mt-1 text-xs text-sky-700">{p.planosPorRevisar} por revisar</p>}
                </td>
                <td className={`${td} w-40`}>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.entregables.total ? (p.entregables.aprobados / p.entregables.total) * 100 : 0} color="blue" />
                    <span className="w-10 text-right text-xs tabular-nums">
                      {p.entregables.aprobados}/{p.entregables.total}
                    </span>
                  </div>
                </td>
                <td className={`${td} w-52`}>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.porcentajeEjecutado} color={p.sobrepresupuesto ? 'red' : 'brand'} />
                    <span className="w-10 text-right text-xs tabular-nums">{Math.round(p.porcentajeEjecutado)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatSoles(p.gastado)} / {formatSoles(p.montoContrato)}
                  </p>
                </td>
                <td className={td}>
                  {p.tiempo.vencido && p.estado !== 'FINALIZADA' ? (
                    <Badge color="red">Vencido</Badge>
                  ) : (
                    <span className="text-xs text-slate-600">{p.tiempo.diasRestantes} días restantes</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Gasto mensual" subtitle="Últimos 12 meses, todos los proyectos" />
          <div className="p-4">
            <GastoMensualChart data={finanzas.porMes} />
          </div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Gasto por categoría" />
          <div className="p-5">
            <GastoCategoriaChart data={finanzas.porCategoria} />
          </div>
        </Card>
      </div>
    </>
  );
}
