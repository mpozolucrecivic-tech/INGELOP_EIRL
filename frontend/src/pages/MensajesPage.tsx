import { useDeferredValue, useState } from 'react';
import { Inbox, Mail, MailOpen, Phone, Search } from 'lucide-react';
import { useMarcarLeido, useMensajes } from '@/api/admin';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatFechaHora, TIPO_MENSAJE } from '@/lib/format';
import type { MensajeContacto, TipoMensaje } from '@/types/api';

export default function MensajesPage() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoMensaje | ''>('');
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [abierto, setAbierto] = useState<MensajeContacto | null>(null);
  const busqueda = useDeferredValue(q.trim());
  const { data: mensajes, isLoading, error, refetch } = useMensajes({
    ...(busqueda && { q: busqueda }),
    ...(tipo && { tipo }),
    ...(soloNoLeidos && { leido: false }),
  });
  const marcar = useMarcarLeido();

  const abrir = (m: MensajeContacto) => {
    setAbierto(m);
    if (!m.leido) marcar.mutate({ id: m.id, leido: true });
  };

  const noLeidos = mensajes?.filter((m) => !m.leido).length ?? 0;

  return (
    <>
      <PageHeader
        title="Mensajes de la web"
        subtitle={
          <>
            Mensajes y consultas técnicas enviados desde el formulario de contacto.
            {noLeidos > 0 && <Badge color="amber" className="ml-2">{noLeidos} sin leer</Badge>}
          </>
        }
      />

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
          <input type="checkbox" className="size-4 accent-amber-500" checked={soloNoLeidos} onChange={(e) => setSoloNoLeidos(e.target.checked)} />
          Solo sin leer
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
          <EmptyState
            icon={<Inbox className="size-6" />}
            title={busqueda || tipo || soloNoLeidos ? 'Sin resultados' : 'Sin mensajes'}
            description={busqueda || tipo || soloNoLeidos ? undefined : 'Aquí llegarán los mensajes del formulario de contacto de la web.'}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Remitente</th>
                <th className={th}>Tipo</th>
                <th className={th}>Mensaje</th>
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
                  </td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <IconButton
                        label={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                        onClick={(e) => {
                          e.stopPropagation();
                          marcar.mutate({ id: m.id, leido: !m.leido });
                        }}
                      >
                        {m.leido ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                      </IconButton>
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
        title={abierto ? `Mensaje de ${abierto.nombre}` : ''}
        description={abierto ? formatFechaHora(abierto.fecha) : undefined}
        footer={
          abierto && (
            <>
              <Button variant="secondary" onClick={() => setAbierto(null)}>
                Cerrar
              </Button>
              <a
                href={`mailto:${abierto.correo}?subject=${encodeURIComponent('Respuesta de INGELOP')}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-brand-400"
              >
                <Mail className="size-4" />
                Responder por correo
              </a>
            </>
          )
        }
      >
        {abierto && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
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
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">{abierto.mensaje}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
