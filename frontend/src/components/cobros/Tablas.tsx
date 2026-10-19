import { Link } from 'react-router';
import { Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useEliminarCarta, useEliminarCobro } from '@/api/cobros';
import { IconButton } from '@/components/ui/Button';
import { Badge, Table, td, th } from '@/components/ui/Display';
import { useConfirm } from '@/components/ui/Modal';
import { ESTADO_COBRO, ESTADO_GARANTIA, formatFecha, formatSoles, TIPO_GARANTIA } from '@/lib/format';
import type { CartaFianza, Cobro } from '@/types/api';

function Proyecto({ p }: { p?: { id: number; nombre: string; cliente: { nombre: string } } }) {
  if (!p) return null;
  return (
    <td className={td}>
      <Link to={`/proyectos/${p.id}/recursos/cobros`} className="line-clamp-2 font-medium text-slate-900 hover:underline">
        {p.nombre}
      </Link>
      <p className="text-xs text-slate-500">{p.cliente.nombre}</p>
    </td>
  );
}

/** Cobros de un proyecto, o de toda la empresa (conProyecto) */
export function TablaCobros({ cobros, conProyecto = false, onEditar }: { cobros: Cobro[]; conProyecto?: boolean; onEditar: (c: Cobro) => void }) {
  const eliminar = useEliminarCobro();
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <Table>
        <thead>
          <tr>
            {conProyecto && <th className={th}>Proyecto</th>}
            <th className={th}>Concepto</th>
            <th className={th}>Estado</th>
            <th className={th}>Comprobante</th>
            <th className={`${th} text-right`}>Monto</th>
            <th className={`${th} text-right`}>Neto recibido</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {cobros.map((c) => (
            <tr key={c.id} className={c.estado === 'ANULADO' ? 'text-slate-400' : 'hover:bg-slate-50'}>
              {conProyecto && <Proyecto p={c.proyecto} />}
              <td className={td}>
                <p className={c.estado === 'ANULADO' ? 'line-through' : 'font-medium text-slate-900'}>{c.concepto}</p>
                {c.estado === 'PROGRAMADO' && c.fechaProgramada && <p className="text-xs text-slate-500">Programado: {formatFecha(c.fechaProgramada)}</p>}
                {c.observacion && <p className="line-clamp-1 text-xs text-slate-500">{c.observacion}</p>}
              </td>
              <td className={td}>
                <Badge color={ESTADO_COBRO[c.estado].color}>{ESTADO_COBRO[c.estado].label}</Badge>
                {c.diasPorCobrar !== null && (
                  <p className={`mt-1 text-xs ${c.diasPorCobrar > 30 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>hace {c.diasPorCobrar} días</p>
                )}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {c.comprobante ? (
                  <>
                    <p className="font-mono text-xs text-slate-800">{c.comprobante}</p>
                    {c.fechaEmision && <p className="text-xs text-slate-500">{formatFecha(c.fechaEmision)}</p>}
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatSoles(c.monto)}</td>
              <td className={`${td} text-right tabular-nums`}>
                {c.estado === 'COBRADO' ? (
                  <>
                    <p className="font-semibold text-emerald-700">{formatSoles(c.neto)}</p>
                    {c.fechaCobro && <p className="text-xs text-slate-500">{formatFecha(c.fechaCobro)}</p>}
                    {(c.detraccion > 0 || c.penalidad > 0) && (
                      <p className="text-xs text-slate-500">
                        {c.detraccion > 0 && `Detr. ${formatSoles(c.detraccion)}`}
                        {c.detraccion > 0 && c.penalidad > 0 && ' · '}
                        {c.penalidad > 0 && <span className="text-red-600">Pen. {formatSoles(c.penalidad)}</span>}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className={td}>
                <div className="flex justify-end">
                  <IconButton label="Editar cobro" onClick={() => onEditar(c)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Eliminar cobro"
                    className="hover:text-red-600"
                    onClick={() =>
                      confirm({
                        title: 'Eliminar cobro',
                        message: `¿Eliminar «${c.concepto}»? Si el comprobante se anuló, mejor cambia el estado a «Anulado» para conservar el registro.`,
                        onConfirm: () => eliminar.mutateAsync(c.id),
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
      {dialog}
    </>
  );
}

/** Texto y color del vencimiento de una carta vigente */
export function vencimientoCarta(dias: number | null) {
  if (dias === null) return null;
  if (dias < 0) return { texto: `Venció hace ${-dias} días`, clase: 'font-semibold text-red-600' };
  if (dias === 0) return { texto: 'Vence hoy', clase: 'font-semibold text-red-600' };
  if (dias <= 15) return { texto: `Vence en ${dias} días`, clase: 'font-semibold text-amber-700' };
  return { texto: `Vence en ${dias} días`, clase: 'text-slate-500' };
}

export function TablaCartas({
  cartas,
  conProyecto = false,
  onEditar,
  onRenovar,
}: {
  cartas: CartaFianza[];
  conProyecto?: boolean;
  onEditar: (c: CartaFianza) => void;
  onRenovar: (c: CartaFianza) => void;
}) {
  const eliminar = useEliminarCarta();
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <Table>
        <thead>
          <tr>
            {conProyecto && <th className={th}>Proyecto</th>}
            <th className={th}>Carta</th>
            <th className={th}>Estado</th>
            <th className={th}>Vigencia</th>
            <th className={`${th} text-right`}>Monto</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {cartas.map((c) => {
            const venc = vencimientoCarta(c.diasParaVencer);
            return (
              <tr key={c.id} className={c.estado === 'VIGENTE' ? 'hover:bg-slate-50' : 'text-slate-500'}>
                {conProyecto && <Proyecto p={c.proyecto} />}
                <td className={td}>
                  <p className="font-medium text-slate-900">N.° {c.numero}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_GARANTIA[c.tipo]} · {c.entidadFinanciera}
                  </p>
                  {c.renovadaDe && <p className="text-xs text-slate-500">Renueva la N.° {c.renovadaDe.numero}</p>}
                </td>
                <td className={td}>
                  <Badge color={ESTADO_GARANTIA[c.estado].color}>{ESTADO_GARANTIA[c.estado].label}</Badge>
                  {c.renovadaPor && <p className="mt-1 text-xs text-slate-500">por la N.° {c.renovadaPor.numero}</p>}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <p className="text-xs text-slate-600">
                    {formatFecha(c.fechaEmision)} → {formatFecha(c.fechaVencimiento)}
                  </p>
                  {venc && <p className={`text-xs ${venc.clase}`}>{venc.texto}</p>}
                </td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{formatSoles(c.monto)}</td>
                <td className={td}>
                  <div className="flex justify-end">
                    {c.estado === 'VIGENTE' && (
                      <IconButton label="Renovar" onClick={() => onRenovar(c)}>
                        <RefreshCw className="size-4" />
                      </IconButton>
                    )}
                    <IconButton label="Editar carta" onClick={() => onEditar(c)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Eliminar carta"
                      className="hover:text-red-600"
                      onClick={() =>
                        confirm({
                          title: 'Eliminar carta fianza',
                          message: c.renovadaDe
                            ? `¿Eliminar la carta N.° ${c.numero}? La carta N.° ${c.renovadaDe.numero} volverá a quedar vigente.`
                            : `¿Eliminar la carta N.° ${c.numero}? Si la entidad la devolvió, mejor cambia su estado a «Devuelta».`,
                          onConfirm: () => eliminar.mutateAsync(c.id),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {dialog}
    </>
  );
}
