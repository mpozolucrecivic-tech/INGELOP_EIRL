import { useDeferredValue, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Building2, Calendar, FileStack, MapPin, Plus, Search } from 'lucide-react';
import { useProyectos } from '@/api/proyectos';
import { EstadoProyectoBadge } from '@/components/Common';
import { Button } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_PROYECTO, formatFecha, formatSoles, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import type { EstadoProyecto, RubroObra } from '@/types/api';
import { ProyectoFormModal } from './ProyectoForm';

export default function ProyectosPage() {
  const { esAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? ''); // permite enlazar desde Clientes
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
        subtitle={esAdmin ? 'Expedientes, diseños y servicios de consultoría.' : 'Proyectos en los que participas.'}
        actions={
          esAdmin && (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreando(true)}>
              Nuevo proyecto
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por proyecto, cliente o ubicación…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar proyectos" />
        </div>
        <Select value={rubro} onChange={(e) => setRubro(e.target.value as RubroObra | '')} wrapperClassName="sm:w-64" aria-label="Filtrar por rubro">
          <option value="">Todos los rubros</option>
          {(Object.keys(RUBRO_OBRA) as RubroObra[]).map((r) => (
            <option key={r} value={r}>
              {RUBRO_OBRA[r]}
            </option>
          ))}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto | '')} wrapperClassName="sm:w-52" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_PROYECTO) as EstadoProyecto[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_PROYECTO[e].label}
            </option>
          ))}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((p) => (
            <Link key={p.id} to={`/proyectos/${p.id}`} className="group">
              <Card className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-500">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug text-slate-900 group-hover:text-brand-700">{p.nombre}</h2>
                  <EstadoProyectoBadge estado={p.estado} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{p.cliente.nombre}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge color="violet">{TIPO_SERVICIO[p.tipoServicio]}</Badge>
                  <Badge color="blue">{RUBRO_OBRA[p.rubro]}</Badge>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate">{p.ubicacion}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0 text-slate-400" />
                    {formatFecha(p.fechaInicio)} – {formatFecha(p.fechaFin)}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  {esAdmin ? (
                    <span className="font-semibold tabular-nums text-slate-900">{formatSoles(p.montoContrato)}</span>
                  ) : (
                    <span className="text-slate-500">Resp.: {p.responsable.nombre}</span>
                  )}
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1" title="Planos">
                      <FileStack className="size-3.5" />
                      {p._count?.planos ?? 0} planos
                    </span>
                    <span>{p._count?.entregables ?? 0} entregables</span>
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {esAdmin && <ProyectoFormModal open={creando} onClose={() => setCreando(false)} onCreated={(p) => navigate(`/proyectos/${p.id}`)} />}
    </>
  );
}
