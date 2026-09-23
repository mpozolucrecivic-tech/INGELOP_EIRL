import { Link } from 'react-router';
import { AlertTriangle, CalendarClock, ClipboardList, Clock, FileStack, Wallet } from 'lucide-react';
import { useDashboardProyecto } from '@/api/proyectos';
import { GastoCategoriaChart } from '@/components/Charts';
import { Badge, Card, CardHeader, EmptyState, ErrorState, ProgressBar, Spinner, StatCard } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';
import {
  ESPECIALIDAD,
  ESTADO_ACTIVIDAD,
  ESTADO_ENTREGABLE,
  ESTADO_REVISION,
  formatFecha,
  formatFechaHora,
  formatNumero,
  formatPorcentaje,
  formatSoles,
  ORDEN_ESTADOS,
  ORDEN_REVISION,
  TIPO_EVIDENCIA,
} from '@/lib/format';

const link = 'text-sm font-medium text-brand-700 hover:underline';

export default function ResumenTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardProyecto(proyectoId);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const { avance, finanzas, tiempo, planos, entregables, presupuestos, equipo, evidencias } = data;
  const base = `/proyectos/${proyectoId}`;
  const enCurso = data.proyecto.estado !== 'FINALIZADA';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Planos aprobados"
          value={`${planos.porEstado.APROBADO} / ${planos.total}`}
          icon={<FileStack className="size-5" />}
          tone={planos.porEstado.OBSERVADO > 0 ? 'warning' : 'success'}
          hint={
            <div className="space-y-1.5">
              <ProgressBar value={planos.porcentajeAprobados} color="green" />
              <span>
                {planos.porEstado.EN_REVISION} en revisión · {planos.porEstado.OBSERVADO} observado{planos.porEstado.OBSERVADO === 1 ? '' : 's'}
              </span>
            </div>
          }
        />
        <StatCard
          label="Expediente"
          value={formatPorcentaje(entregables.porcentaje)}
          icon={<ClipboardList className="size-5" />}
          tone={entregables.vencidos > 0 ? 'danger' : 'default'}
          hint={
            <div className="space-y-1.5">
              <ProgressBar value={entregables.porcentaje} color="blue" />
              <span>
                {entregables.aprobados} de {entregables.total} entregables aprobados
                {entregables.vencidos > 0 && ` · ${entregables.vencidos} vencido${entregables.vencidos === 1 ? '' : 's'}`}
              </span>
            </div>
          }
        />
        <StatCard
          label="Plazo transcurrido"
          value={formatPorcentaje(tiempo.porcentajeTiempo)}
          icon={<CalendarClock className="size-5" />}
          tone={tiempo.vencido && enCurso ? 'danger' : 'default'}
          hint={
            <div className="space-y-1.5">
              <ProgressBar value={tiempo.porcentajeTiempo} color={tiempo.vencido && enCurso ? 'red' : 'brand'} />
              <span>{tiempo.vencido ? `Plazo vencido el ${formatFecha(data.proyecto.fechaFin)}` : `${tiempo.diasRestantes} de ${tiempo.diasTotales} días restantes`}</span>
            </div>
          }
        />
        <StatCard
          label="Horas-hombre"
          value={formatNumero(equipo.totalHoras)}
          icon={<Clock className="size-5" />}
          hint={
            esAdmin
              ? `${equipo.profesionalesAsignados} profesionales · ${formatSoles(equipo.costoHoras)} en horas`
              : `${equipo.profesionalesAsignados} profesionales asignados`
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Planos por especialidad" action={<Link to={`${base}/planos`} className={link}>Ver planos</Link>} />
          {planos.total ? (
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {ORDEN_REVISION.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1.5 text-sm">
                    <Badge color={ESTADO_REVISION[e].color}>{ESTADO_REVISION[e].label}</Badge>
                    <span className="font-semibold tabular-nums">{planos.porEstado[e]}</span>
                  </span>
                ))}
              </div>
              <ul className="space-y-3">
                {planos.porEspecialidad.map((p) => (
                  <li key={p.especialidad}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{ESPECIALIDAD[p.especialidad].label}</span>
                      <span className="tabular-nums text-slate-500">
                        {p.aprobados}/{p.total} aprobados
                      </span>
                    </div>
                    <ProgressBar value={(p.aprobados / p.total) * 100} color="green" />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState icon={<FileStack className="size-6" />} title="Sin planos" description="Registra las láminas del proyecto en la pestaña Planos." />
          )}
        </Card>

        <Card>
          <CardHeader title="Próximos entregables" action={<Link to={`${base}/entregables`} className={link}>Ver todos</Link>} />
          {entregables.proximos.length ? (
            <ul className="divide-y divide-slate-100">
              {entregables.proximos.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  {e.vencido ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{e.nombre}</p>
                    <p className={`text-xs ${e.vencido ? 'font-medium text-red-700' : 'text-slate-500'}`}>
                      {e.fechaLimite && `${e.vencido ? 'Venció' : 'Vence'} el ${formatFecha(e.fechaLimite)}`} · {ESTADO_ENTREGABLE[e.estado]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">{entregables.total ? 'Todos los entregables con fecha están aprobados.' : 'Sin entregables definidos.'}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Presupuestos"
            action={<Link to={`${base}/presupuestos`} className={link}>Ver presupuestos</Link>}
          />
          {presupuestos.length ? (
            <ul className="divide-y divide-slate-100">
              {presupuestos.map((p) => (
                <li key={p.id}>
                  <Link to={`${base}/presupuestos?id=${p.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.nombre}</span>
                    <Badge>v{p.version}</Badge>
                    <Badge color={ESTADO_REVISION[p.estado].color}>{ESTADO_REVISION[p.estado].label}</Badge>
                    <span className="w-32 text-right text-sm font-semibold tabular-nums">{formatSoles(p.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Aún no hay presupuestos.</p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Tablero de tareas"
            subtitle={avance.sprintVigente ? `Sprint ${avance.sprintVigente.numero}: ${avance.sprintVigente.objetivo}` : 'Sin sprint vigente'}
            action={<Link to={`${base}/tablero`} className={link}>Ver</Link>}
          />
          <div className="space-y-2 p-5">
            <div className="mb-3 flex items-center gap-2">
              <ProgressBar value={avance.avanceGeneral} color="green" />
              <span className="w-12 text-right text-sm tabular-nums text-slate-600">{Math.round(avance.avanceGeneral)}%</span>
            </div>
            {ORDEN_ESTADOS.map((e) => (
              <div key={e} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`size-2 rounded-full ${ESTADO_ACTIVIDAD[e].dot}`} />
                  {ESTADO_ACTIVIDAD[e].label}
                </span>
                <span className="font-medium tabular-nums">{avance.actividadesPorEstado[e]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {esAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Economía del servicio" action={<Link to={`${base}/gastos`} className={link}>Gastos</Link>} />
            <dl className="space-y-3 p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Monto del contrato</dt>
                <dd className="font-semibold tabular-nums">{formatSoles(finanzas.montoContrato)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Gastos del servicio</dt>
                <dd className="tabular-nums">{formatSoles(finanzas.totalGastado)}</dd>
              </div>
              <ProgressBar value={finanzas.porcentajeEjecutado} color={finanzas.sobrepresupuesto ? 'red' : 'brand'} />
              <div className="flex justify-between border-t border-slate-100 pt-3">
                <dt className="font-medium text-slate-700">Margen</dt>
                <dd className={`font-semibold tabular-nums ${finanzas.saldo < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatSoles(finanzas.saldo)}</dd>
              </div>
            </dl>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Gastos por categoría" />
            <div className="p-5">
              <GastoCategoriaChart data={finanzas.porCategoria} />
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Últimos documentos" subtitle={`${evidencias.total} en total`} action={<Link to={`${base}/documentos`} className={link}>Ver todos</Link>} />
        {evidencias.ultimas.length ? (
          <ul className="divide-y divide-slate-100">
            {evidencias.ultimas.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Badge color="blue">{TIPO_EVIDENCIA[e.tipo]}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{e.titulo}</span>
                <span className="text-xs text-slate-500">
                  {e.usuario.nombre} · {formatFechaHora(e.fecha)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Wallet className="size-6" />} title="Sin documentos" description="Actas, informes, fotos de visitas y observaciones del proyecto aparecerán aquí." />
        )}
      </Card>
    </div>
  );
}
