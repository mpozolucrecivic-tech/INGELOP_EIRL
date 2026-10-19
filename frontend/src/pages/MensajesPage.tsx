import { useDeferredValue, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Archive, ArchiveRestore, CheckCheck, Inbox, Mail, MailOpen, Phone, RotateCcw, Search, StickyNote, Trash2 } from 'lucide-react';
import { useCambiarEstadoMensaje, useEliminarMensaje, useGuardarNotaMensaje, useMarcarLeido, useMensajes } from '@/api/admin';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { ESTADO_MENSAJE, formatFechaHora, TIPO_MENSAJE } from '@/lib/format';
import type { EstadoMensaje, MensajeContacto, TipoMensaje } from '@/types/api';

type Vista = 'NUEVO' | 'RESPONDIDO' | 'ARCHIVADO' | 'TODOS';

const VISTAS: { valor: Vista; label: string }[] = [
  { valor: 'NUEVO', label: 'Por atender' },
  { valor: 'RESPONDIDO', label: 'Respondidos' },
  { valor: 'ARCHIVADO', label: 'Archivados' },
  { valor: 'TODOS', label: 'Todos' },
];

const VACIO: Record<Vista, string> = {
  NUEVO: 'No hay mensajes por atender.',
  RESPONDIDO: 'Aún no marcaste mensajes como respondidos.',
  ARCHIVADO: 'No hay mensajes archivados.',
  TODOS: 'Aquí llegarán los mensajes del formulario de contacto de la web.',
};

