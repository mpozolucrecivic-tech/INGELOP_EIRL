import { FileSpreadsheet, Undo2 } from 'lucide-react';
import { useDeshacerImportacion, useImportaciones } from '@/api/gastos';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, Table, td, th } from '@/components/ui/Display';
import { useConfirm } from '@/components/ui/Modal';
import { formatFechaHora, formatSoles } from '@/lib/format';

/** Importaciones desde Excel de un proyecto (proyectoId) o de "Gastos de la empresa" (sin proyectoId). Solo se muestra si hay alguna. */
export function HistorialImportaciones({ proyectoId }: { proyectoId?: number }) {
  const { data } = useImportaciones(proyectoId);
  const deshacer = useDeshacerImportacion();
  const { confirm, dialog } = useConfirm();
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader title="Importaciones desde Excel" subtitle="Si una importación salió mal, puedes deshacerla: se borran los gastos que trajo." />
      <Table>
        <thead>
          <tr>
            <th className={th}>Archivo</th>
            <th className={th}>Fecha</th>
            <th className={`${th} text-right`}>Gastos</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <td className={td}>
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  <FileSpreadsheet className="size-4 shrink-0 text-emerald-700" />
                  <span className="max-w-xs truncate">{i.nombreArchivo}</span>
                </p>
                {i.usuario && <p className="text-xs text-slate-500">por {i.usuario.nombre}</p>}
              </td>
              <td className={`${td} whitespace-nowrap text-xs text-slate-600`}>{formatFechaHora(i.creadoEn)}</td>
              <td className={`${td} text-right text-sm tabular-nums`}>
                {i.deshechaEn ? (
                  <Badge color="slate">Deshecha</Badge>
                ) : (
                  <>
                    {i.gastosVigentes}
                    {i.gastosVigentes !== i.cantidad && <span className="text-xs text-slate-500"> de {i.cantidad}</span>}
                  </>
                )}
              </td>
              <td className={`${td} text-right text-sm font-semibold tabular-nums`}>{formatSoles(i.total)}</td>
              <td className={td}>
                {!i.deshechaEn && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Undo2 className="size-4" />}
                      onClick={() =>
                        confirm({
                          title: 'Deshacer importación',
                          message: `Se eliminarán los ${i.gastosVigentes} gastos que trajo «${i.nombreArchivo}», incluso si los editaste después. No se puede deshacer.`,
                          confirmText: 'Deshacer importación',
                          onConfirm: () => deshacer.mutateAsync(i.id),
                        })
                      }
                    >
                      Deshacer
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {dialog}
    </Card>
  );
}
