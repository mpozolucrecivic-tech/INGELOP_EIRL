import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Calculator,
  MessageSquareWarning,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { mensajeError } from '@/api/client';
import {
  useActualizarPresupuesto,
  useCrearPresupuesto,
  useDuplicarPresupuesto,
  useEliminarPresupuesto,
  useGuardarPartidas,
  usePresupuesto,
  usePresupuestos,
} from '@/api/consultoria';
import { useProyecto } from '@/api/proyectos';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_REVISION, formatFecha, formatNumero, formatSoles } from '@/lib/format';
import type { Partida, PresupuestoDetalle } from '@/types/api';

// ---------------- Cálculo (igual que en el backend) ----------------

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function calcular(filas: Partida[], pct: { gg: number; ut: number; igv: number }) {
  const parciales = filas.map((f) => (f.esTitulo ? 0 : r2((f.metrado ?? 0) * (f.precioUnitario ?? 0))));
  const conTitulos = filas.map((f, i) =>
    f.esTitulo ? r2(filas.reduce((s, x, j) => (!x.esTitulo && x.item.startsWith(`${f.item}.`) ? s + parciales[j] : s), 0)) : parciales[i],
  );
  const costoDirecto = r2(parciales.reduce((s, n) => s + n, 0));
  const gastosGenerales = r2((costoDirecto * pct.gg) / 100);
  const utilidad = r2((costoDirecto * pct.ut) / 100);
  const subtotal = r2(costoDirecto + gastosGenerales + utilidad);
  const igv = r2((subtotal * pct.igv) / 100);
  return { parciales: conTitulos, costoDirecto, gastosGenerales, utilidad, subtotal, igv, total: r2(subtotal + igv) };
}

/** Propone el siguiente código de ítem según la fila anterior */
function siguienteItem(filas: Partida[], esTitulo: boolean): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ultimo = filas[filas.length - 1];
  if (esTitulo) {
    const principales = filas.map((f) => Number(f.item.split('.')[0])).filter((n) => !Number.isNaN(n));
    return pad((principales.length ? Math.max(...principales) : 0) + 1);
  }
  if (!ultimo) return '01.01';
  if (ultimo.esTitulo) return `${ultimo.item}.01`;
  const partes = ultimo.item.split('.');
  partes[partes.length - 1] = pad(Number(partes[partes.length - 1]) + 1);
  return partes.join('.');
}

const REGEX_ITEM = /^\d{1,3}(\.\d{1,3})*$/;

function validar(filas: Partida[]): string | null {
  const vistos = new Set<string>();
  for (const f of filas) {
    if (!REGEX_ITEM.test(f.item)) return `Ítem inválido: "${f.item}" (use 01, 01.01…)`;
    if (vistos.has(f.item)) return `Ítem repetido: ${f.item}`;
    vistos.add(f.item);
    if (!f.descripcion.trim()) return `Falta la descripción del ítem ${f.item}`;
    if (!f.esTitulo && (!f.unidad || f.metrado == null || f.precioUnitario == null)) return `Completa unidad, metrado y P.U. del ítem ${f.item}`;
  }
  return null;
}

// ---------------- Exportar ----------------

