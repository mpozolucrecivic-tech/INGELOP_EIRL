import { useState } from 'react';
import { Link } from 'react-router';
import { Download, FileText, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { descargarDocumento, useEliminarDocumento, useListadoDocumentos, type FiltrosDocumentos } from '@/api/documentos';
import { useUsuarios } from '@/api/admin';
import { useProyectos } from '@/api/proyectos';
import { mensajeError } from '@/api/client';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { useConfirm } from '@/components/ui/Modal';
import { CATEGORIA_DOCUMENTO, ESTADO_ETAPA, formatBytes, formatFechaHora, ORDEN_ETAPAS, TIPO_ETAPA } from '@/lib/format';
import type { CategoriaDocumento, TipoEtapa } from '@/types/api';

const POR_PAGINA = 25;

/** "todos": vista de la jefatura con todos los documentos. "mios": historial de lo que subió cada persona. */
export default function DocumentosPage({ modo }: { modo: 'todos' | 'mios' }) {
  const [filtros, setFiltros] = useState<FiltrosDocumentos>({ pagina: 1, porPagina: POR_PAGINA });
  const { data, isLoading, error, refetch, isFetching } = useListadoDocumentos(modo, filtros);
  const { data: proyectos } = useProyectos();
  const { data: usuarios } = useUsuarios({}, modo === 'todos');
  const eliminar = useEliminarDocumento();
  const { confirm, dialog } = useConfirm();
  const filtrar = (cambio: Partial<FiltrosDocumentos>) => setFiltros((f) => ({ ...f, ...cambio, pagina: 1 }));
  const paginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;
  const todos = modo === 'todos';

  return (
    <>
      <PageHeader
        title={todos ? 'Expedientes' : 'Mis documentos'}
        subtitle={
          todos
            ? 'Todos los documentos de todos los proyectos, por etapa y categoría.'
            : 'Tu historial: los documentos que subiste a tus proyectos.'
        }
      />
      <TextoAyuda>
        {todos
          ? 'Usa los filtros para encontrar un documento. Cada descarga y eliminación queda registrada en la auditoría.'
          : 'Para subir un documento, entra al proyecto y abre la pestaña «Etapas y documentos».'}
      </TextoAyuda>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Input
              label="Buscar"
              placeholder="Archivo, descripción o proyecto"
              value={filtros.q ?? ''}
              onChange={(e) => filtrar({ q: e.target.value || undefined })}
              className="pl-9"
            />
            <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-slate-400" />
          </div>
          <Select label="Proyecto" value={filtros.proyectoId ?? ''} onChange={(e) => filtrar({ proyectoId: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Todos</option>
            {proyectos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <Select label="Etapa" value={filtros.etapa ?? ''} onChange={(e) => filtrar({ etapa: (e.target.value || undefined) as TipoEtapa | undefined })}>
            <option value="">Todas</option>
            {ORDEN_ETAPAS.map((t) => (
              <option key={t} value={t}>
                {TIPO_ETAPA[t]}
              </option>
            ))}
          </Select>
          <Select label="Categoría" value={filtros.categoria ?? ''} onChange={(e) => filtrar({ categoria: (e.target.value || undefined) as CategoriaDocumento | undefined })}>
            <option value="">Todas</option>
            {(Object.keys(CATEGORIA_DOCUMENTO) as CategoriaDocumento[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_DOCUMENTO[c]}
              </option>
            ))}
          </Select>
          {todos && (
            <Select label="Subido por" value={filtros.usuarioId ?? ''} onChange={(e) => filtrar({ usuarioId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Todos</option>
              {usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
          )}
          <Input label="Desde" type="date" value={filtros.desde ?? ''} onChange={(e) => filtrar({ desde: e.target.value || undefined })} />
          <Input label="Hasta" type="date" value={filtros.hasta ?? ''} onChange={(e) => filtrar({ hasta: e.target.value || undefined })} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.documentos.length ? (
          <EmptyState icon={<FileText className="size-6" />} title="Sin documentos" description={todos ? 'No hay documentos con esos filtros.' : 'Aún no subiste documentos (o ninguno coincide con los filtros).'} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Documento</th>
                  <th className={th}>Proyecto · etapa</th>
                  <th className={th}>Categoría</th>
                  {todos && <th className={th}>Subido por</th>}
                  <th className={th}>Fecha</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {data.documentos.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className={td}>
                      <p className="max-w-xs truncate font-medium text-slate-900">{d.nombreArchivo}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(d.tamano)}
                        {d.descripcion && ` · ${d.descripcion}`}
                      </p>
                    </td>
                    <td className={td}>
                      <Link to={`/proyectos/${d.proyecto.id}/expediente/etapas`} className="text-sm text-brand-700 hover:underline">
                        {d.proyecto.nombre}
                      </Link>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        {TIPO_ETAPA[d.etapa.tipo]} <Badge color={ESTADO_ETAPA[d.etapa.estado].color}>{ESTADO_ETAPA[d.etapa.estado].label}</Badge>
                      </p>
                    </td>
                    <td className={`${td} text-sm`}>{CATEGORIA_DOCUMENTO[d.categoria]}</td>
                    {todos && <td className={`${td} text-sm`}>{d.usuario.nombre}</td>}
                    <td className={`${td} whitespace-nowrap text-xs`}>{formatFechaHora(d.fecha)}</td>
                    <td className={td}>
                      <div className="flex justify-end">
                        <IconButton label="Descargar" onClick={() => descargarDocumento(d).catch((e) => toast.error(mensajeError(e)))}>
                          <Download className="size-4" />
                        </IconButton>
                        {todos && (
                          <IconButton
                            label="Eliminar documento"
                            className="hover:text-red-600"
                            onClick={() => confirm({ title: 'Eliminar documento', message: `¿Eliminar «${d.nombreArchivo}»? No se puede deshacer.`, onConfirm: () => eliminar.mutateAsync(d.id) })}
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
              <span>
                {data.total} documentos · página {data.pagina} de {paginas}
                {isFetching && ' · actualizando…'}
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
      {dialog}
    </>
  );
}
