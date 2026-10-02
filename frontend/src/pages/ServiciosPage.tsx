import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, ImageOff, Layers, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActualizarServicio,
  useCrearServicio,
  useDesactivarServicio,
  useQuitarFotoServicio,
  useServicios,
  useSubirFotoServicio,
} from '@/api/admin';
import { API_URL } from '@/api/client';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { ICONOS_WEB } from '@/lib/format';
import type { Servicio } from '@/types/api';

/** Mismos formatos y tamaño que valida la API (MAX_FOTO_MB) */
const FORMATOS_FOTO = '.jpg,.jpeg,.png,.webp';
const MAX_FOTO_MB = 5;

const fotoSrc = (s: Servicio) => (s.fotoUrl ? `${API_URL}${s.fotoUrl}` : null);

export default function ServiciosPage() {
  const { data: servicios, isLoading, error, refetch } = useServicios();
  const [modal, setModal] = useState<{ servicio?: Servicio } | null>(null);
  const actualizar = useActualizarServicio();
  const desactivar = useDesactivarServicio();
  const [moviendo, setMoviendo] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Intercambia el orden con el servicio vecino (la web los muestra en este orden)
  const mover = async (i: number, delta: -1 | 1) => {
    if (!servicios) return;
    const a = servicios[i];
    const b = servicios[i + delta];
    if (!b) return;
    setMoviendo(true);
    try {
      // Si comparten orden, se separan para que el cambio sea visible
      const ordenA = a.orden === b.orden ? b.orden + delta : b.orden;
      await actualizar.mutateAsync({ id: a.id, orden: Math.max(0, ordenA) });
      await actualizar.mutateAsync({ id: b.id, orden: a.orden });
    } finally {
      setMoviendo(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Servicios de la web"
        subtitle="Lo que aparece en la web informativa, en este mismo orden. Los servicios ocultos no se muestran al público."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
            Nuevo servicio
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !servicios?.length ? (
          <EmptyState icon={<Layers className="size-6" />} title="Sin servicios" description="Mientras no haya servicios, la web muestra los textos fijos de su configuración." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={`${th} w-20 text-center`}>Orden</th>
                <th className={th}>Foto</th>
                <th className={th}>Servicio</th>
                <th className={th}>Estado</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {servicios.map((s, i) => (
                <tr key={s.id} className={s.activo ? 'hover:bg-slate-50' : 'text-slate-400'}>
                  <td className={`${td} text-center`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <IconButton label="Subir" onClick={() => mover(i, -1)} disabled={i === 0 || moviendo}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton label="Bajar" onClick={() => mover(i, 1)} disabled={i === servicios.length - 1 || moviendo}>
                        <ArrowDown className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                  <td className={td}>
                    {fotoSrc(s) ? (
                      <img src={fotoSrc(s)!} alt="" className="h-12 w-20 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-slate-500">Ícono: {s.icono ? (ICONOS_WEB[s.icono] ?? s.icono) : '—'}</span>
                    )}
                  </td>
                  <td className={td}>
                    <span className="font-medium text-slate-900">{s.nombre}</span>
                    {s.slug && <p className="text-xs text-slate-500">#{s.slug}</p>}
                    <p className="line-clamp-2 max-w-xl text-xs text-slate-500">{s.descripcion}</p>
                  </td>
                  <td className={td}>{s.activo ? <Badge color="green">Visible</Badge> : <Badge color="red">Oculto</Badge>}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <IconButton label="Editar servicio" onClick={() => setModal({ servicio: s })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      {s.activo ? (
                        <IconButton
                          label="Ocultar de la web"
                          className="hover:text-red-600"
                          onClick={() =>
                            confirm({
                              title: 'Ocultar servicio',
                              message: `"${s.nombre}" dejará de mostrarse en la web. No se borra: puedes volver a mostrarlo cuando quieras.`,
                              confirmText: 'Ocultar',
                              onConfirm: () => desactivar.mutateAsync(s.id),
                            })
                          }
                        >
                          <EyeOff className="size-4" />
                        </IconButton>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => actualizar.mutate({ id: s.id, activo: true })}>
                          Mostrar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ServicioModal state={modal} onClose={() => setModal(null)} />
      {dialog}
    </>
  );
}

const schema = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  descripcion: z.string().trim().min(10, 'Mínimo 10 caracteres').max(1000),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Solo minúsculas, números y guiones (ej. expedientes-tecnicos)'),
  icono: z.string(),
  items: z.string(),
});
type FormData = z.infer<typeof schema>;

function ServicioModal({ state, onClose }: { state: { servicio?: Servicio } | null; onClose: () => void }) {
  const servicio = state?.servicio;
  const crear = useCrearServicio();
  const actualizar = useActualizarServicio();
  const subirFoto = useSubirFotoServicio();
  const quitarFoto = useQuitarFotoServicio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset({
      nombre: servicio?.nombre ?? '',
      descripcion: servicio?.descripcion ?? '',
      slug: servicio?.slug ?? '',
      icono: servicio?.icono ?? 'regla',
      items: servicio?.items.join('\n') ?? '',
    });
    setArchivo(null);
  }, [state, servicio, reset]);

  // Vista previa local de la foto elegida
  useEffect(() => {
    if (!archivo) return setPreview(null);
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) return void toast.error('Formato no permitido. Use JPG, PNG o WEBP');
    if (f.size > MAX_FOTO_MB * 1024 * 1024) return void toast.error(`La foto supera el máximo de ${MAX_FOTO_MB} MB`);
    setArchivo(f);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion,
      slug: data.slug || null,
      icono: data.icono || null,
      // Un punto por línea
      items: data.items.split('\n').map((l) => l.trim()).filter(Boolean),
    };
    const guardado = servicio ? await actualizar.mutateAsync({ id: servicio.id, ...payload }) : await crear.mutateAsync(payload);
    if (archivo) await subirFoto.mutateAsync({ id: guardado.id, archivo });
    onClose();
  };

  const fotoActual = servicio ? fotoSrc(servicio) : null;
  const guardando = crear.isPending || actualizar.isPending || subirFoto.isPending;

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={servicio ? 'Editar servicio' : 'Nuevo servicio'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="servicio-form" loading={guardando}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="servicio-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Nombre" wrapperClassName="col-span-2" error={errors.nombre?.message} {...register('nombre')} />
        <Textarea label="Descripción" wrapperClassName="col-span-2" rows={3} error={errors.descripcion?.message} {...register('descripcion')} />
        <Textarea
          label="Qué incluye (un punto por línea)"
          wrapperClassName="col-span-2"
          rows={4}
          placeholder={'Memoria descriptiva\nPlanos de todas las especialidades'}
          {...register('items')}
        />
        <Input
          label="Identificador en la web"
          hint="Se usa en los enlaces (servicios.php#…) y en el formulario de contacto."
          placeholder="ej. expedientes"
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Select label="Ícono (si no hay foto)" {...register('icono')}>
          {Object.entries(ICONOS_WEB).map(([valor, nombre]) => (
            <option key={valor} value={valor}>
              {nombre}
            </option>
          ))}
        </Select>

        <div className="col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Foto <span className="font-normal text-slate-400">(opcional · JPG, PNG o WEBP · máx. {MAX_FOTO_MB} MB)</span>
          </p>
          <input ref={inputRef} type="file" accept={FORMATOS_FOTO} onChange={onFile} className="hidden" />
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
            {preview || fotoActual ? (
              <img src={preview ?? fotoActual!} alt="" className="h-16 w-28 rounded object-cover" />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded bg-slate-100 text-xs text-slate-500">Sin foto</div>
            )}
            <div className="flex flex-1 flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                {preview || fotoActual ? 'Cambiar foto' : 'Elegir foto'}
              </Button>
              {archivo && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setArchivo(null)}>
                  Descartar
                </Button>
              )}
              {servicio && fotoActual && !archivo && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<ImageOff className="size-4" />}
                  loading={quitarFoto.isPending}
                  onClick={async () => {
                    await quitarFoto.mutateAsync(servicio.id);
                    onClose();
                  }}
                >
                  Quitar foto
                </Button>
              )}
            </div>
          </div>
        </div>

        {servicio?.slug && servicio.activo && (
          <p className="col-span-2 flex items-center gap-1 text-xs text-slate-500">
            <ExternalLink className="size-3" />
            En la web: servicios.php#{servicio.slug}
          </p>
        )}
      </form>
    </Modal>
  );
}