function exportarCsv(p: PresupuestoDetalle, filas: Partida[], calc: ReturnType<typeof calcular>) {
  const q = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [
    [q(p.nombre), q(`Versión ${p.version}`)].join(','),
    '',
    ['Ítem', 'Descripción', 'Und.', 'Metrado', 'P.U. (S/)', 'Parcial (S/)'].map(q).join(','),
    ...filas.map((f, i) => [q(f.item), q(f.descripcion), q(f.unidad), f.metrado ?? '', f.precioUnitario ?? '', calc.parciales[i]].join(',')),
    '',
    ['', q('COSTO DIRECTO'), '', '', '', calc.costoDirecto].join(','),
    ['', q(`GASTOS GENERALES (${p.gastosGeneralesPct}%)`), '', '', '', calc.gastosGenerales].join(','),
    ['', q(`UTILIDAD (${p.utilidadPct}%)`), '', '', '', calc.utilidad].join(','),
    ['', q('SUBTOTAL'), '', '', '', calc.subtotal].join(','),
    ['', q(`IGV (${p.igvPct}%)`), '', '', '', calc.igv].join(','),
    ['', q('PRESUPUESTO TOTAL'), '', '', '', calc.total].join(','),
  ];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.nombre.replace(/[\\/:*?"<>|]+/g, '')} v${p.version}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function imprimir(p: PresupuestoDetalle, proyecto: string, cliente: string, filas: Partida[], calc: ReturnType<typeof calcular>) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const n = (v: number | null) => (v == null ? '' : formatNumero(v));
  const m = (v: number) => formatSoles(v);
  const filasHtml = filas
    .map((f, i) =>
      f.esTitulo
        ? `<tr class="t"><td>${esc(f.item)}</td><td colspan="4">${esc(f.descripcion)}</td><td class="r">${m(calc.parciales[i])}</td></tr>`
        : `<tr><td>${esc(f.item)}</td><td>${esc(f.descripcion)}</td><td>${esc(f.unidad ?? '')}</td><td class="r">${n(f.metrado)}</td><td class="r">${n(f.precioUnitario)}</td><td class="r">${m(calc.parciales[i])}</td></tr>`,
    )
    .join('');
  const tot = (label: string, v: number, strong = false) =>
    `<tr class="${strong ? 'tt' : ''}"><td colspan="5" class="r">${label}</td><td class="r">${m(v)}</td></tr>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(p.nombre)} v${p.version}</title>
<style>
body{font:12px/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;margin:24px}
h1{font-size:16px;margin:0}h2{font-size:13px;margin:4px 0 0;font-weight:600}
.meta{margin:8px 0 16px;color:#475569}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top}
th{background:#f1f5f9;text-align:left}.r{text-align:right;white-space:nowrap}
tr.t td{font-weight:700;background:#fafaf9}tr.tt td{font-weight:700;font-size:13px;background:#fef3c7}
.head{display:flex;justify-content:space-between;border-bottom:2px solid #f59e0b;padding-bottom:8px;margin-bottom:8px}
@page{size:A4;margin:14mm}
</style></head><body>
<div class="head"><div><h1>INGELOP Consultores y Ejecutores E.I.R.L.</h1><h2>${esc(p.nombre)}</h2></div><div class="r">Versión ${p.version}<br>${formatFecha(p.fecha)}</div></div>
<div class="meta"><b>Proyecto:</b> ${esc(proyecto)}<br><b>Cliente:</b> ${esc(cliente)}</div>
<table><thead><tr><th style="width:70px">Ítem</th><th>Descripción</th><th style="width:40px">Und.</th><th class="r" style="width:80px">Metrado</th><th class="r" style="width:80px">P.U.</th><th class="r" style="width:100px">Parcial</th></tr></thead>
<tbody>${filasHtml}
${tot('COSTO DIRECTO', calc.costoDirecto)}${tot(`GASTOS GENERALES (${p.gastosGeneralesPct}%)`, calc.gastosGenerales)}${tot(`UTILIDAD (${p.utilidadPct}%)`, calc.utilidad)}${tot('SUBTOTAL', calc.subtotal)}${tot(`IGV (${p.igvPct}%)`, calc.igv)}${tot('PRESUPUESTO TOTAL', calc.total, true)}
</tbody></table>
<script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return toast.error('El navegador bloqueó la ventana de impresión');
  w.document.write(html);
  w.document.close();
}

// ---------------- Componente principal ----------------

export default function PresupuestosTab({ proyectoId }: { proyectoId: number }) {
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('id')) || null;
  const abrir = (pid: number | null) => setParams(pid ? { id: String(pid) } : {}, { replace: false });

  return id ? <Editor proyectoId={proyectoId} id={id} onVolver={() => abrir(null)} onAbrir={abrir} /> : <Lista proyectoId={proyectoId} onAbrir={abrir} />;
}

function Lista({ proyectoId, onAbrir }: { proyectoId: number; onAbrir: (id: number) => void }) {
  const { data, isLoading, error, refetch } = usePresupuestos(proyectoId);
  const crear = useCrearPresupuesto(proyectoId);
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-900">Presupuestos</h3>
            <p className="text-sm text-slate-500">Presupuestos de obra elaborados para este proyecto, con sus versiones.</p>
          </div>
          <Button
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => {
              setNombre('');
              setNuevo(true);
            }}
          >
            Nuevo presupuesto
          </Button>
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState icon={<Calculator className="size-6" />} title="Sin presupuestos" description="Crea un presupuesto y carga sus partidas: metrado × precio unitario, gastos generales, utilidad e IGV." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Presupuesto</th>
                <th className={th}>Versión</th>
                <th className={th}>Estado</th>
                <th className={th}>Fecha</th>
                <th className={`${th} text-right`}>Costo directo</th>
                <th className={`${th} text-right`}>Total (inc. IGV)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} onClick={() => onAbrir(p.id)} className="cursor-pointer hover:bg-slate-50">
                  <td className={td}>
                    <button className="text-left font-medium text-slate-900 hover:text-brand-700" onClick={() => onAbrir(p.id)}>
                      {p.nombre}
                    </button>
                    <p className="text-xs text-slate-500">{p.totales.cantidadPartidas} partidas</p>
                  </td>
                  <td className={td}>v{p.version}</td>
                  <td className={td}>
                    <Badge color={ESTADO_REVISION[p.estado].color}>{ESTADO_REVISION[p.estado].label}</Badge>
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(p.fecha)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatSoles(p.totales.costoDirecto)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatSoles(p.totales.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal
        open={nuevo}
        onClose={() => setNuevo(false)}
        title="Nuevo presupuesto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNuevo(false)}>
              Cancelar
            </Button>
            <Button
              loading={crear.isPending}
              disabled={nombre.trim().length < 3}
              onClick={async () => {
                const p = await crear.mutateAsync({ nombre: nombre.trim() });
                setNuevo(false);
                onAbrir(p.id);
              }}
            >
              Crear y editar
            </Button>
          </>
        }
      >
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Presupuesto de obra – Estructuras" />
        <p className="mt-2 text-xs text-slate-500">Por defecto: gastos generales 10 %, utilidad 5 % e IGV 18 % (editables).</p>
      </Modal>
    </>
  );
}

function Editor({ proyectoId, id, onVolver, onAbrir }: { proyectoId: number; id: number; onVolver: () => void; onAbrir: (id: number) => void }) {
  const { esAdmin } = useAuth();
  const { data: p, isLoading, error, refetch } = usePresupuesto(id);
  const { data: proyecto } = useProyecto(proyectoId);
  const guardarPartidas = useGuardarPartidas(proyectoId);
  const actualizar = useActualizarPresupuesto(proyectoId);
  const duplicar = useDuplicarPresupuesto(proyectoId);
  const eliminar = useEliminarPresupuesto(proyectoId);
  const { confirm, dialog } = useConfirm();

  const [filas, setFilas] = useState<Partida[]>([]);
  const [pct, setPct] = useState({ gg: 10, ut: 5, igv: 18 });
  const [guardando, setGuardando] = useState(false);
  const [observar, setObservar] = useState(false);
  const [nota, setNota] = useState('');

  const original = useMemo(
    () => (p ? JSON.stringify({ f: p.partidas.map(limpiar), pct: { gg: p.gastosGeneralesPct, ut: p.utilidadPct, igv: p.igvPct } }) : ''),
    [p],
  );
  useEffect(() => {
    if (!p) return;
    setFilas(p.partidas.map(limpiar));
    setPct({ gg: p.gastosGeneralesPct, ut: p.utilidadPct, igv: p.igvPct });
  }, [p]);

  const calc = useMemo(() => calcular(filas, pct), [filas, pct]);
  const sucio = !!p && JSON.stringify({ f: filas.map(limpiar), pct }) !== original;

  // Aviso al cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sucio]);

  if (isLoading) return <Spinner />;
  if (error || !p) return <ErrorState error={error} onRetry={refetch} />;

  const editable = p.estado !== 'APROBADO';

  const set = (i: number, patch: Partial<Partida>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const agregar = (esTitulo: boolean) =>
    setFilas((fs) => [...fs, { item: siguienteItem(fs, esTitulo), descripcion: '', esTitulo, unidad: esTitulo ? null : '', metrado: null, precioUnitario: null }]);
  const mover = (i: number, d: -1 | 1) =>
    setFilas((fs) => {
      const j = i + d;
      if (j < 0 || j >= fs.length) return fs;
      const c = [...fs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const quitar = (i: number) => setFilas((fs) => fs.filter((_, j) => j !== i));

  const guardar = async () => {
    const err = validar(filas);
    if (err) return toast.error(err);
    setGuardando(true);
    try {
      if (pct.gg !== p.gastosGeneralesPct || pct.ut !== p.utilidadPct || pct.igv !== p.igvPct) {
        await actualizar.mutateAsync({ id: p.id, gastosGeneralesPct: pct.gg, utilidadPct: pct.ut, igvPct: pct.igv });
      }
      await guardarPartidas.mutateAsync({ id: p.id, partidas: filas.map(limpiar) });
      toast.success('Presupuesto guardado');
      return true;
    } catch (e) {
      toast.error(mensajeError(e));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (estado: 'EN_REVISION' | 'APROBADO' | 'OBSERVADO' | 'BORRADOR', observaciones?: string) => {
    if (sucio && !(await guardar())) return;
    await actualizar.mutateAsync({ id: p.id, estado, ...(observaciones !== undefined && { observaciones }) });
    toast.success(`Presupuesto ${ESTADO_REVISION[estado].label.toLowerCase()}`);
  };

  const numero = (v: string) => (v === '' ? null : Number(v));
  const celda = 'h-8 w-full rounded border border-transparent bg-transparent px-1.5 text-sm hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none disabled:hover:border-transparent';

  return (
    <>
      <button onClick={onVolver} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" />
        Presupuestos
      </button>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{p.nombre}</h2>
              <Badge>v{p.version}</Badge>
              <Badge color={ESTADO_REVISION[p.estado].color}>{ESTADO_REVISION[p.estado].label}</Badge>
              {sucio && <Badge color="amber">Cambios sin guardar</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {formatFecha(p.fecha)} · {calc.parciales.filter((_, i) => !filas[i]?.esTitulo).length} partidas
            </p>
            {p.observaciones && <p className="mt-2 max-w-2xl text-sm text-slate-600">{p.observaciones}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button icon={<Save className="size-4" />} onClick={guardar} loading={guardando} disabled={!sucio}>
                Guardar
              </Button>
            )}
            {(p.estado === 'BORRADOR' || p.estado === 'OBSERVADO') && (
              <Button variant="secondary" icon={<Send className="size-4" />} onClick={() => cambiarEstado('EN_REVISION')}>
                Enviar a revisión
              </Button>
            )}
            {esAdmin && p.estado === 'EN_REVISION' && (
              <>
                <Button variant="secondary" icon={<CheckCircle2 className="size-4 text-emerald-600" />} onClick={() => cambiarEstado('APROBADO')}>
                  Aprobar
                </Button>
                <Button
                  variant="secondary"
                  icon={<MessageSquareWarning className="size-4 text-red-600" />}
                  onClick={() => {
                    setNota(p.observaciones ?? '');
                    setObservar(true);
                  }}
                >
                  Observar
                </Button>
              </>
            )}
            <Button variant="secondary" icon={<Copy className="size-4" />} onClick={async () => onAbrir((await duplicar.mutateAsync(p.id)).id)} loading={duplicar.isPending}>
              Nueva versión
            </Button>
            <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => exportarCsv({ ...p, gastosGeneralesPct: pct.gg, utilidadPct: pct.ut, igvPct: pct.igv }, filas, calc)}>
              Excel
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="size-4" />}
              onClick={() => imprimir({ ...p, gastosGeneralesPct: pct.gg, utilidadPct: pct.ut, igvPct: pct.igv }, proyecto?.nombre ?? '', proyecto?.cliente.nombre ?? '', filas, calc)}
            >
              Imprimir / PDF
            </Button>
            {esAdmin && (
              <IconButton
                label="Eliminar presupuesto"
                className="hover:text-red-600"
                onClick={() =>
                  confirm({
                    title: 'Eliminar presupuesto',
                    message: `¿Eliminar "${p.nombre}" v${p.version} y todas sus partidas?`,
                    onConfirm: async () => {
                      await eliminar.mutateAsync(p.id);
                      onVolver();
                    },
                  })
                }
              >
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        </div>
        {!editable && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Presupuesto aprobado: no se puede modificar. Para cambiarlo, crea una <b>nueva versión</b>.
          </p>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr>
                <th className={`${th} w-28`}>Ítem</th>
                <th className={th}>Descripción</th>
                <th className={`${th} w-20`}>Und.</th>
                <th className={`${th} w-28 text-right`}>Metrado</th>
                <th className={`${th} w-28 text-right`}>P.U. (S/)</th>
                <th className={`${th} w-32 text-right`}>Parcial (S/)</th>
                {editable && <th className={`${th} w-24`} />}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} className={clsx('border-b border-slate-100', f.esTitulo ? 'bg-slate-50 font-semibold' : 'hover:bg-amber-50/30')}>
                  <td className="px-2 py-1">
                    <input className={clsx(celda, 'font-mono')} value={f.item} disabled={!editable} onChange={(e) => set(i, { item: e.target.value.trim() })} aria-label="Ítem" />
                  </td>
                  <td className="px-2 py-1" colSpan={f.esTitulo ? 4 : 1}>
                    <input
                      className={clsx(celda, f.esTitulo && 'font-semibold uppercase')}
                      value={f.descripcion}
                      disabled={!editable}
                      placeholder={f.esTitulo ? 'TÍTULO' : 'Descripción de la partida'}
                      onChange={(e) => set(i, { descripcion: e.target.value })}
                      aria-label="Descripción"
                    />
                  </td>
                  {!f.esTitulo && (
                    <>
                      <td className="px-2 py-1">
                        <input className={celda} value={f.unidad ?? ''} disabled={!editable} placeholder="m3" onChange={(e) => set(i, { unidad: e.target.value })} aria-label="Unidad" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" min={0} className={clsx(celda, 'text-right tabular-nums')} value={f.metrado ?? ''} disabled={!editable} onChange={(e) => set(i, { metrado: numero(e.target.value) })} aria-label="Metrado" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" min={0} className={clsx(celda, 'text-right tabular-nums')} value={f.precioUnitario ?? ''} disabled={!editable} onChange={(e) => set(i, { precioUnitario: numero(e.target.value) })} aria-label="Precio unitario" />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-1 text-right tabular-nums">{formatNumero(calc.parciales[i] ?? 0)}</td>
                  {editable && (
                    <td className="px-1 py-1">
                      <div className="flex justify-end">
                        <IconButton label="Subir fila" className="size-7" onClick={() => mover(i, -1)} disabled={i === 0}>
                          <ArrowUp className="size-3.5" />
                        </IconButton>
                        <IconButton label="Bajar fila" className="size-7" onClick={() => mover(i, 1)} disabled={i === filas.length - 1}>
                          <ArrowDown className="size-3.5" />
                        </IconButton>
                        <IconButton label="Quitar fila" className="size-7 hover:text-red-600" onClick={() => quitar(i)}>
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!filas.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Agrega un título (ej. 01 OBRAS PROVISIONALES) y luego sus partidas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => agregar(true)}>
              Título
            </Button>
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => agregar(false)}>
              Partida
            </Button>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/60 px-4 py-4">
          <dl className="w-full max-w-md space-y-1.5 text-sm">
            <Fila label="Costo directo" valor={calc.costoDirecto} />
            <FilaPct label="Gastos generales" pct={pct.gg} editable={editable} onChange={(v) => setPct((x) => ({ ...x, gg: v }))} valor={calc.gastosGenerales} />
            <FilaPct label="Utilidad" pct={pct.ut} editable={editable} onChange={(v) => setPct((x) => ({ ...x, ut: v }))} valor={calc.utilidad} />
            <Fila label="Subtotal" valor={calc.subtotal} />
            <FilaPct label="IGV" pct={pct.igv} editable={editable} onChange={(v) => setPct((x) => ({ ...x, igv: v }))} valor={calc.igv} />
            <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
              <dt>Presupuesto total</dt>
              <dd className="tabular-nums">{formatSoles(calc.total)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Modal
        open={observar}
        onClose={() => setObservar(false)}
        title="Observar presupuesto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setObservar(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={nota.trim().length < 3}
              onClick={async () => {
                await cambiarEstado('OBSERVADO', nota.trim());
                setObservar(false);
              }}
            >
              Enviar observación
            </Button>
          </>
        }
      >
        <Textarea label="Observaciones" rows={4} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Revisar precios de concreto; falta partida de curado" />
      </Modal>
      {dialog}
    </>
  );
}

function limpiar(f: Partida): Partida {
  return {
    item: f.item,
    descripcion: f.descripcion,
    esTitulo: f.esTitulo,
    unidad: f.esTitulo ? null : f.unidad,
    metrado: f.esTitulo ? null : f.metrado,
    precioUnitario: f.esTitulo ? null : f.precioUnitario,
  };
}

function Fila({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-slate-700">
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatSoles(valor)}</dd>
    </div>
  );
}

function FilaPct({ label, pct, valor, editable, onChange }: { label: string; pct: number; valor: number; editable: boolean; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between text-slate-700">
      <dt className="flex items-center gap-2">
        {label}
        <span className="inline-flex items-center gap-0.5">
          (
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={pct}
            disabled={!editable}
            onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="h-6 w-14 rounded border border-slate-300 px-1 text-right text-xs tabular-nums disabled:border-transparent disabled:bg-transparent"
            aria-label={`Porcentaje de ${label}`}
          />
          %)
        </span>
      </dt>
      <dd className="tabular-nums">{formatSoles(valor)}</dd>
    </div>
  );
}
