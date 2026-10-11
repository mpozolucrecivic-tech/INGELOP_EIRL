import { useState } from 'react';
import { AlertTriangle, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { descargarCsvAuditoria, useAlertasAuditoria, useAuditoria, type FiltrosAuditoria } from '@/api/auditoria';
import { useUsuarios } from '@/api/admin';
import { mensajeError } from '@/api/client';
import { TextoAyuda } from '@/components/Common';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ACCION_AUDITORIA, formatFechaHora } from '@/lib/format';
import type { RegistroAuditoria } from '@/types/api';

const MODULOS = ['auth', 'usuarios', 'clientes', 'proyectos', 'planos', 'presupuestos', 'entregables', 'evidencias', 'gastos', 'trabajadores', 'cms', 'servicios', 'sitio', 'portafolio', 'contacto', 'auditoria'];
const POR_PAGINA = 50;

const accion = (a: string) => ACCION_AUDITORIA[a] ?? { label: a, color: 'slate' as const };

/** Navegador legible a partir del user-agent */
function navegador(ua: string | null) {
  if (!ua) return '—';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Otro';
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return so ? `${nav} · ${so}` : nav;
}

function Alertas() {
  const { data, isLoading, error, refetch } = useAlertasAuditoria();
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const hayAlertas = data.loginsFallidos + data.bloqueos + data.accesosDenegados + data.tokensAlterados > 0 || data.accesosNuevos.length > 0;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inicios de sesión fallidos" value={data.loginsFallidos} tone={data.loginsFallidos ? 'warning' : 'success'} icon={<AlertTriangle className="size-5" />} hint="Últimas 24 horas" />
        <StatCard label="Cuentas o IP bloqueadas" value={data.bloqueos} tone={data.bloqueos ? 'danger' : 'success'} icon={<ShieldAlert className="size-5" />} hint="Por demasiados intentos" />
        <StatCard label="Accesos denegados" value={data.accesosDenegados} tone={data.accesosDenegados ? 'warning' : 'success'} icon={<ShieldAlert className="size-5" />} hint="Intentos de entrar donde no tienen permiso" />
        <StatCard label="Sesiones alteradas" value={data.tokensAlterados} tone={data.tokensAlterados ? 'danger' : 'success'} icon={<ShieldCheck className="size-5" />} hint="Credenciales manipuladas o falsas" />
      </div>
      {hayAlertas && (data.ipsSospechosas.length > 0 || data.accesosNuevos.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="IP con actividad sospechosa" subtitle="3 o más fallos, bloqueos o accesos denegados en 24 horas" />
            {data.ipsSospechosas.length ? (
              <ul className="divide-y divide-slate-100">
                {data.ipsSospechosas.map((i) => (
                  <li key={i.ip} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="font-mono">{i.ip}</span>
                    <Badge color="red">{i.eventos} eventos</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">Ninguna.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Accesos desde un lugar o equipo nuevo" subtitle="Últimos 7 días: IP o navegador que la persona no había usado antes" />
            {data.accesosNuevos.length ? (
              <ul className="divide-y divide-slate-100">
                {data.accesosNuevos.map((a) => (
                  <li key={a.id} className="px-5 py-2.5 text-sm">
                    <span className="font-medium text-slate-900">{a.usuarioNombre}</span>
                    <span className="text-slate-500"> · {formatFechaHora(a.fecha)}</span>
                    <p className="text-xs text-slate-500">
                      {a.detalle?.ipNueva ? <>IP nueva: <span className="font-mono">{a.ip}</span></> : null}
                      {a.detalle?.ipNueva && a.detalle?.navegadorNuevo ? ' · ' : null}
                      {a.detalle?.navegadorNuevo ? `Navegador nuevo: ${navegador(a.navegador)}` : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">Ninguno.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

export default function AuditoriaPage() {
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({ pagina: 1, porPagina: POR_PAGINA });
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null);
  const [exportando, setExportando] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useAuditoria(filtros);
  const { data: usuarios } = useUsuarios({});
  const filtrar = (cambio: Partial<FiltrosAuditoria>) => setFiltros((f) => ({ ...f, ...cambio, pagina: 1 }));
  const paginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  const exportar = async () => {
    setExportando(true);
    try {
      await descargarCsvAuditoria(filtros);
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Auditoría"
        subtitle="Quién hizo qué, cuándo y desde dónde. Los registros no se pueden editar ni borrar."
        actions={
          <Button variant="secondary" icon={<Download className="size-4" />} loading={exportando} onClick={exportar}>
            Exportar a Excel (CSV)
          </Button>
        }
      />
      <TextoAyuda>
        Se registran los inicios de sesión (correctos, fallidos y bloqueados), los accesos denegados y toda creación, edición, eliminación, subida y
        descarga de archivos. Nunca se guardan contraseñas. Los registros se conservan al menos 2 años. Consultar esta página también queda
        registrado.
      </TextoAyuda>

      <Alertas />

      <Card className="mt-6">
        <CardHeader title="Registro de actividad" subtitle={data ? `${data.total.toLocaleString('es-PE')} registros${isFetching ? ' · actualizando…' : ''}` : undefined} />
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Input label="Desde" type="date" value={filtros.desde ?? ''} onChange={(e) => filtrar({ desde: e.target.value || undefined })} />
          <Input label="Hasta" type="date" value={filtros.hasta ?? ''} onChange={(e) => filtrar({ hasta: e.target.value || undefined })} />
          <Select label="Persona" value={filtros.usuarioId ?? ''} onChange={(e) => filtrar({ usuarioId: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Todas</option>
            {usuarios?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
          <Select label="Acción" value={filtros.accion ?? ''} onChange={(e) => filtrar({ accion: e.target.value || undefined })}>
            <option value="">Todas</option>
            {Object.entries(ACCION_AUDITORIA).map(([valor, { label }]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Módulo" value={filtros.modulo ?? ''} onChange={(e) => filtrar({ modulo: e.target.value || undefined })}>
            <option value="">Todos</option>
            {MODULOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Select label="Resultado" value={filtros.resultado ?? ''} onChange={(e) => filtrar({ resultado: (e.target.value || undefined) as FiltrosAuditoria['resultado'] })}>
            <option value="">Todos</option>
            <option value="EXITO">Correcto</option>
            <option value="FALLO">Fallido</option>
          </Select>
          <Input label="IP" placeholder="Ej. 190.12" value={filtros.ip ?? ''} onChange={(e) => filtrar({ ip: e.target.value.trim() || undefined })} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.registros.length ? (
          <EmptyState icon={<ShieldCheck className="size-6" />} title="Sin registros" description="No hay actividad con esos filtros." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Fecha y hora</th>
                  <th className={th}>Persona</th>
                  <th className={th}>Acción</th>
                  <th className={th}>Módulo</th>
                  <th className={th}>Resultado</th>
                  <th className={th}>IP</th>
                  <th className={th}>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {data.registros.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetalle(r)}>
                    <td className={`${td} whitespace-nowrap text-xs`}>{formatFechaHora(r.fecha)}</td>
                    <td className={td}>
                      <span className="text-slate-900">{r.usuarioNombre ?? '—'}</span>
                      {r.correo && !r.usuarioNombre && <p className="text-xs text-slate-500">{r.correo}</p>}
                    </td>
                    <td className={td}>
                      <Badge color={accion(r.accion).color}>{accion(r.accion).label}</Badge>
                    </td>
                    <td className={`${td} text-sm text-slate-600`}>
                      {r.modulo}
                      {r.registroId && <span className="text-slate-400"> #{r.registroId}</span>}
                    </td>
                    <td className={td}>{r.resultado === 'EXITO' ? <Badge color="green">Correcto</Badge> : <Badge color="red">Fallido</Badge>}</td>
                    <td className={`${td} font-mono text-xs`}>{r.ip ?? '—'}</td>
                    <td className={`${td} text-xs text-slate-500`}>{navegador(r.navegador)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
              <span>
                Página {data.pagina} de {paginas}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={data.pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" disabled={data.pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}>
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} size="lg" title={detalle ? accion(detalle.accion).label : ''} description={detalle ? formatFechaHora(detalle.fecha) : undefined}>
        {detalle && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {(
              [
                ['Persona', detalle.usuarioNombre ?? '—'],
                ['Correo usado', detalle.correo],
                ['Módulo', `${detalle.modulo}${detalle.registroId ? ` · registro ${detalle.registroId}` : ''}`],
                ['Resultado', `${detalle.resultado === 'EXITO' ? 'Correcto' : 'Fallido'}${detalle.codigoHttp ? ` (código ${detalle.codigoHttp})` : ''}`],
                ['IP', detalle.ip],
                ['Cadena de IP', detalle.cadenaIp],
                ['Navegador', detalle.navegador],
                ['Operación', detalle.metodo && detalle.ruta ? `${detalle.metodo} ${detalle.ruta}` : null],
                ['Id de petición', detalle.idPeticion],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="break-all font-mono text-xs text-slate-800">{v}</dd>
                </div>
              ))}
            {detalle.detalle && (
              <>
                <dt className="text-slate-500">Detalle</dt>
                <dd>
                  <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(detalle.detalle, null, 2)}</pre>
                </dd>
              </>
            )}
          </dl>
        )}
      </Modal>
    </>
  );
}
