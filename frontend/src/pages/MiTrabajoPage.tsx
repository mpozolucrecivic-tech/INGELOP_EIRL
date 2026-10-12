import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Building2, ClipboardCheck, FileClock, Files } from 'lucide-react';
import { useListadoDocumentos } from '@/api/documentos';
import { useProyectos } from '@/api/proyectos';
import { EstadoProyectoBadge } from '@/components/Common';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_ETAPA, formatFecha, RUBRO_OBRA, TIPO_ETAPA } from '@/lib/format';

export default function MiTrabajoPage() {
  const { usuario } = useAuth();
  const proyectosQ = useProyectos();
  const documentosQ = useListadoDocumentos('mios', { pagina: 1, porPagina: 100 });

  if (proyectosQ.isLoading || documentosQ.isLoading) return <Spinner label="Preparando tu espacio de trabajo…" />;
  if (proyectosQ.error || documentosQ.error) {
    return (
      <ErrorState
        error={proyectosQ.error ?? documentosQ.error}
        onRetry={() => {
          void proyectosQ.refetch();
          void documentosQ.refetch();
        }}
      />
    );
  }

  const proyectos = proyectosQ.data ?? [];
  const documentos = documentosQ.data?.documentos ?? [];
  const activos = proyectos.filter((proyecto) => proyecto.estado !== 'FINALIZADA');
  const observados = documentos.filter((documento) => documento.etapa.estado === 'OBSERVADO');
  const enRevision = documentos.filter((documento) => documento.etapa.estado === 'EN_REVISION');
  const pendientes = [...observados, ...enRevision.filter((documento) => !observados.some((observado) => observado.id === documento.id))].slice(0, 6);
  const primerNombre = usuario?.nombre.split(' ')[0] ?? 'equipo';

  return (
    <>
      <PageHeader
        title={`Hola, ${primerNombre}`}
        subtitle="Aquí tienes el trabajo que requiere atención y tus proyectos asignados."
        actions={
          <Link to="/mis-documentos" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Ver mis documentos
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Proyectos activos" value={activos.length} icon={<Building2 className="size-5" />} />
        <StatCard label="Observados recientes" value={observados.length} tone={observados.length ? 'warning' : 'default'} icon={<AlertTriangle className="size-5" />} />
        <StatCard label="En revisión recientes" value={enRevision.length} icon={<FileClock className="size-5" />} />
        <StatCard label="Mis documentos" value={documentosQ.data?.total ?? 0} icon={<Files className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card>
          <CardHeader
            title="Proyectos asignados"
            subtitle="Acceso directo al expediente y al estado general de cada proyecto."
            action={<Link to="/proyectos" className="text-sm font-semibold text-slate-700 hover:text-brand-700">Ver todos</Link>}
          />
          {!proyectos.length ? (
            <EmptyState icon={<Building2 className="size-6" />} title="No tienes proyectos asignados" description="La jefatura debe darte acceso a un proyecto para que aparezca aquí." />
          ) : (
            <Table className="min-w-[720px]">
              <thead>
                <tr>
                  <th className={th}>Proyecto</th>
                  <th className={th}>Rubro</th>
                  <th className={th}>Vigencia</th>
                  <th className={th}>Estado</th>
                  <th className={th}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {proyectos.slice(0, 8).map((proyecto) => (
                  <tr key={proyecto.id} className="group hover:bg-slate-50">
                    <td className={td}>
                      <Link to={`/proyectos/${proyecto.id}`} className="font-semibold text-slate-900 group-hover:text-brand-700">{proyecto.nombre}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">{proyecto.cliente.nombre}</p>
                    </td>
                    <td className={td}>{RUBRO_OBRA[proyecto.rubro]}</td>
                    <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(proyecto.fechaInicio)} – {formatFecha(proyecto.fechaFin)}</td>
                    <td className={td}><EstadoProyectoBadge estado={proyecto.estado} /></td>
                    <td className={`${td} text-right`}>
                      <Link to={`/proyectos/${proyecto.id}/expediente/etapas`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-brand-700">
                        Expediente <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Requiere atención" subtitle="Etapas observadas o pendientes de revisión." />
          {!pendientes.length ? (
            <EmptyState icon={<ClipboardCheck className="size-6" />} title="Sin alertas recientes" description="No hay documentos recientes con observaciones ni revisiones pendientes." />
          ) : (
            <div className="divide-y divide-slate-100">
              {pendientes.map((documento) => {
                const estado = ESTADO_ETAPA[documento.etapa.estado];
                return (
                  <Link key={documento.id} to={`/proyectos/${documento.proyectoId}/expediente/etapas`} className="block px-5 py-3.5 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{documento.nombreArchivo}</p>
                      <Badge color={estado.color}>{estado.label}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{documento.proyecto.nombre} · {TIPO_ETAPA[documento.etapa.tipo]}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
