import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEntregables } from '@/api/consultoria';
import { useEtapas } from '@/api/documentos';
import { useProyecto, useSprints } from '@/api/proyectos';
import { Cronograma, LeyendaCronograma, type FilaCronograma } from '@/components/Cronograma';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Spinner } from '@/components/ui/Display';
import { ESTADO_ETAPA, ORDEN_ETAPAS, TIPO_ETAPA } from '@/lib/format';
import type { EstadoEtapa } from '@/types/api';
import TableroTab from './TableroTab';

const COLOR_ETAPA: Record<EstadoEtapa, string> = {
  EN_ELABORACION: 'bg-amber-400',
  EN_REVISION: 'bg-sky-500',
  OBSERVADO: 'bg-red-500',
  APROBADO: 'bg-emerald-500',
};

/** Cronograma del proyecto (plazo, etapas, periodos y entregables) y, debajo, el tablero de tareas */
export default function PlanificacionTab({ proyectoId }: { proyectoId: number }) {
  const [abierto, setAbierto] = useState(true);
  const proyecto = useProyecto(proyectoId);
  const etapas = useEtapas(proyectoId);
  const sprints = useSprints(proyectoId);
  const entregables = useEntregables(proyectoId);
  const cargando = proyecto.isLoading || etapas.isLoading || sprints.isLoading || entregables.isLoading;

  const filas: FilaCronograma[] = [];
  if (proyecto.data) {
    filas.push({ id: 'plazo', grupo: 'Contrato', etiqueta: 'Plazo del proyecto', inicio: proyecto.data.fechaInicio, fin: proyecto.data.fechaFin, color: 'bg-slate-700' });
  }
  [...(etapas.data ?? [])]
    .sort((a, b) => ORDEN_ETAPAS.indexOf(a.tipo) - ORDEN_ETAPAS.indexOf(b.tipo))
    .forEach((e, i) =>
      filas.push({
        id: `etapa-${e.id}`,
        grupo: i === 0 ? 'Etapas' : undefined,
        etiqueta: TIPO_ETAPA[e.tipo],
        detalle: ESTADO_ETAPA[e.estado].label,
        inicio: e.fechaInicio,
        // Sin fecha de fin prevista: hasta la aprobación, o solo el inicio
        fin: e.fechaFin ?? e.fechaAprobacion ?? undefined,
        color: COLOR_ETAPA[e.estado],
        enlace: `/proyectos/${proyectoId}/expediente/etapas`,
      }),
    );
  (sprints.data ?? []).forEach((s, i) =>
    filas.push({
      id: `sprint-${s.id}`,
      grupo: i === 0 ? 'Periodos de trabajo' : undefined,
      etiqueta: `Periodo ${s.numero}`,
      detalle: s.objetivo,
      inicio: s.fechaInicio,
      fin: s.fechaFin,
      color: 'bg-violet-400',
    }),
  );
  (entregables.data ?? [])
    .filter((e) => e.fechaLimite || e.fechaEntrega)
    .sort((a, b) => (a.fechaLimite ?? a.fechaEntrega!).localeCompare(b.fechaLimite ?? b.fechaEntrega!))
    .forEach((e, i) =>
      filas.push({
        id: `entregable-${e.id}`,
        grupo: i === 0 ? 'Entregables' : undefined,
        etiqueta: e.nombre,
        detalle: e.estado === 'APROBADO' ? 'Aprobado' : e.vencido ? 'Vencido' : 'Fecha límite',
        inicio: (e.estado === 'APROBADO' ? (e.fechaEntrega ?? e.fechaLimite) : e.fechaLimite)!,
        color: e.estado === 'APROBADO' ? 'bg-emerald-500' : e.vencido ? 'bg-red-500' : 'bg-sky-500',
        enlace: `/proyectos/${proyectoId}/expediente/entregables`,
      }),
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Cronograma"
          subtitle="Plazo, etapas, periodos de trabajo y entregables en una sola línea de tiempo"
          action={
            <Button size="sm" variant="ghost" icon={abierto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />} onClick={() => setAbierto((a) => !a)}>
              {abierto ? 'Ocultar' : 'Mostrar'}
            </Button>
          }
        />
        {abierto &&
          (cargando ? (
            <Spinner />
          ) : (
            <>
              <Cronograma filas={filas} />
              <LeyendaCronograma
                items={[
                  { color: 'bg-amber-400', texto: 'En elaboración' },
                  { color: 'bg-sky-500', texto: 'En revisión' },
                  { color: 'bg-red-500', texto: 'Observada / vencido' },
                  { color: 'bg-emerald-500', texto: 'Aprobado' },
                  { color: 'bg-violet-400', texto: 'Periodo de trabajo' },
                  { color: 'bg-sky-500', texto: 'Entregable', hito: true },
                ]}
              />
            </>
          ))}
      </Card>
      <TableroTab proyectoId={proyectoId} />
    </div>
  );
}
