import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useEditarMedioCms, useMediosCms, useSubirMedioCms, type MedioCms } from '@/api/cms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/ui/Display';
import { formatBytes } from '@/lib/format';

function Imagen({ medio }: { medio: MedioCms }) {
  const [src, setSrc] = useState('');
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let activo = true;
    let url = '';
    api.get<Blob>(`/cms/medios/${medio.id}/miniatura`, { responseType: 'blob' }).then((r) => {
      if (!activo) return;
      url = URL.createObjectURL(r.data); setSrc(url);
    }).catch(() => { if (activo) setFallo(true); });
    return () => { activo = false; if (url) URL.revokeObjectURL(url); };
  }, [medio.id]);
  return src ? <img src={src} alt={medio.textoAlternativo} className="h-44 w-full rounded bg-slate-100 object-contain" /> : <p className="py-8 text-sm text-slate-500">{fallo ? 'No se pudo cargar la imagen' : 'Cargando imagen…'}</p>;
}
function MedioCard({ medio }: { medio: MedioCms }) {
  const [alt, setAlt] = useState(medio.textoAlternativo);
  const guardar = useEditarMedioCms();
  return <Card className="space-y-3 p-4"><Imagen medio={medio} /><p className="break-all font-medium">{medio.nombre}</p><p className="text-xs text-slate-500">{formatBytes(medio.tamano)}</p>
    <Input label="Texto alternativo" hint="Describe la imagen para quien no pueda verla. Déjalo vacío si es decorativa." maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
    <Button size="sm" disabled={alt === medio.textoAlternativo} loading={guardar.isPending} onClick={() => guardar.mutate({ id: medio.id, textoAlternativo: alt })}>Guardar descripción</Button>
  </Card>;
}
export default function MediosPage() {
  const medios = useMediosCms();
  const subir = useSubirMedioCms();
  return <><PageHeader title="Biblioteca de imágenes" subtitle="Sube una imagen y reutilízala en páginas, marca y publicaciones en redes." />
    <Card className="mb-6 p-5"><label className="block text-sm font-semibold" htmlFor="imagen-cms">Añadir imagen (JPG, PNG o WEBP)</label>
      <input id="imagen-cms" type="file" accept=".jpg,.jpeg,.png,.webp" className="mt-3 max-w-full text-sm" disabled={subir.isPending} onChange={(e) => { const file = e.target.files?.[0]; if (file) subir.mutate(file); e.target.value = ''; }} />
      {subir.isPending && <Spinner />}
    </Card>
    {medios.isLoading ? <Spinner /> : medios.error ? <ErrorState error={medios.error} onRetry={medios.refetch} /> : !medios.data?.length ? <p className="text-slate-500">Aún no hay imágenes. Añade la primera para usarla en el editor de páginas.</p> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{medios.data.map((m) => <MedioCard key={m.id} medio={m} />)}</div>}
  </>;
}
