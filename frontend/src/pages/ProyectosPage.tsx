import { useDeferredValue, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, Building2, Calendar, FileStack, MapPin, Plus, Search } from 'lucide-react';
import { useProyectos } from '@/api/proyectos';
import { EstadoProyectoBadge } from '@/components/Common';
import { Button } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_PROYECTO, formatFecha, formatSoles, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import type { EstadoProyecto, RubroObra } from '@/types/api';
import { ProyectoFormModal } from './ProyectoForm';

export default function ProyectosPage() {
  const { esAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [estado, setEstado] = useState<EstadoProyecto | ''>('');
  const [rubro, setRubro] = useState<RubroObra | ''>('');
  const [creando, setCreando] = useState(false);
  const busqueda = useDeferredValue(q.trim());

  const { data: proyectos, isLoading, error, refetch } = useProyectos({
    ...(busqueda && { q: busqueda }),
    ...(estado && { estado }),
    ...(rubro && { rubro }),
  });

  return (
    <>
      <PageHeader
        title="Proyectos"
        subtitle={esAdmin ? 'Control de expedientes, diseños y servicios de consultoría.' : 'Proyectos en los que participas.'}
        actions={
          esAdmin && (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreando(true)}>
              Nuevo proyecto
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por proyecto, cliente o ubicación…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar proyectos" />
        </div>
        <Select value={rubro} onChange={(e) => setRubro(e.target.value as RubroObra | '')} wrapperClassName="sm:w-64" aria-label="Filtrar por rubro">
          <option value="">Todos los rubros</option>
          {(Object.keys(RUBRO_OBRA) as RubroObra[]).map((r) => <option key={r} value={r}>{RUBRO_OBRA[r]}</option>)}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto | '')} wrapperClassName="sm:w-52" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_PROYECTO) as EstadoProyecto[]).map((e) => <option key={e} value={e}>{ESTADO_PROYECTO[e].label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !proyectos?.length ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-6" />}
            title={busqueda || estado || rubro ? 'Sin resultados' : 'Aún no hay proyectos'}
            description={
              busqueda || estado || rubro
                ? 'Prueba con otra búsqueda o filtro.'
                : esAdmin
                  ? 'Crea el primer proyecto para empezar a registrar su avance.'
                  : 'Todavía no te han asignado a ningún proyecto. Consulta con el administrador.'
            }
          />
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <Table className="min-w-[980px]">
              <thead>
                <tr>
                  <th className={th}>Proyecto</th>
                  <th className={th}>Servicio</th>
                  <th className={th}>Ubicación</th>
                  <th className={th}>Plazo</th>
                  {esAdmin && <th className={`${th} text-right`}>Contrato</th>}
                  <th className={th}>Estado</th>
                  <th className={th}>Expediente</th>
                  <th className={th}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50">
                    <td className={td}>
                      <Link to={`/proyectos/${p.id}`} className="font-semibold text-slate-900 group-hover:text-brand-700">{p.nombre}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">{p.cliente.nombre}</p>
                    </td>
                    <td className={td}>
                      <p className="text-slate-700">{TIPO_SERVICIO[p.tipoServicio]}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{RUBRO_OBRA[p.rubro]}</p>
                    </td>
                    <td className={`${td} max-w-48 truncate text-slate-600`}>{p.ubicacion}</td>
                    <td className={`${td} whitespace-nowrap text-xs text-slate-600`}>{formatFecha(p.fechaInicio)}<br />{formatFecha(p.fechaFin)}</td>
                    {esAdmin && <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums text-slate-900`}>{formatSoles(p.montoContrato)}</td>}
                    <td className={td}><EstadoProyectoBadge estado={p.estado} /></td>
                    <td className={`${td} whitespace-nowrap text-xs text-slate-600`}>
                      <span>{p._count?.planos ?? 0} planos</span><br />
                      <span>{p._count?.entregables ?? 0} entregables</span>
                    </td>
                    <td className={`${td} text-right`}>
                      <Link to={`/proyectos/${p.id}`} aria-label={`Abrir ${p.nombre}`} className="inline-flex rounded-md p-2 text-slate-400 hover:bg-white hover:text-brand-700">
                        <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {proyectos.map((p) => (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="group">
                <Card className="p-4 group-focus-visible:ring-2 group-focus-visible:ring-brand-500">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold leading-snug text-slate-900 group-hover:text-brand-700">{p.nombre}</h2>
                    <EstadoProyectoBadge estado={p.estado} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{p.cliente.nombre}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge color="violet">{TIPO_SERVICIO[p.tipoServicio]}</Badge>
                    <Badge color="blue">{RUBRO_OBRA[p.rubro]}</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-slate-400" /><span className="truncate">{p.ubicacion}</span></p>
                    <p className="flex items-center gap-2"><Calendar className="size-4 shrink-0 text-slate-400" />{formatFecha(p.fechaInicio)} – {formatFecha(p.fechaFin)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><FileStack className="size-3.5" />{p._count?.planos ?? 0} planos</span>
                    <span>{esAdmin ? formatSoles(p.montoContrato) : p.responsable.nombre}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {esAdmin && <ProyectoFormModal open={creando} onClose={() => setCreando(false)} onCreated={(p) => navigate(`/proyectos/${p.id}`)} />}
    </>
  );
}
