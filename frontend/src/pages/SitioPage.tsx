import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { useDatosSitio, useGuardarDatosSitio } from '@/api/admin';
import { TextoAyuda } from '@/components/Common';
import { Button } from '@/components/ui/Button';
import { Badge, Card, ErrorState, PageHeader, Spinner } from '@/components/ui/Display';
import { Input } from '@/components/ui/Field';
import type { ClaveSitio, DatoSitio } from '@/types/api';

/** Cómo se muestra cada dato en el formulario (las claves y su validación están en la API) */
const CAMPOS: { clave: ClaveSitio; label: string; placeholder: string; hint?: string; grupo: 'Contacto' | 'Redes sociales' }[] = [
  { clave: 'telefono', label: 'Teléfono', placeholder: '979 660 255', grupo: 'Contacto' },
  { clave: 'whatsapp', label: 'WhatsApp', placeholder: '51979660255', hint: '51 + el celular, sin espacios ni "+". Si está oculto, la web no muestra botones de WhatsApp.', grupo: 'Contacto' },
  { clave: 'email', label: 'Correo', placeholder: 'contacto@ingelop.pe', grupo: 'Contacto' },
  { clave: 'direccion', label: 'Dirección', placeholder: 'Calle, número y urbanización', grupo: 'Contacto' },
  { clave: 'distrito', label: 'Distrito', placeholder: 'La Victoria', hint: 'Se muestra junto a la dirección.', grupo: 'Contacto' },
  { clave: 'horario', label: 'Horario de atención', placeholder: 'Lunes a viernes de 8:00 a. m. a 6:00 p. m.', grupo: 'Contacto' },
  { clave: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…', grupo: 'Redes sociales' },
  { clave: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…', grupo: 'Redes sociales' },
];

type Borrador = Record<ClaveSitio, { valor: string; publicado: boolean }>;

const aBorrador = (datos: DatoSitio[]) =>
  Object.fromEntries(datos.map((d) => [d.clave, { valor: d.valor, publicado: d.publicado }])) as Borrador;

export default function SitioPage() {
  const { data, isLoading, error, refetch } = useDatosSitio();
  const guardar = useGuardarDatosSitio();
  const [borrador, setBorrador] = useState<Borrador | null>(null);

  useEffect(() => {
    if (data) setBorrador(aBorrador(data));
  }, [data]);

  const cambios = useMemo(() => {
    if (!data || !borrador) return [];
    return data
      .filter((d) => borrador[d.clave].valor.trim() !== d.valor || borrador[d.clave].publicado !== d.publicado)
      .map((d) => ({ clave: d.clave, valor: borrador[d.clave].valor.trim(), publicado: borrador[d.clave].publicado }));
  }, [data, borrador]);

  if (isLoading || (!borrador && !error)) return <Spinner />;
  if (error || !borrador) return <ErrorState error={error} onRetry={refetch} />;

  const editar = (clave: ClaveSitio, cambio: Partial<{ valor: string; publicado: boolean }>) =>
    setBorrador((b) => {
      if (!b) return b;
      const siguiente = { ...b[clave], ...cambio };
      // Un dato vacío no se puede publicar
      if (siguiente.valor.trim() === '') siguiente.publicado = false;
      return { ...b, [clave]: siguiente };
    });

  const publicados = CAMPOS.filter((c) => borrador[c.clave].publicado).length;

  return (
    <>
      <PageHeader
        title="Datos de la empresa"
        subtitle="Los datos de contacto que muestra la página web. Puedes guardarlos y publicarlos cuando la empresa lo apruebe."
        actions={
          <Button icon={<Save className="size-4" />} disabled={!cambios.length} loading={guardar.isPending} onClick={() => guardar.mutate(cambios)}>
            Guardar cambios{cambios.length ? ` (${cambios.length})` : ''}
          </Button>
        }
      />
      <TextoAyuda>
        Solo se ve en la web lo que marques como <b>Publicado</b> ({publicados} de {CAMPOS.length}). Lo oculto queda guardado aquí, pero no aparece en
        ninguna página.
      </TextoAyuda>

      {(['Contacto', 'Redes sociales'] as const).map((grupo) => (
        <Card key={grupo} className="mb-6">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">{grupo}</h2>
          <div className="divide-y divide-slate-100">
            {CAMPOS.filter((c) => c.grupo === grupo).map((c) => {
              const d = borrador[c.clave];
              const vacio = d.valor.trim() === '';
              return (
                <div key={c.clave} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <Input
                    label={c.label}
                    placeholder={c.placeholder}
                    hint={c.hint}
                    value={d.valor}
                    onChange={(e) => editar(c.clave, { valor: e.target.value })}
                    wrapperClassName="flex-1"
                  />
                  <div className="flex items-center gap-3 sm:w-56 sm:pt-7">
                    <label className={`inline-flex items-center gap-2 text-sm ${vacio ? 'text-slate-400' : 'text-slate-700'}`} title={vacio ? 'Escribe el dato para poder publicarlo' : undefined}>
                      <input
                        type="checkbox"
                        className="size-4 accent-amber-500"
                        checked={d.publicado}
                        disabled={vacio}
                        onChange={(e) => editar(c.clave, { publicado: e.target.checked })}
                      />
                      Publicar en la web
                    </label>
                    {d.publicado ? (
                      <Badge color="green">
                        <Eye className="size-3" /> Visible
                      </Badge>
                    ) : (
                      <Badge>
                        <EyeOff className="size-3" /> Oculto
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </>
  );
}
