import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDown, ArrowUp, EyeOff, ImageOff, Images, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActualizarProyectoWeb,
  useCrearProyectoWeb,
  useOcultarProyectoWeb,
  usePortafolio,
  useQuitarFotoProyectoWeb,
  useSubirFotoProyectoWeb,
} from '@/api/admin';
import { API_URL } from '@/api/client';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import type { ProyectoWeb } from '@/types/api';

/** Mismos formatos y tamaño que valida la API (MAX_FOTO_MB) */
const FORMATOS_FOTO = '.jpg,.jpeg,.png,.webp';
const MAX_FOTO_MB = 5;

const fotoSrc = (p: ProyectoWeb) => (p.fotoUrl ? `${API_URL}${p.fotoUrl}` : null);

export default function PortafolioPage() {
  const { data: proyectos, isLoading, error, refetch } = usePortafolio();
  const [modal, setModal] = useState<{ proyecto?: ProyectoWeb } | null>(null);
  const actualizar = useActualizarProyectoWeb();
  const ocultar = useOcultarProyectoWeb();
  const [moviendo, setMoviendo] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Intercambia el orden con el vecino (la web los muestra en este orden)
  const mover = async (i: number, delta: -1 | 1) => {
    if (!proyectos) return;
    const a = proyectos[i];
    const b = proyectos[i + delta];
    if (!b) return;
    setMoviendo(true);
    try {
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
        title="Proyectos realizados"
        subtitle="Los trabajos que la web muestra en la página Proyectos, en este mismo orden."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
            Nuevo proyecto realizado
          </Button>
        }
      />
      <TextoAyuda>
        Es el portafolio público: no tiene relación con los proyectos de trabajo de la intranet. Mientras no haya ninguno visible, la web muestra los
        tipos de proyecto que desarrolla la empresa.
      </TextoAyuda>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !proyectos?.length ? (
          <EmptyState icon={<Images className="size-6" />} title="Aún no hay proyectos realizados" description="Agrega los trabajos terminados que la empresa quiera mostrar en la web." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={`${th} w-20 text-center`}>Orden</th>
                <th className={th}>Foto</th>
                <th className={th}>Proyecto</th>
                <th className={th}>Estado</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p, i) => (
                <tr key={p.id} className={p.activo ? 'hover:bg-slate-50' : 'text-slate-400'}>
                  <td className={`${td} text-center`}>
                    <div className="flex items-center justify-center gap-0.5">
                      <IconButton label="Subir" onClick={() => mover(i, -1)} disabled={i === 0 || moviendo}>
                        <ArrowUp className="size-4" />
                      </IconButton>
                      <IconButton label="Bajar" onClick={() => mover(i, 1)} disabled={i === proyectos.length - 1 || moviendo}>
                        <ArrowDown className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                  <td className={td}>
                    {fotoSrc(p) ? <img src={fotoSrc(p)!} alt="" className="h-12 w-20 rounded object-cover" /> : <span className="text-xs text-slate-500">Sin foto</span>}
                  </td>
                  <td className={td}>
                    <span className="font-medium text-slate-900">{p.titulo}</span>
                    <p className="text-xs text-slate-500">{[p.servicio, p.cliente, p.ubicacion, p.anio].filter(Boolean).join(' · ') || '—'}</p>
                  </td>
                  <td className={td}>{p.activo ? <Badge color="green">Visible</Badge> : <Badge color="red">Oculto</Badge>}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <IconButton label="Editar proyecto realizado" onClick={() => setModal({ proyecto: p })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      {p.activo ? (
                        <IconButton
                          label="Ocultar de la web"
                          className="hover:text-red-600"
                          onClick={() =>
                            confirm({
                              title: 'Ocultar proyecto realizado',
                              message: `"${p.titulo}" dejará de mostrarse en la web. No se borra: puedes volver a mostrarlo cuando quieras.`,
                              confirmText: 'Ocultar',
                              onConfirm: () => ocultar.mutateAsync(p.id),
                            })
                          }
                        >
                          <EyeOff className="size-4" />
                        </IconButton>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => actualizar.mutate({ id: p.id, activo: true })}>
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

      <ProyectoWebModal state={modal} onClose={() => setModal(null)} />
      {dialog}
    </>
  );
}

const anioActual = new Date().getFullYear();
const schema = z.object({
  titulo: z.string().trim().min(5, 'Mínimo 5 caracteres').max(200),
  cliente: z.string().trim().max(150),
  ubicacion: z.string().trim().max(120),
  servicio: z.string().trim().max(120),
  anio: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{4}$/.test(v) && +v >= 2000 && +v <= anioActual + 1), `Año entre 2000 y ${anioActual + 1}`),
});
type FormData = z.infer<typeof schema>;

function ProyectoWebModal({ state, onClose }: { state: { proyecto?: ProyectoWeb } | null; onClose: () => void }) {
  const proyecto = state?.proyecto;
  const crear = useCrearProyectoWeb();
  const actualizar = useActualizarProyectoWeb();
  const subirFoto = useSubirFotoProyectoWeb();
  const quitarFoto = useQuitarFotoProyectoWeb();
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
      titulo: proyecto?.titulo ?? '',
      cliente: proyecto?.cliente ?? '',
      ubicacion: proyecto?.ubicacion ?? '',
      servicio: proyecto?.servicio ?? '',
      anio: proyecto?.anio ? String(proyecto.anio) : '',
    });
    setArchivo(null);
  }, [state, proyecto, reset]);

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
      titulo: data.titulo,
      cliente: data.cliente || null,
      ubicacion: data.ubicacion || null,
      servicio: data.servicio || null,
      anio: data.anio ? Number(data.anio) : null,
    };
    const guardado = proyecto ? await actualizar.mutateAsync({ id: proyecto.id, ...payload }) : await crear.mutateAsync(payload);
    if (archivo) await subirFoto.mutateAsync({ id: guardado.id, archivo });
    onClose();
  };

  const fotoActual = proyecto ? fotoSrc(proyecto) : null;

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={proyecto ? 'Editar proyecto realizado' : 'Nuevo proyecto realizado'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="proyecto-web-form" loading={crear.isPending || actualizar.isPending || subirFoto.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="proyecto-web-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Título" wrapperClassName="col-span-2" placeholder="Ej. Mejoramiento de la I.E. N° 10125" error={errors.titulo?.message} {...register('titulo')} />
        <Input label="Cliente" placeholder="Ej. Municipalidad Distrital de La Victoria" error={errors.cliente?.message} {...register('cliente')} />
        <Input label="Servicio realizado" placeholder="Ej. Expediente técnico" error={errors.servicio?.message} {...register('servicio')} />
        <Input label="Ubicación" placeholder="Ej. La Victoria, Chiclayo" error={errors.ubicacion?.message} {...register('ubicacion')} />
        <Input label="Año" inputMode="numeric" maxLength={4} placeholder={String(anioActual)} error={errors.anio?.message} {...register('anio')} />

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
              {proyecto && fotoActual && !archivo && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<ImageOff className="size-4" />}
                  loading={quitarFoto.isPending}
                  onClick={async () => {
                    await quitarFoto.mutateAsync(proyecto.id);
                    onClose();
                  }}
                >
                  Quitar foto
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
