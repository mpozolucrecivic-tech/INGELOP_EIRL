import { useState } from 'react';
import { FileSpreadsheet, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useGastosEmpresa, useResumenGastosEmpresa } from '@/api/gastos';
import { useEliminarGasto } from '@/api/recursos';
import { GastoCategoriaChart, GastoMensualChart } from '@/components/Charts';
import { TextoAyuda } from '@/components/Common';
import { GastoModal } from '@/components/gastos/GastoModal';
import { HistorialImportaciones } from '@/components/gastos/HistorialImportaciones';
import { ImportarGastosModal } from '@/components/gastos/ImportarGastosModal';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { useConfirm } from '@/components/ui/Modal';
import { CATEGORIA_GASTO_EMPRESA as CATEGORIA_GASTO, CATEGORIAS_EMPRESA, COLORES_CATEGORIA, formatFecha, formatSoles } from '@/lib/format';
import type { CategoriaGasto, Gasto } from '@/types/api';

/** Gastos que no son de ninguna obra: alquiler, servicios, sueldos, licencias, impuestos… (solo jefatura) */
export default function GastosEmpresaPage() {
  const [categoria, setCategoria] = useState<CategoriaGasto | ''>('');
  const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`);
  const [hasta, setHasta] = useState('');
  const [modal, setModal] = useState<{ gasto?: Gasto } | null>(null);
  const [importando, setImportando] = useState(false);
  const rango = { ...(desde && { desde }), ...(hasta && { hasta }) };
  const { data: resumen } = useResumenGastosEmpresa(rango);
  const { data: gastos, isLoading, error, refetch } = useGastosEmpresa({ ...rango, ...(categoria && { categoria }) });
  const eliminar = useEliminarGasto(null);
  const { confirm, dialog } = useConfirm();

  const totalFiltrado = gastos?.reduce((s, g) => s + g.monto, 0) ?? 0;
  const meses = resumen?.porMes.length ?? 0;
  const principal = resumen?.porCategoria.filter((c) => c.monto > 0).sort((a, b) => b.monto - a.monto)[0];

  return (
    <>
      <PageHeader
        title="Gastos de la empresa"
        subtitle="Lo que cuesta mantener la oficina: no pertenece a ninguna obra."
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => setImportando(true)}>
              Importar desde Excel
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
              Gasto
            </Button>
          </>
        }
      />
      <TextoAyuda>
        Alquiler, luz, internet, sueldos de oficina, licencias, impuestos y útiles. Los gastos de una obra se registran dentro de su proyecto (pestaña Gastos). Si tu Excel mezcla
        ambos, impórtalo aquí: con una columna «Obra» cada fila va a su proyecto.
      </TextoAyuda>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Input label="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {resumen && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total del período" value={formatSoles(resumen.total)} hint={`${resumen.cantidadGastos} gastos`} />
          <StatCard label="Promedio por mes" value={formatSoles(meses ? resumen.total / meses : 0)} hint={meses ? `${meses} ${meses === 1 ? 'mes con gastos' : 'meses con gastos'}` : 'Sin gastos'} />
          <StatCard
            label="Mayor gasto"
            value={principal ? CATEGORIA_GASTO[principal.categoria] : '—'}
            hint={principal ? `${formatSoles(principal.monto)} · ${principal.porcentaje}% del total` : undefined}
          />
        </div>
      )}

      {resumen && resumen.total > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Gasto mensual de la empresa" />
            <div className="p-4">
              <GastoMensualChart data={resumen.porMes} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Por categoría" />
            <div className="p-4">
              <GastoCategoriaChart data={resumen.porCategoria} etiquetas={CATEGORIA_GASTO} />
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Gastos" subtitle={gastos ? `${gastos.length} registros · ${formatSoles(totalFiltrado)}` : undefined} />
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-3">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto | '')} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {CATEGORIAS_EMPRESA.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_GASTO[c]}
              </option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !gastos?.length ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="Sin gastos en este período"
            description="Registra un gasto o importa tu Excel de gastos de oficina."
            action={
              <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => setImportando(true)}>
                Importar desde Excel
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Descripción</th>
                <th className={th}>Categoría</th>
                <th className={`${th} text-right`}>Monto</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(g.fecha)}</td>
                  <td className={`${td} font-medium text-slate-900`}>
                    {g.descripcion}
                    {g.importacionId && (
                      <FileSpreadsheet className="ml-1.5 inline size-3.5 align-[-2px] text-emerald-700" aria-label="Importado desde Excel">
                        <title>Importado desde Excel</title>
                      </FileSpreadsheet>
                    )}
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="size-2 rounded-full" style={{ background: COLORES_CATEGORIA[g.categoria] }} />
                      {CATEGORIA_GASTO[g.categoria]}
                    </span>
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatSoles(g.monto)}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <IconButton label="Editar gasto" onClick={() => setModal({ gasto: g })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Eliminar gasto"
                        className="hover:text-red-600"
                        onClick={() =>
                          confirm({
                            title: 'Eliminar gasto',
                            message: `¿Eliminar "${g.descripcion}" por ${formatSoles(g.monto)}?`,
                            onConfirm: () => eliminar.mutateAsync(g.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="mt-6">
        <HistorialImportaciones />
      </div>

      <GastoModal proyectoId={null} state={modal} onClose={() => setModal(null)} />
      <ImportarGastosModal open={importando} onClose={() => setImportando(false)} />
      {dialog}
    </>
  );
}
