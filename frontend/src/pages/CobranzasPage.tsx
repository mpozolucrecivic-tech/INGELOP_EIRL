import { useState } from 'react';
import clsx from 'clsx';
import { Landmark, ShieldCheck } from 'lucide-react';
import { useCartasFianza, useCobranzas } from '@/api/cobros';
import { CartaModal, RenovarCartaModal } from '@/components/cobros/CartaModal';
import { CobroModal } from '@/components/cobros/CobroModal';
import { TablaCartas, TablaCobros } from '@/components/cobros/Tablas';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '@/components/ui/Display';
import { formatSoles } from '@/lib/format';
import type { CartaFianza, Cobro, EstadoCobro, EstadoGarantia } from '@/types/api';

type VistaCobros = EstadoCobro | 'PENDIENTES' | 'TODOS';

const VISTAS: { valor: VistaCobros; label: string }[] = [
  { valor: 'PENDIENTES', label: 'Pendientes' },
  { valor: 'FACTURADO', label: 'Facturados sin cobrar' },
  { valor: 'PROGRAMADO', label: 'Programados' },
  { valor: 'COBRADO', label: 'Cobrados' },
  { valor: 'TODOS', label: 'Todos' },
];

function Pestanas<T extends string>({ opciones, valor, onChange, etiqueta }: { opciones: { valor: T; label: string }[]; valor: T; onChange: (v: T) => void; etiqueta: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 py-2" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={clsx(
            'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            valor === o.valor ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </nav>
  );
}

export default function CobranzasPage() {
  const [vista, setVista] = useState<VistaCobros>('PENDIENTES');
  const [estadoCartas, setEstadoCartas] = useState<EstadoGarantia | 'TODAS'>('VIGENTE');
  const cobranzas = useCobranzas(vista === 'TODOS' ? {} : { estado: vista });
  const cartas = useCartasFianza(estadoCartas === 'TODAS' ? {} : { estado: estadoCartas });
  const [editando, setEditando] = useState<Cobro | null>(null);
  const [cartaEditando, setCartaEditando] = useState<CartaFianza | null>(null);
  const [renovando, setRenovando] = useState<CartaFianza | null>(null);
  const r = cobranzas.data?.resumen;
  const porVencer = cartas.data?.filter((c) => c.diasParaVencer !== null && c.diasParaVencer <= 15).length ?? 0;

  return (
    <>
      <PageHeader title="Cobranzas" subtitle="Lo que falta cobrar en todos los proyectos y las cartas fianza vigentes." />

      {r && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Por cobrar" value={formatSoles(r.porCobrar)} tone={r.porCobrar > 0 ? 'warning' : 'default'} hint="Comprobantes emitidos aún sin pagar" />
          <StatCard
            label="Facturas con más de 30 días"
            value={r.facturasMas30Dias}
            tone={r.facturasMas30Dias > 0 ? 'danger' : 'default'}
            hint={r.facturasMas30Dias > 0 ? 'Conviene hacer seguimiento con la entidad' : 'Ninguna atrasada'}
          />
          <StatCard label="Programado sin facturar" value={formatSoles(r.programadoSinFacturar)} hint="Pagos pactados que aún no se facturan" />
          <StatCard
            label={`Cobrado en ${new Date().getFullYear()}`}
            value={formatSoles(r.cobradoAnio)}
            tone="success"
            hint={`Neto recibido ${formatSoles(r.netoRecibidoAnio)} · detracciones ${formatSoles(r.detraccionesAnio)}`}
          />
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Cobros" subtitle="Para registrar un cobro nuevo, entra al proyecto: Recursos → Cobros y garantías." />
          <Pestanas opciones={VISTAS} valor={vista} onChange={setVista} etiqueta="Estado de los cobros" />
          {cobranzas.isLoading ? (
            <Spinner />
          ) : cobranzas.error ? (
            <div className="p-5">
              <ErrorState error={cobranzas.error} onRetry={cobranzas.refetch} />
            </div>
          ) : !cobranzas.data?.cobros.length ? (
            <EmptyState icon={<Landmark className="size-6" />} title={vista === 'PENDIENTES' ? 'Nada pendiente' : 'Sin cobros'} description={vista === 'PENDIENTES' ? 'No hay cobros programados ni facturas por cobrar.' : undefined} />
          ) : (
            <TablaCobros cobros={cobranzas.data.cobros} conProyecto onEditar={setEditando} />
          )}
        </Card>

        <Card>
          <CardHeader title="Cartas fianza" subtitle={porVencer > 0 ? `${porVencer} vencen en 15 días o menos` : 'Ordenadas por vencimiento'} />
          <Pestanas
            opciones={[
              { valor: 'VIGENTE', label: 'Vigentes' },
              { valor: 'TODAS', label: 'Todas' },
            ]}
            valor={estadoCartas === 'VIGENTE' ? 'VIGENTE' : 'TODAS'}
            onChange={(v) => setEstadoCartas(v === 'VIGENTE' ? 'VIGENTE' : 'TODAS')}
            etiqueta="Estado de las cartas"
          />
          {cartas.isLoading ? (
            <Spinner />
          ) : cartas.error ? (
            <div className="p-5">
              <ErrorState error={cartas.error} onRetry={cartas.refetch} />
            </div>
          ) : !cartas.data?.length ? (
            <EmptyState icon={<ShieldCheck className="size-6" />} title="Sin cartas fianza" description="Se registran dentro de cada proyecto, en Recursos → Cobros y garantías." />
          ) : (
            <TablaCartas cartas={cartas.data} conProyecto onEditar={setCartaEditando} onRenovar={setRenovando} />
          )}
        </Card>
      </div>

      <CobroModal proyectoId={editando?.proyectoId ?? 0} state={editando ? { cobro: editando } : null} onClose={() => setEditando(null)} />
      <CartaModal proyectoId={cartaEditando?.proyectoId ?? 0} montoContrato={0} state={cartaEditando ? { carta: cartaEditando } : null} onClose={() => setCartaEditando(null)} />
      <RenovarCartaModal carta={renovando} onClose={() => setRenovando(null)} />
    </>
  );
}
