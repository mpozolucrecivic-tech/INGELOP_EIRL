import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, Card, ErrorState, PageHeader, Spinner } from '@/components/ui/Display';
import { useAuth } from '@/context/AuthContext';
import { formatFechaHora } from '@/lib/format';
import { useConfirm } from '@/components/ui/Modal';
import {
  useAccionCms, useDocumentosCms, useGuardarCms, useHistorialCms, useMediosCms, useVistaPreviaCms,
  type BloqueCms, type ContenidoCms, type DocumentoCms, type MedioCms,
} from '@/api/cms';

const tipos = { texto: 'Texto e imagen', servicios: 'Listado de servicios', portafolio: 'Proyectos realizados', contacto: 'Formulario de contacto' };

function ImagenSelect({ value, onChange, medios, label }: { value: number | null; onChange: (id: number | null) => void; medios: MedioCms[]; label: string }) {
  return <Select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
    <option value="">Sin imagen</option>{medios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
  </Select>;
}

export default function CmsPage() {
  const docs = useDocumentosCms();
  const medios = useMediosCms();
  const [clave, setClave] = useState('pagina.inicio');
  const [nuevoSlug, setNuevoSlug] = useState('');
  const [nuevo, setNuevo] = useState<DocumentoCms | null>(null);
  const [contenido, setContenido] = useState<ContenidoCms | null>(null);
  const [base, setBase] = useState<DocumentoCms | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const { esAdmin } = useAuth();
  const { confirm, dialog } = useConfirm();
  const guardar = useGuardarCms();
  const accion = useAccionCms();
  const vista = useVistaPreviaCms();
  const historial = useHistorialCms(verHistorial ? clave : '');
  const documento = docs.data?.find((d) => d.clave === clave) ?? (nuevo?.clave === clave ? nuevo : null);
  const sucio = !!contenido && !!base && JSON.stringify(contenido) !== JSON.stringify(base.borrador);
  const ocupado = guardar.isPending || accion.isPending || vista.isPending;
  // No reemplazar una edición local cuando TanStack Query refresca en segundo plano.
  useEffect(() => {
    if (documento && (!base || base.clave !== clave || (!sucio && documento.version !== base.version))) {
      setBase(documento); setContenido(structuredClone(documento.borrador)); setPreview(null);
    }
  }, [documento, clave, base, sucio]);
  useEffect(() => {
    if (!sucio) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sucio]);
  if (docs.isLoading) return <Spinner />;
  if (docs.error) return <ErrorState error={docs.error} onRetry={docs.refetch} />;
  const cambiarDocumento = (siguiente: string) => {
    const cambiar = () => { setClave(siguiente); setBase(null); setContenido(null); setPreview(null); setVerHistorial(false); };
    if (sucio) confirm({ title: 'Cambios sin guardar', message: 'Al cambiar de documento se perderán los cambios pendientes.', confirmText: 'Descartar cambios', onConfirm: cambiar });
    else cambiar();
  };
  const actualizar = (c: ContenidoCms) => { setContenido(c); setPreview(null); };
  const aceptar = (d: DocumentoCms) => { setBase(d); setContenido(structuredClone(d.borrador)); setPreview(null); };
  const crearPagina = () => {
    const slug = nuevoSlug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return toast.error('Usa una URL corta con letras minúsculas, números y guiones.');
    if (docs.data?.some((d) => d.clave === `pagina.${slug}`)) return toast.error('Esa página ya existe');
    if (sucio) return toast.error('Guarda o descarta el documento actual antes de crear una página');
    const p: DocumentoCms = { clave: `pagina.${slug}`, version: 0, publicado: null, publicadoEn: null, actualizadoEn: null,
      borrador: { tipo: 'pagina', slug, titulo: 'Nueva página', descripcion: '', imagenSocialId: null, bloques: [] } };
    setNuevo(p); setClave(p.clave); setBase(p); setContenido(p.borrador); setNuevoSlug(''); setPreview(null);
  };
  const bloque = (i: number, patch: Partial<BloqueCms>) => {
    if (contenido?.tipo === 'pagina') actualizar({ ...contenido, bloques: contenido.bloques.map((b, j) => j === i ? { ...b, ...patch } : b) });
  };
  const mover = (i: number, delta: number) => {
    if (contenido?.tipo !== 'pagina') return;
    const bloques = [...contenido.bloques]; [bloques[i], bloques[i + delta]] = [bloques[i + delta], bloques[i]];
    actualizar({ ...contenido, bloques });
  };
  return <>
    <PageHeader title="Editor de páginas" subtitle="Prepara el contenido, revísalo y publica cuando esté listo." />
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <Select label="Documento" value={clave} onChange={(e) => cambiarDocumento(e.target.value)}>
        {[...(docs.data ?? []), ...(nuevo && !docs.data?.some((d) => d.clave === nuevo.clave) ? [nuevo] : [])].map((d) =>
          <option key={d.clave} value={d.clave}>{d.borrador.tipo === 'configuracion' ? 'Marca y menú' : d.borrador.titulo}</option>)}
      </Select>
      <Input label="URL de nueva página" value={nuevoSlug} placeholder="equipo" onChange={(e) => setNuevoSlug(e.target.value)} />
      <Button variant="secondary" onClick={crearPagina}>Crear página</Button>
    </div>
    {contenido && base && <>
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge color={base.publicado ? 'green' : 'slate'}>{base.publicado ? 'Tiene versión publicada' : 'Sin publicar'}</Badge>
          <span className="text-sm text-slate-600">{sucio ? 'Cambios pendientes de guardar' : base.version ? `Borrador guardado · versión ${base.version}` : 'Documento inicial · todavía sin guardar'}</span>
          {base.publicadoEn && <span className="text-xs text-slate-500">Última publicación: {formatFechaHora(base.publicadoEn)}</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={ocupado || (!sucio && base.version > 0)} onClick={async () => { aceptar(await guardar.mutateAsync({ clave, version: base.version, contenido })); }}>Guardar borrador</Button>
          <Button variant="secondary" disabled={ocupado || sucio || !base.version} onClick={async () => { setPreview((await vista.mutateAsync({ clave, version: base.version })).url); }}>Vista previa</Button>
          {esAdmin && <Button disabled={ocupado || sucio || !base.version} onClick={() => confirm({ title: 'Publicar contenido', message: 'La versión guardada será visible para los visitantes de la web.', confirmText: 'Publicar', onConfirm: async () => { aceptar(await accion.mutateAsync({ clave, version: base.version, accion: 'publicar' })); } })}>Publicar</Button>}
          {esAdmin && base.publicado && <Button variant="secondary" disabled={ocupado || sucio} onClick={() => confirm({ title: 'Retirar publicación', message: 'Las páginas nuevas dejarán de estar disponibles. Las cinco páginas originales recuperarán su diseño anterior.', confirmText: 'Retirar', onConfirm: async () => { aceptar(await accion.mutateAsync({ clave, version: base.version, accion: 'retirar' })); } })}>Retirar publicación</Button>}
          <Button variant="ghost" onClick={() => setVerHistorial(!verHistorial)}>Historial</Button>
          {sucio && <Button variant="ghost" onClick={() => { setContenido(structuredClone(base.borrador)); setPreview(null); }}>Descartar cambios</Button>}
        </div>
        {!esAdmin && <p className="mt-3 text-sm text-slate-500">La jefatura revisa y publica los borradores.</p>}
        {preview && <a className="mt-3 block text-sm font-semibold text-blue-700 underline" href={preview} target="_blank" rel="noopener noreferrer">Abrir vista previa de la web (vence en 10 minutos)</a>}
      </Card>
      {contenido.tipo === 'pagina' ? <>
        <Card className="mb-6 space-y-4 p-5">
          <p className="text-sm text-slate-500">URL: {contenido.slug === 'inicio' ? 'index.php' : ['nosotros', 'servicios', 'proyectos', 'contacto'].includes(contenido.slug) ? `${contenido.slug}.php` : `pagina.php?slug=${contenido.slug}`}</p>
          <Input label="Título de página y buscadores" maxLength={200} value={contenido.titulo} onChange={(e) => actualizar({ ...contenido, titulo: e.target.value })} />
          <Textarea label="Descripción para buscadores" maxLength={300} value={contenido.descripcion} onChange={(e) => actualizar({ ...contenido, descripcion: e.target.value })} />
          <ImagenSelect label="Imagen para compartir en redes" value={contenido.imagenSocialId} medios={medios.data ?? []} onChange={(id) => actualizar({ ...contenido, imagenSocialId: id })} />
        </Card>
        {contenido.bloques.map((b, i) => <Card key={b.id} className="mb-4 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Sección {i + 1}</h2><div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)}>Subir</Button>
            <Button size="sm" variant="ghost" disabled={i === contenido.bloques.length - 1} onClick={() => mover(i, 1)}>Bajar</Button>
            <Button size="sm" variant="ghost" onClick={() => actualizar({ ...contenido, bloques: contenido.bloques.filter((_, j) => j !== i) })}>Quitar</Button>
          </div></div>
          <Select label="Contenido de la sección" value={b.tipo} onChange={(e) => bloque(i, { tipo: e.target.value as BloqueCms['tipo'] })}>{Object.entries(tipos).filter(([t]) => t !== 'contacto' || contenido.slug === 'contacto').map(([t, label]) => <option key={t} value={t}>{label}</option>)}</Select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.visible} onChange={(e) => bloque(i, { visible: e.target.checked })} />Mostrar sección</label>
          <Input label="Título" maxLength={200} value={b.titulo} onChange={(e) => bloque(i, { titulo: e.target.value })} />
          <Textarea label="Texto" rows={5} maxLength={10000} value={b.texto} onChange={(e) => bloque(i, { texto: e.target.value })} hint="Separa los párrafos con una línea en blanco." />
          <ImagenSelect label="Imagen" value={b.medioId} medios={medios.data ?? []} onChange={(id) => bloque(i, { medioId: id })} />
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Texto del botón" maxLength={80} value={b.botonTexto} onChange={(e) => bloque(i, { botonTexto: e.target.value })} /><Input label="Enlace del botón" value={b.botonUrl} placeholder="contacto.php o https://…" onChange={(e) => bloque(i, { botonUrl: e.target.value })} /></div>
        </Card>)}
        <Button variant="secondary" disabled={contenido.bloques.length >= 40} onClick={() => actualizar({ ...contenido, bloques: [...contenido.bloques, { id: crypto.randomUUID(), tipo: 'texto', visible: true, titulo: '', texto: '', medioId: null, botonTexto: '', botonUrl: '' }] })}>Añadir sección</Button>
      </> : <Card className="space-y-4 p-5">
        <Input label="Nombre de la marca" value={contenido.nombre} onChange={(e) => actualizar({ ...contenido, nombre: e.target.value })} />
        <Input label="Subtítulo de la marca" value={contenido.subtitulo} onChange={(e) => actualizar({ ...contenido, subtitulo: e.target.value })} />
        <Textarea label="Descripción de la empresa" value={contenido.descripcion} onChange={(e) => actualizar({ ...contenido, descripcion: e.target.value })} />
        <ImagenSelect label="Logo" value={contenido.logoId} medios={medios.data ?? []} onChange={(id) => actualizar({ ...contenido, logoId: id })} />
        <h2 className="font-semibold">Menú de navegación</h2>
        {contenido.menu.map((item, i) => <div key={i} className="flex flex-wrap items-end gap-2">
          <Input label="Etiqueta" value={item.etiqueta} onChange={(e) => actualizar({ ...contenido, menu: contenido.menu.map((m, j) => j === i ? { ...m, etiqueta: e.target.value } : m) })} />
          <Select label="Página" value={item.slug} onChange={(e) => actualizar({ ...contenido, menu: contenido.menu.map((m, j) => j === i ? { ...m, slug: e.target.value } : m) })}>{docs.data?.filter((d) => d.borrador.tipo === 'pagina').map((d) => d.borrador.tipo === 'pagina' && <option key={d.clave} value={d.borrador.slug}>{d.borrador.titulo}{d.publicado ? '' : ' (sin publicar)'}</option>)}</Select>
          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => { const menu = [...contenido.menu]; [menu[i], menu[i - 1]] = [menu[i - 1], menu[i]]; actualizar({ ...contenido, menu }); }}>Subir</Button>
          <Button variant="ghost" size="sm" onClick={() => actualizar({ ...contenido, menu: contenido.menu.filter((_, j) => j !== i) })}>Quitar</Button>
        </div>)}
        <Button variant="secondary" disabled={contenido.menu.length >= 20} onClick={() => actualizar({ ...contenido, menu: [...contenido.menu, { etiqueta: 'Inicio', slug: 'inicio' }] })}>Añadir enlace</Button>
      </Card>}
      {verHistorial && <Card className="mt-6 p-5"><h2 className="mb-3 font-semibold">Historial de cambios</h2>
        {historial.isLoading ? <Spinner /> : historial.error ? <ErrorState error={historial.error} onRetry={historial.refetch} /> : !historial.data?.length ? <p className="text-sm text-slate-500">Todavía no hay revisiones.</p> : historial.data.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm"><span>{r.accion} · {r.autorNombre} · {formatFechaHora(r.fecha)}</span><Button size="sm" variant="secondary" disabled={ocupado || sucio} onClick={async () => { aceptar(await accion.mutateAsync({ clave, version: base.version, accion: 'restaurar', revisionId: r.id })); }}>Restaurar como borrador</Button></div>)}
      </Card>}
    </>}
    {dialog}
  </>;
}