export default function MensajesPage() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoMensaje | ''>('');
  const [vista, setVista] = useState<Vista>('NUEVO');
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [abierto, setAbierto] = useState<MensajeContacto | null>(null);
  const [nota, setNota] = useState('');
  const busqueda = useDeferredValue(q.trim());
  const { data: mensajes, isLoading, error, refetch } = useMensajes({
    ...(busqueda && { q: busqueda }),
    ...(tipo && { tipo }),
    ...(vista !== 'TODOS' && { estado: vista }),
    ...(soloNoLeidos && { leido: false }),
  });
  const { data: porAtender } = useMensajes({ estado: 'NUEVO' });
  const marcar = useMarcarLeido();
  const cambiarEstado = useCambiarEstadoMensaje();
  const guardarNota = useGuardarNotaMensaje();
  const eliminar = useEliminarMensaje();
  const { confirm, dialog } = useConfirm();

  useEffect(() => setNota(abierto?.nota ?? ''), [abierto?.id, abierto?.nota]);

  const abrir = (m: MensajeContacto) => {
    setAbierto(m);
    if (!m.leido) marcar.mutate({ id: m.id, leido: true });
  };

  /** Cambia el estado y mantiene el detalle abierto con los datos nuevos (servicioNombre solo viene en el listado) */
  const aplicarEstado = (m: MensajeContacto, estado: EstadoMensaje, cerrar = false) =>
    cambiarEstado.mutate(
      { id: m.id, estado },
      { onSuccess: (actualizado) => setAbierto((a) => (cerrar || !a || a.id !== m.id ? null : { ...a, ...actualizado })) },
    );

  const noLeidos = mensajes?.filter((m) => !m.leido).length ?? 0;
  const pendientes = porAtender?.length ?? 0;
  const conFiltros = !!(busqueda || tipo || soloNoLeidos);
  const notaCambiada = !!abierto && nota.trim() !== (abierto.nota ?? '');

  return (
    <>
      <PageHeader
        title="Mensajes de la web"
        subtitle={
          <>
            Mensajes y consultas técnicas enviados desde el formulario de contacto.
            {pendientes > 0 && <Badge color="amber" className="ml-2">{pendientes} por atender</Badge>}
          </>
        }
      />

      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:inline-flex" aria-label="Estado de los mensajes">
        {VISTAS.map((v) => (
          <button
            key={v.valor}
            type="button"
            aria-pressed={vista === v.valor}
            onClick={() => setVista(v.valor)}
            className={clsx(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              vista === v.valor ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900',
            )}
          >
            {v.label}
            {v.valor === 'NUEVO' && pendientes > 0 && <span className="ml-1.5 text-xs opacity-80">({pendientes})</span>}
          </button>
        ))}
      </nav>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nombre, correo, entidad o texto…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar mensajes" />
        </div>
        <Select aria-label="Tipo de mensaje" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMensaje | '')} wrapperClassName="sm:w-52">
          <option value="">Todos los tipos</option>
          {(Object.keys(TIPO_MENSAJE) as TipoMensaje[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_MENSAJE[t].label}
            </option>
          ))}
        </Select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="size-4 accent-brand-600" checked={soloNoLeidos} onChange={(e) => setSoloNoLeidos(e.target.checked)} />
          Solo sin leer{noLeidos > 0 && !soloNoLeidos ? ` (${noLeidos})` : ''}
        </label>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !mensajes?.length ? (
          <EmptyState icon={<Inbox className="size-6" />} title={conFiltros ? 'Sin resultados' : 'Sin mensajes'} description={conFiltros ? undefined : VACIO[vista]} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Remitente</th>
                <th className={th}>Tipo</th>
                <th className={th}>Mensaje</th>
                {vista === 'TODOS' && <th className={th}>Estado</th>}
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {mensajes.map((m) => (
                <tr key={m.id} className={`cursor-pointer hover:bg-slate-50 ${m.leido ? 'text-slate-500' : ''}`} onClick={() => abrir(m)}>
                  <td className={`${td} whitespace-nowrap text-xs`}>{formatFechaHora(m.fecha)}</td>
                  <td className={td}>
                    <span className={m.leido ? 'text-slate-700' : 'font-semibold text-slate-900'}>{m.nombre}</span>
                    <p className="text-xs text-slate-500">{m.entidad ?? m.correo}</p>
                  </td>
                  <td className={td}>
                    <Badge color={TIPO_MENSAJE[m.tipo].color}>{TIPO_MENSAJE[m.tipo].label}</Badge>
                  </td>
                  <td className={td}>
                    {m.servicioNombre && <p className="text-xs font-medium text-slate-700">{m.servicioNombre}</p>}
                    <p className="line-clamp-1 max-w-md text-sm">{m.mensaje}</p>
                    {m.nota && (
                      <p className="mt-0.5 flex max-w-md items-center gap-1 text-xs text-slate-500">
                        <StickyNote className="size-3 shrink-0" />
                        <span className="line-clamp-1">{m.nota}</span>
                      </p>
                    )}
                  </td>
                  {vista === 'TODOS' && (
                    <td className={td}>
                      <Badge color={ESTADO_MENSAJE[m.estado].color}>{ESTADO_MENSAJE[m.estado].label}</Badge>
                    </td>
                  )}
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                        onClick={(e) => {
                          e.stopPropagation();
                          marcar.mutate({ id: m.id, leido: !m.leido });
                        }}
                      >
                        {m.leido ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                      </IconButton>
                      {m.estado !== 'ARCHIVADO' && (
                        <IconButton
                          label="Archivar"
                          onClick={(e) => {
                            e.stopPropagation();
                            aplicarEstado(m, 'ARCHIVADO');
                          }}
                        >
                          <Archive className="size-4" />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!abierto}
        onClose={() => setAbierto(null)}
        size="lg"
        title={abierto ? `Mensaje de ${abierto.nombre}` : ''}
        description={abierto ? formatFechaHora(abierto.fecha) : undefined}
        footer={
          abierto && (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() =>
                  confirm({
                    title: 'Eliminar mensaje',
                    message: `¿Eliminar el mensaje de ${abierto.nombre}? No se puede deshacer. Si solo quieres sacarlo de la bandeja, archívalo.`,
                    onConfirm: () => eliminar.mutateAsync(abierto.id).then(() => setAbierto(null)),
                  })
                }
              >
                Eliminar
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                {abierto.estado === 'ARCHIVADO' ? (
                  <Button
                    variant="secondary"
                    icon={<ArchiveRestore className="size-4" />}
                    loading={cambiarEstado.isPending}
                    onClick={() => aplicarEstado(abierto, abierto.respondidoEn ? 'RESPONDIDO' : 'NUEVO')}
                  >
                    Sacar del archivo
                  </Button>
                ) : (
                  <Button variant="secondary" icon={<Archive className="size-4" />} loading={cambiarEstado.isPending} onClick={() => aplicarEstado(abierto, 'ARCHIVADO', true)}>
                    Archivar
                  </Button>
                )}
                {abierto.estado === 'RESPONDIDO' ? (
                  <Button variant="secondary" icon={<RotateCcw className="size-4" />} loading={cambiarEstado.isPending} onClick={() => aplicarEstado(abierto, 'NUEVO')}>
                    Volver a por atender
                  </Button>
                ) : (
                  abierto.estado === 'NUEVO' && (
                    <Button variant="secondary" icon={<CheckCheck className="size-4" />} loading={cambiarEstado.isPending} onClick={() => aplicarEstado(abierto, 'RESPONDIDO')}>
                      Marcar como respondido
                    </Button>
                  )
                )}
                <a
                  href={`mailto:${abierto.correo}?subject=${encodeURIComponent('Respuesta de INGELOP')}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-brand-400"
                >
                  <Mail className="size-4" />
                  Responder por correo
                </a>
              </div>
            </div>
          )
        }
      >
        {abierto && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge color={ESTADO_MENSAJE[abierto.estado].color}>{ESTADO_MENSAJE[abierto.estado].label}</Badge>
              <Badge color={TIPO_MENSAJE[abierto.tipo].color}>{TIPO_MENSAJE[abierto.tipo].label}</Badge>
              {abierto.servicioNombre && <Badge color="amber">{abierto.servicioNombre}</Badge>}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-slate-700">
              <dt className="text-slate-500">Correo</dt>
              <dd>
                <a href={`mailto:${abierto.correo}`} className="text-brand-700 hover:underline">
                  {abierto.correo}
                </a>
              </dd>
              {abierto.telefono && (
                <>
                  <dt className="text-slate-500">Teléfono</dt>
                  <dd className="flex items-center gap-1">
                    <Phone className="size-3" />
                    <a href={`tel:${abierto.telefono.replace(/[^\d+]/g, '')}`} className="hover:underline">
                      {abierto.telefono}
                    </a>
                  </dd>
                </>
              )}
              {abierto.entidad && (
                <>
                  <dt className="text-slate-500">Entidad / empresa</dt>
                  <dd>{abierto.entidad}</dd>
                </>
              )}
              {abierto.respondidoEn && (
                <>
                  <dt className="text-slate-500">Respondido</dt>
                  <dd>{formatFechaHora(abierto.respondidoEn)}</dd>
                </>
              )}
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{abierto.mensaje}</p>

            <div>
              <Textarea
                label="Nota interna"
                hint="Solo la ve la jefatura. Ej.: «Se envió la cotización el 20/10»."
                rows={3}
                maxLength={2000}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
              {notaCambiada && (
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setNota(abierto.nota ?? '')}>
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    loading={guardarNota.isPending}
                    onClick={() =>
                      guardarNota.mutate({ id: abierto.id, nota: nota.trim() }, { onSuccess: (m) => setAbierto((a) => (a && a.id === m.id ? { ...a, ...m } : a)) })
                    }
                  >
                    Guardar nota
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {dialog}
    </>
  );
}
