import { useState } from 'react';
import { Landmark, Plus, ShieldCheck } from 'lucide-react';
import { useCartasProyecto, useCobrosProyecto } from '@/api/cobros';
import { TextoAyuda } from '@/components/Common';
import { CartaModal, RenovarCartaModal } from '@/components/cobros/CartaModal';
import { CobroModal } from '@/components/cobros/CobroModal';
import { TablaCartas, TablaCobros } from '@/components/cobros/Tablas';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, ErrorState, ProgressBar, Spinner, StatCard } from '@/components/ui/Display';
import { formatPorcentaje, formatSoles } from '@/lib/format';
import type { CartaFianza, Cobro } from '@/types/api';

export default function CobrosTab({ proyectoId }: { proyectoId: number }) {
  const { data, isLoading, error, refetch } = useCobrosProyecto(proyectoId);
  const cartas = useCartasProyecto(proyectoId);
  const [modalCobro, setModalCobro] = useState<{ cobro?: Cobro } | null>(null);
  const [modalCarta, setModalCarta] = useState<{ carta?: CartaFianza } | null>(null);
  const [renovando, setRenovando] = useState<CartaFianza | null>(null);
  const r = data?.resumen;

  return (
    <div className="space-y-6">
      <TextoAyuda>
        Los pagos pactados con el cliente y las garantías del contrato. Registra cada pago como <b>Programado</b>, pásalo a <b>Facturado</b> al emitir el comprobante y a{' '}
        <b>Cobrado</b> cuando llegue el dinero.
      </TextoAyuda>

      {r && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Monto del contrato" value={formatSoles(r.montoContrato)} hint={r.sinProgramar > 0 ? `${formatSoles(r.sinProgramar)} sin programar` : r.sinProgramar < 0 ? `Lo programado supera el contrato en ${formatSoles(-r.sinProgramar)}` : 'Todo programado'} />
          <StatCard label="Facturado" value={formatSoles(r.facturado)} hint={`${formatSoles(r.porFacturar)} por facturar`} />
          <StatCard
            label="Cobrado"
            value={formatSoles(r.cobrado)}
            tone="success"
            hint={
              <div className="space-y-1.5">
                <ProgressBar value={Math.min(100, r.porcentajeCobrado)} color="green" />
                <span>
                  {formatPorcentaje(r.porcentajeCobrado)} del contrato · neto {formatSoles(r.netoRecibido)}
                </span>
              </div>
            }
          />
          <StatCard
            label="Por cobrar"
            value={formatSoles(r.porCobrar)}
            tone={r.porCobrar > 0 ? 'warning' : 'default'}
            hint={r.detracciones || r.penalidades ? `Detracciones ${formatSoles(r.detracciones)} · penalidades ${formatSoles(r.penalidades)}` : 'Comprobantes emitidos aún sin pagar'}
          />
        </div>
      )}

      <Card>
        <CardHeader
          title="Cobros"
          subtitle="Por entregable, etapa, avance o adelanto"
          action={
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModalCobro({})}>
              Cobro
            </Button>
          }
        />
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.cobros.length ? (
          <EmptyState
            icon={<Landmark className="size-6" />}
            title="Sin cobros registrados"
            description="Registra los pagos pactados en el contrato (por ejemplo, 30 % al primer entregable) para saber cuánto falta facturar y cobrar."
          />
        ) : (
          <TablaCobros cobros={data.cobros} onEditar={(cobro) => setModalCobro({ cobro })} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Cartas fianza"
          subtitle="Garantías entregadas a la entidad. Avisamos 15 días antes del vencimiento."
          action={
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setModalCarta({})}>
              Carta fianza
            </Button>
          }
        />
        {cartas.isLoading ? (
          <Spinner />
        ) : cartas.error ? (
          <div className="p-5">
            <ErrorState error={cartas.error} onRetry={cartas.refetch} />
          </div>
        ) : !cartas.data?.length ? (
          <EmptyState icon={<ShieldCheck className="size-6" />} title="Sin cartas fianza" description="Por ejemplo, la garantía de fiel cumplimiento (por lo general, 10 % del contrato)." />
        ) : (
          <TablaCartas cartas={cartas.data} onEditar={(carta) => setModalCarta({ carta })} onRenovar={setRenovando} />
        )}
      </Card>

      <CobroModal proyectoId={proyectoId} state={modalCobro} onClose={() => setModalCobro(null)} />
      <CartaModal proyectoId={proyectoId} montoContrato={r?.montoContrato ?? 0} state={modalCarta} onClose={() => setModalCarta(null)} />
      <RenovarCartaModal carta={renovando} onClose={() => setRenovando(null)} />
    </div>
  );
}
