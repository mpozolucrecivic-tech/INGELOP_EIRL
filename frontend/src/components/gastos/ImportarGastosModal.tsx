import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mensajeError } from '@/api/client';
import { useImportarGastos, verificarImportacion, type FilaAImportar, type VerificacionFila } from '@/api/gastos';
import { useProyectos } from '@/api/proyectos';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Display';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { CATEGORIAS_EMPRESA, CATEGORIAS_PROYECTO, etiquetasCategoria, formatFecha, formatSoles } from '@/lib/format';
import {
  convertirFecha,
  convertirMonto,
  descargarPlantilla,
  detectarEncabezado,
  EMPRESA,
  leerArchivo,
  letraColumna,
  MAX_MB_ARCHIVO,
  motivoIgnorar,
  nombresColumnas,
  normalizar,
  OMITIR,
  sugerirCategoria,
  sugerirDestino,
  sugerirMapeo,
  textoCelda,
  type Campo,
  type Celda,
  type DestinoObra,
  type Hoja,
  type Mapeo,
} from '@/lib/importarExcel';
import type { CategoriaGasto } from '@/types/api';

const MAX_FILAS = 1000;
const AUTO = 'AUTO';
type Tipo = 'proyecto' | 'empresa';

interface Memoria {
  encabezados: Partial<Record<Campo, string>>;
  categoriaSinColumna: CategoriaGasto | typeof AUTO;
  categorias: Record<string, CategoriaGasto>;
  obras: Record<string, DestinoObra>;
}

// El emparejamiento se recuerda en este navegador (si no hay almacenamiento, simplemente no se recuerda)
const claveMemoria = (proyectoId?: number) => `ingelop.importarGastos.${proyectoId ? 'proyecto' : 'empresa'}`;
function leerMemoria(proyectoId?: number): Memoria | null {
  try {
    const crudo = localStorage.getItem(claveMemoria(proyectoId));
    return crudo ? (JSON.parse(crudo) as Memoria) : null;
  } catch {
    return null;
  }
}
function guardarMemoria(proyectoId: number | undefined, memoria: Memoria) {
  try {
    localStorage.setItem(claveMemoria(proyectoId), JSON.stringify(memoria));
  } catch {
    /* sin almacenamiento disponible */
  }
}

interface FilaRevisada {
  n: number; // número de fila en el Excel
  estado: 'ok' | 'error' | 'ignorada';
  motivo?: string;
  datos?: FilaAImportar;
  destino?: DestinoObra;
  vista: { fecha: string; descripcion: string; monto: string };
}

const CAMPOS: { campo: Campo; label: string; obligatorio: boolean; ayuda: string }[] = [
  { campo: 'fecha', label: 'Fecha', obligatorio: true, ayuda: 'Fecha del gasto' },
  { campo: 'descripcion', label: 'Descripción', obligatorio: true, ayuda: 'Concepto o detalle' },
  { campo: 'monto', label: 'Monto (S/)', obligatorio: true, ayuda: 'Importe total en soles' },
  { campo: 'categoria', label: 'Categoría', obligatorio: false, ayuda: 'Tipo o rubro del gasto' },
  { campo: 'proyecto', label: 'Obra / proyecto', obligatorio: false, ayuda: 'A qué obra pertenece' },
];

const PASOS = ['Archivo', 'Columnas', 'Categorías', 'Revisar'];

/**
 * Asistente para importar gastos desde Excel/CSV.
 * Con proyectoId: todo va a ese proyecto. Sin él ("Gastos de la empresa"): una columna Obra opcional reparte cada fila
 * entre los proyectos y la empresa.
 */
export function ImportarGastosModal({ open, onClose, proyectoId }: { open: boolean; onClose: () => void; proyectoId?: number }) {
  const desdeEmpresa = proyectoId === undefined;
  const { data: proyectos } = useProyectos();
  const importar = useImportarGastos();

  const [paso, setPaso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojas, setHojas] = useState<Hoja[]>([]);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [filaEnc, setFilaEnc] = useState(0);
  const [leyendo, setLeyendo] = useState(false);
  const [mapeo, setMapeo] = useState<Mapeo>({ fecha: null, descripcion: null, monto: null, categoria: null, proyecto: null });
  const [categoriaSinColumna, setCategoriaSinColumna] = useState<CategoriaGasto | typeof AUTO>(AUTO);
  const [mapCategorias, setMapCategorias] = useState<Record<string, CategoriaGasto>>({});
  const [mapObras, setMapObras] = useState<Record<string, DestinoObra>>({});
  const [catFila, setCatFila] = useState<Record<number, CategoriaGasto>>({}); // cambios hechos fila por fila al revisar
  const [verificacion, setVerificacion] = useState<Map<number, VerificacionFila> | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [filtro, setFiltro] = useState<'todas' | 'ok' | 'duplicadas' | 'error' | 'ignorada'>('todas');

  useEffect(() => {
    if (open) return;
    // Al cerrar se descarta todo: el archivo nunca se guarda
    setPaso(0);
    setArchivo(null);
    setHojas([]);
    setVerificacion(null);
    setSeleccion(new Set());
    setFiltro('todas');
    setCatFila({});
  }, [open]);

  const hoja = hojas[hojaIdx];
  const columnas = useMemo(() => (hoja ? nombresColumnas(hoja.filas, filaEnc) : []), [hoja, filaEnc]);
  const camposVisibles = CAMPOS.filter((c) => c.campo !== 'proyecto' || desdeEmpresa);
  const usaObra = desdeEmpresa && mapeo.proyecto !== null;

  /** Aplica lo recordado de la última vez si las columnas coinciden; si no, lo que sugieren los nombres */
  function prepararHoja(h: Hoja, encabezado: number) {
    const cols = nombresColumnas(h.filas, encabezado);
    const campos = camposVisibles.map((c) => c.campo);
    const sugerido = sugerirMapeo(cols, campos);
    const memoria = leerMemoria(proyectoId);
    if (memoria) {
      for (const campo of campos) {
        const nombre = memoria.encabezados[campo];
        const i = nombre ? cols.findIndex((c) => normalizar(c) === nombre) : -1;
        if (i >= 0) {
          for (const otro of campos) if (sugerido[otro] === i) sugerido[otro] = null;
          sugerido[campo] = i;
        }
      }
      setCategoriaSinColumna(memoria.categoriaSinColumna ?? AUTO);
      setMapCategorias(memoria.categorias ?? {});
      setMapObras(memoria.obras ?? {});
    }
    setMapeo(sugerido);
  }

  async function elegirArchivo(f: File | undefined) {
    if (!f) return;
    setLeyendo(true);
    try {
      const leidas = await leerArchivo(f);
      const primera = leidas.findIndex((h) => h.filas.some((fila) => fila.length > 0));
      const idx = Math.max(0, primera);
      const enc = detectarEncabezado(leidas[idx].filas);
      setArchivo(f);
      setCatFila({});
      setHojas(leidas);
      setHojaIdx(idx);
      setFilaEnc(enc);
      prepararHoja(leidas[idx], enc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    } finally {
      setLeyendo(false);
    }
  }

  function cambiarHoja(i: number) {
    const enc = detectarEncabezado(hojas[i].filas);
    setHojaIdx(i);
    setFilaEnc(enc);
    prepararHoja(hojas[i], enc);
  }

  function cambiarEncabezado(i: number) {
    setFilaEnc(i);
    if (hoja) prepararHoja(hoja, i);
  }

  const celda = (fila: Celda[], campo: Campo) => (mapeo[campo] === null ? null : (fila[mapeo[campo]!] ?? null));
  const listas = proyectos?.map((p) => ({ id: p.id, nombre: p.nombre })) ?? [];

  const destinoDe = (fila: Celda[]): DestinoObra => {
    if (!desdeEmpresa) return proyectoId!;
    if (!usaObra) return EMPRESA;
    const valor = textoCelda(celda(fila, 'proyecto'));
    return mapObras[normalizar(valor)] ?? sugerirDestino(valor, listas);
  };
  const tipoDe = (d: DestinoObra): Tipo => (d === EMPRESA ? 'empresa' : 'proyecto');
  const categoriasDe = (t: Tipo) => (t === 'empresa' ? CATEGORIAS_EMPRESA : CATEGORIAS_PROYECTO);

  const categoriaDe = (fila: Celda[], tipo: Tipo, descripcion: string): CategoriaGasto => {
    const valor = textoCelda(celda(fila, 'categoria'));
    if (valor) return mapCategorias[`${tipo}|${normalizar(valor)}`] ?? sugerirCategoria(valor, tipo, etiquetasCategoria(tipo === 'empresa'), categoriasDe(tipo));
    if (categoriaSinColumna !== AUTO && categoriasDe(tipo).includes(categoriaSinColumna)) return categoriaSinColumna;
    return sugerirCategoria(descripcion, tipo, etiquetasCategoria(tipo === 'empresa'), categoriasDe(tipo));
  };

  /** Cada fila de datos con su resultado: lista para importar, con error (y por qué) o ignorada */
  const revisadas = useMemo<FilaRevisada[]>(() => {
    if (!hoja || paso < 2) return [];
    return hoja.filas.slice(filaEnc + 1).map((fila, i) => {
      const n = filaEnc + 2 + i;
      const crudoFecha = textoCelda(celda(fila, 'fecha'));
      const crudoMonto = celda(fila, 'monto');
      const descripcion = textoCelda(celda(fila, 'descripcion')).replace(/\s+/g, ' ').slice(0, 500);
      const vista = { fecha: crudoFecha, descripcion, monto: textoCelda(crudoMonto) };
      const ignorar = motivoIgnorar(fila, mapeo);
      if (ignorar) return { n, estado: 'ignorada', motivo: ignorar, vista };

      const fecha = convertirFecha(celda(fila, 'fecha'));
      const monto = convertirMonto(crudoMonto);
      const destino = destinoDe(fila);
      let motivo: string | undefined;
      if (!fecha) motivo = crudoFecha ? `Fecha no reconocida: «${crudoFecha}»` : 'Sin fecha';
      else if ('error' in monto) motivo = monto.error;
      else if (descripcion.length < 3) motivo = 'Sin descripción (mínimo 3 letras)';
      if (motivo || !fecha || 'error' in monto) return { n, estado: 'error', motivo, vista, destino };
      if (destino === OMITIR) return { n, estado: 'ignorada', motivo: `Obra «${textoCelda(celda(fila, 'proyecto')) || 'vacía'}» marcada como «No importar»`, vista };

      const tipo = tipoDe(destino);
      return {
        n,
        estado: 'ok',
        destino,
        vista,
        datos: {
          fila: n,
          proyectoId: destino === EMPRESA ? null : destino,
          categoria: catFila[n] && categoriasDe(tipo).includes(catFila[n]) ? catFila[n] : categoriaDe(fila, tipo, descripcion),
          descripcion,
          monto: monto.valor,
          fecha,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoja, filaEnc, mapeo, mapCategorias, mapObras, categoriaSinColumna, catFila, paso, proyectos]);

  const validas = revisadas.filter((r) => r.estado === 'ok');

  // Valores distintos para emparejar en el paso «Categorías»
  const valoresCategoria = useMemo(() => {
    if (!hoja || mapeo.categoria === null) return [] as { tipo: Tipo; valor: string; cantidad: number }[];
    const conteo = new Map<string, { tipo: Tipo; valor: string; cantidad: number }>();
    for (const fila of hoja.filas.slice(filaEnc + 1)) {
      if (motivoIgnorar(fila, mapeo)) continue;
      const valor = textoCelda(celda(fila, 'categoria'));
      const destino = destinoDe(fila);
      if (!valor || destino === OMITIR) continue;
      const tipo = tipoDe(destino);
      const clave = `${tipo}|${normalizar(valor)}`;
      const previo = conteo.get(clave);
      if (previo) previo.cantidad++;
      else conteo.set(clave, { tipo, valor, cantidad: 1 });
    }
    return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoja, filaEnc, mapeo, mapObras, proyectos]);

  const valoresObra = useMemo(() => {
    if (!hoja || !usaObra) return [] as { valor: string; cantidad: number; clave: string }[];
    const conteo = new Map<string, { valor: string; cantidad: number }>();
    for (const fila of hoja.filas.slice(filaEnc + 1)) {
      if (motivoIgnorar(fila, mapeo)) continue;
      const valor = textoCelda(celda(fila, 'proyecto'));
      const clave = normalizar(valor);
      const previo = conteo.get(clave);
      if (previo) previo.cantidad++;
      else conteo.set(clave, { valor: valor || '(vacío)', cantidad: 1 });
    }
    return [...conteo.entries()].map(([clave, v]) => ({ ...v, clave })).sort((a, b) => b.cantidad - a.cantidad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoja, filaEnc, mapeo, usaObra]);

  const faltan = CAMPOS.filter((c) => c.obligatorio && mapeo[c.campo] === null);
  const repetidas = new Set(Object.values(mapeo).filter((v) => v !== null)).size !== Object.values(mapeo).filter((v) => v !== null).length;

  async function irARevisar() {
    // Guarda el emparejamiento para la próxima vez
    const encabezados: Partial<Record<Campo, string>> = {};
    for (const { campo } of camposVisibles) if (mapeo[campo] !== null) encabezados[campo] = normalizar(columnas[mapeo[campo]!]);
    const obrasConfirmadas = Object.fromEntries(valoresObra.map((v) => [v.clave, mapObras[v.clave] ?? sugerirDestino(v.valor === '(vacío)' ? '' : v.valor, listas)]));
    guardarMemoria(proyectoId, { encabezados, categoriaSinColumna, categorias: mapCategorias, obras: { ...mapObras, ...obrasConfirmadas } });
    setMapObras((m) => ({ ...m, ...obrasConfirmadas }));
    setPaso(3);
  }

  // Al llegar a «Revisar» se consulta a la API qué filas parecen repetidas
  useEffect(() => {
    if (paso !== 3) return;
    const filas = validas.map((r) => r.datos!);
    if (!filas.length || filas.length > MAX_FILAS) {
      setVerificacion(new Map());
      setSeleccion(new Set(filas.map((f) => f.fila)));
      return;
    }
    let vigente = true;
    setVerificando(true);
    verificarImportacion(filas)
      .then((res) => {
        if (!vigente) return;
        const mapa = new Map(res.map((v) => [v.fila, v]));
        setVerificacion(mapa);
        setSeleccion(new Set(filas.filter((f) => !mapa.get(f.fila)?.duplicado).map((f) => f.fila)));
      })
      .catch((e) => {
        if (vigente) toast.error(mensajeError(e));
      })
      .finally(() => vigente && setVerificando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  const elegidas = validas.filter((r) => seleccion.has(r.n));
  const totalElegido = elegidas.reduce((s, r) => s + r.datos!.monto, 0);
  const duplicadas = validas.filter((r) => verificacion?.get(r.n)?.duplicado);
  const conError = revisadas.filter((r) => r.estado === 'error');
  const ignoradas = revisadas.filter((r) => r.estado === 'ignorada');
  const visibles = revisadas.filter((r) =>
    filtro === 'todas'
      ? r.estado !== 'ignorada'
      : filtro === 'duplicadas'
        ? r.estado === 'ok' && verificacion?.get(r.n)?.duplicado
        : filtro === 'ok'
          ? r.estado === 'ok' && !verificacion?.get(r.n)?.duplicado
          : r.estado === filtro,
  );

  async function confirmarImportacion() {
    await importar.mutateAsync({
      nombreArchivo: archivo?.name ?? 'archivo.xlsx',
      origenProyectoId: proyectoId ?? null,
      filas: elegidas.map((r) => r.datos!),
    });
    onClose();
  }

  const nombreDestino = (d?: DestinoObra) => (d === EMPRESA ? 'Empresa' : d === OMITIR || d === undefined ? '—' : (proyectos?.find((p) => p.id === d)?.nombre ?? `Proyecto ${d}`));
  const plantilla = () =>
    descargarPlantilla((desdeEmpresa ? CATEGORIAS_EMPRESA : CATEGORIAS_PROYECTO).map((c) => etiquetasCategoria(desdeEmpresa)[c]), desdeEmpresa).catch((e) => toast.error(mensajeError(e)));

  // ---------- Pasos ----------

  const pasoArchivo = (
    <div className="space-y-4">
      <label
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          archivo ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50',
        )}
      >
        {archivo ? <FileSpreadsheet className="size-8 text-emerald-700" /> : <Upload className="size-8 text-slate-400" />}
        <span className="text-sm font-medium text-slate-800">{leyendo ? 'Leyendo…' : archivo ? archivo.name : 'Elige el archivo de gastos'}</span>
        <span className="text-xs text-slate-500">
          {archivo ? 'Clic para elegir otro' : `Excel (.xlsx) o CSV, hasta ${MAX_MB_ARCHIVO} MB. El archivo se lee en tu navegador y no se guarda.`}
        </span>
        <input type="file" accept=".xlsx,.csv" className="sr-only" disabled={leyendo} onChange={(e) => elegirArchivo(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      </label>

      {hoja && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {hojas.length > 1 && (
              <Select label="Hoja" value={hojaIdx} onChange={(e) => cambiarHoja(Number(e.target.value))}>
                {hojas.map((h, i) => (
                  <option key={i} value={i}>
                    {h.nombre}
                  </option>
                ))}
              </Select>
            )}
            <Select label="Fila de encabezados" value={filaEnc} onChange={(e) => cambiarEncabezado(Number(e.target.value))} hint="La fila con los títulos de las columnas. Se detecta sola.">
              {hoja.filas.slice(0, 30).map((_, i) => (
                <option key={i} value={i}>
                  Fila {i + 1}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Vista previa (clic en una fila para marcarla como encabezados)</p>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <tbody>
                  {hoja.filas.slice(0, 15).map((fila, i) => (
                    <tr
                      key={i}
                      onClick={() => cambiarEncabezado(i)}
                      className={clsx('cursor-pointer border-b border-slate-100', i === filaEnc ? 'bg-brand-100 font-semibold text-slate-900' : i < filaEnc ? 'text-slate-400' : 'hover:bg-slate-50')}
                    >
                      <td className="w-10 bg-slate-50 px-2 py-1.5 text-right text-slate-400">{i + 1}</td>
                      {Array.from({ length: Math.max(columnas.length, fila.length) }, (_, c) => (
                        <td key={c} className="max-w-48 truncate px-2 py-1.5">
                          {textoCelda(fila[c] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-slate-500">{Math.max(0, hoja.filas.length - filaEnc - 1)} filas debajo de los encabezados.</p>
          </div>
        </>
      )}
      <button type="button" onClick={plantilla} className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
        <Download className="size-4" /> Descargar plantilla de Excel
      </button>
    </div>
  );

  const muestras = (i: number | null) =>
    i === null || !hoja
      ? []
      : hoja.filas
          .slice(filaEnc + 1)
          .map((f) => textoCelda(f[i] ?? null))
          .filter(Boolean)
          .slice(0, 3);

  const pasoColumnas = (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Indica qué columna de tu archivo corresponde a cada dato. Ya propusimos lo que reconocimos por el nombre.</p>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {camposVisibles.map(({ campo, label, obligatorio, ayuda }) => (
          <div key={campo} className="grid items-center gap-2 p-3 sm:grid-cols-[180px_1fr]">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {label} {obligatorio ? <span className="text-red-600">*</span> : <span className="text-xs font-normal text-slate-400">(opcional)</span>}
              </p>
              <p className="text-xs text-slate-500">{ayuda}</p>
            </div>
            <div>
              <Select
                aria-label={label}
                value={mapeo[campo] ?? ''}
                onChange={(e) => setMapeo((m) => ({ ...m, [campo]: e.target.value === '' ? null : Number(e.target.value) }))}
              >
                <option value="">{obligatorio ? '— Elige una columna —' : '— No está en mi archivo —'}</option>
                {columnas.map((c, i) => (
                  <option key={i} value={i}>
                    {letraColumna(i)} · {c}
                  </option>
                ))}
              </Select>
              {muestras(mapeo[campo]).length > 0 && <p className="mt-1 truncate text-xs text-slate-500">Ej.: {muestras(mapeo[campo]).join(' · ')}</p>}
            </div>
          </div>
        ))}
      </div>
      {mapeo.categoria === null && (
        <Select
          label="Sin columna de categoría, ¿cómo clasificar los gastos?"
          value={categoriaSinColumna}
          onChange={(e) => setCategoriaSinColumna(e.target.value as CategoriaGasto | typeof AUTO)}
          hint={usaObra ? 'Con la columna Obra se detecta por la descripción (las categorías de obra y de empresa son distintas).' : undefined}
        >
          <option value={AUTO}>Detectar por la descripción (puedes corregir después)</option>
          {!usaObra &&
            (desdeEmpresa ? CATEGORIAS_EMPRESA : CATEGORIAS_PROYECTO).map((c) => (
              <option key={c} value={c}>
                Todas como «{etiquetasCategoria(desdeEmpresa)[c]}»
              </option>
            ))}
        </Select>
      )}
      {faltan.length > 0 && <p className="text-sm text-amber-700">Falta elegir: {faltan.map((c) => c.label).join(', ')}.</p>}
      {repetidas && <p className="text-sm text-red-600">Una misma columna está elegida para dos datos.</p>}
    </div>
  );

  const pasoCategorias = (
    <div className="space-y-5">
      {valoresObra.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800">Obras</h3>
          <p className="mb-2 text-xs text-slate-500">A qué proyecto va cada valor de la columna Obra. «Empresa» = gastos de la oficina.</p>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {valoresObra.map((v) => {
              const actual = mapObras[v.clave] ?? sugerirDestino(v.valor === '(vacío)' ? '' : v.valor, listas);
              return (
                <div key={v.clave} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_260px]">
                  <p className="text-sm text-slate-800">
                    {v.valor} <span className="text-xs text-slate-500">· {v.cantidad} {v.cantidad === 1 ? 'fila' : 'filas'}</span>
                  </p>
                  <Select
                    aria-label={`Destino de ${v.valor}`}
                    value={String(actual)}
                    error={actual === OMITIR ? 'Elige un destino o se omitirán' : undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMapObras((m) => ({ ...m, [v.clave]: val === EMPRESA || val === OMITIR ? val : Number(val) }));
                    }}
                  >
                    <option value={OMITIR}>— No importar estas filas —</option>
                    <option value={EMPRESA}>Empresa (oficina)</option>
                    {proyectos?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {(['proyecto', 'empresa'] as Tipo[]).map((tipo) => {
        const valores = valoresCategoria.filter((v) => v.tipo === tipo);
        if (!valores.length) return null;
        return (
          <section key={tipo}>
            <h3 className="text-sm font-semibold text-slate-800">{tipo === 'empresa' ? 'Categorías de gastos de la empresa' : 'Categorías de gastos de obra'}</h3>
            <p className="mb-2 text-xs text-slate-500">Cómo se llama cada valor de tu columna Categoría en el sistema.</p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {valores.map((v) => {
                const clave = `${tipo}|${normalizar(v.valor)}`;
                const actual = mapCategorias[clave] ?? sugerirCategoria(v.valor, tipo, etiquetasCategoria(tipo === 'empresa'), categoriasDe(tipo));
                return (
                  <div key={clave} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_260px]">
                    <p className="text-sm text-slate-800">
                      {v.valor} <span className="text-xs text-slate-500">· {v.cantidad} {v.cantidad === 1 ? 'fila' : 'filas'}</span>
                    </p>
                    <Select aria-label={`Categoría para ${v.valor}`} value={actual} onChange={(e) => setMapCategorias((m) => ({ ...m, [clave]: e.target.value as CategoriaGasto }))}>
                      {categoriasDe(tipo).map((c) => (
                        <option key={c} value={c}>
                          {etiquetasCategoria(tipo === 'empresa')[c]}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

  const chip = (valor: typeof filtro, label: string, n: number, color: string) => (
    <button
      type="button"
      onClick={() => setFiltro(valor)}
      className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', filtro === valor ? `${color} ring-current` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
    >
      {label} · {n}
    </button>
  );

  const pasoRevisar = (
    <div className="space-y-3">
      {validas.length > MAX_FILAS && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          El archivo tiene {validas.length} gastos válidos y el máximo por importación es {MAX_FILAS}. Divide el archivo en partes.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {chip('todas', 'Todas', revisadas.length - ignoradas.length, 'bg-slate-100 text-slate-800')}
        {chip('ok', 'Listas', validas.length - duplicadas.length, 'bg-emerald-50 text-emerald-700')}
        {chip('duplicadas', 'Posibles duplicados', duplicadas.length, 'bg-amber-50 text-amber-800')}
        {chip('error', 'Con error', conError.length, 'bg-red-50 text-red-700')}
        {chip('ignorada', 'Ignoradas', ignoradas.length, 'bg-slate-100 text-slate-700')}
      </div>
      {verificando ? (
        <p className="py-8 text-center text-sm text-slate-500">Buscando gastos repetidos…</p>
      ) : (
        <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Elegir todas las válidas"
                    checked={validas.length > 0 && elegidas.length === validas.length}
                    onChange={(e) => setSeleccion(e.target.checked ? new Set(validas.map((r) => r.n)) : new Set())}
                  />
                </th>
                <th className="px-2 py-2">Fila</th>
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Descripción</th>
                {usaObra && <th className="px-2 py-2">Destino</th>}
                <th className="px-2 py-2">Categoría</th>
                <th className="px-2 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => {
                const dup = verificacion?.get(r.n)?.duplicado;
                return (
                  <tr key={r.n} className={clsx('border-t border-slate-100', r.estado === 'error' && 'bg-red-50/50', r.estado === 'ignorada' && 'text-slate-400', dup && 'bg-amber-50/50')}>
                    <td className="px-2 py-1.5">
                      {r.estado === 'ok' ? (
                        <input
                          type="checkbox"
                          aria-label={`Importar fila ${r.n}`}
                          checked={seleccion.has(r.n)}
                          onChange={(e) =>
                            setSeleccion((s) => {
                              const nuevo = new Set(s);
                              if (e.target.checked) nuevo.add(r.n);
                              else nuevo.delete(r.n);
                              return nuevo;
                            })
                          }
                        />
                      ) : r.estado === 'error' ? (
                        <XCircle className="size-4 text-red-500" aria-label="Con error" />
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 text-xs tabular-nums text-slate-500">{r.n}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{r.datos ? formatFecha(r.datos.fecha) : r.vista.fecha || '—'}</td>
                    <td className="px-2 py-1.5">
                      <p className="max-w-64 truncate">{r.vista.descripcion || '—'}</p>
                      {r.motivo && <p className={clsx('text-xs', r.estado === 'error' ? 'text-red-600' : 'text-slate-400')}>{r.motivo}</p>}
                      {dup && (
                        <p className="flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="size-3" />
                          {dup === 'EXISTE' ? 'Ya existe un gasto igual en el sistema' : 'Repetido en este archivo'}
                        </p>
                      )}
                    </td>
                    {usaObra && <td className="max-w-40 truncate px-2 py-1.5 text-xs">{nombreDestino(r.destino)}</td>}
                    <td className="px-2 py-1.5 text-xs">
                      {r.datos && (
                        <Select
                          aria-label={`Categoría de la fila ${r.n}`}
                          className="h-8 text-xs"
                          value={r.datos.categoria}
                          onChange={(e) => setCatFila((m) => ({ ...m, [r.n]: e.target.value as CategoriaGasto }))}
                        >
                          {categoriasDe(tipoDe(r.destino!)).map((c) => (
                            <option key={c} value={c}>
                              {etiquetasCategoria(tipoDe(r.destino!) === 'empresa')[c]}
                            </option>
                          ))}
                        </Select>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{r.datos ? formatSoles(r.datos.monto) : r.vista.monto || '—'}</td>
                  </tr>
                );
              })}
              {!visibles.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No hay filas en este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="flex items-start gap-1.5 text-sm text-slate-700">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <span>
          Se importarán <strong>{elegidas.length}</strong> {elegidas.length === 1 ? 'gasto' : 'gastos'} por <strong>{formatSoles(totalElegido)}</strong>.
          {duplicadas.length > 0 && <span className="text-slate-500"> Los posibles duplicados vienen desmarcados.</span>}
        </span>
      </p>
    </div>
  );

  // ---------- Navegación ----------

  const hayPasoCategorias = valoresCategoria.length > 0 || valoresObra.length > 0;
  const puedeSeguir = paso === 0 ? !!hoja && !leyendo : paso === 1 ? !faltan.length && !repetidas : true;

  function siguiente() {
    if (paso === 0) setPaso(1);
    else if (paso === 1) {
      setPaso(2); // calcula las filas; si no hay nada que emparejar se pasa directo a revisar
    } else if (paso === 2) irARevisar();
  }
  useEffect(() => {
    if (paso === 2 && !hayPasoCategorias) irARevisar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, hayPasoCategorias]);

  const atras = () => setPaso((p) => (p === 3 && !hayPasoCategorias ? 1 : p - 1));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Importar gastos desde Excel"
      description={desdeEmpresa ? 'Gastos de la empresa y, si tu archivo tiene una columna Obra, también de los proyectos.' : 'Todos los gastos del archivo se registrarán en este proyecto.'}
      footer={
        <>
          {paso > 0 && (
            <Button variant="secondary" onClick={atras} disabled={importar.isPending} className="mr-auto">
              Atrás
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={importar.isPending}>
            Cancelar
          </Button>
          {paso < 3 ? (
            <Button onClick={siguiente} disabled={!puedeSeguir}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={confirmarImportacion} loading={importar.isPending} disabled={!elegidas.length || elegidas.length > MAX_FILAS || verificando}>
              Importar {elegidas.length} {elegidas.length === 1 ? 'gasto' : 'gastos'}
            </Button>
          )}
        </>
      }
    >
      <ol className="mb-5 flex flex-wrap items-center gap-2 text-xs" aria-label="Pasos">
        {PASOS.map((nombre, i) => (
          <li key={nombre} className="flex items-center gap-2">
            <span
              aria-current={i === paso ? 'step' : undefined}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium',
                i === paso ? 'bg-slate-900 text-white' : i < paso ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                i === 2 && !hayPasoCategorias && paso >= 2 && 'line-through opacity-60',
              )}
            >
              {i + 1}. {nombre}
            </span>
            {i < PASOS.length - 1 && <span className="text-slate-300">›</span>}
          </li>
        ))}
        {archivo && paso > 0 && (
          <li className="ml-auto">
            <Badge color="green">{archivo.name}</Badge>
          </li>
        )}
      </ol>
      {paso === 0 && pasoArchivo}
      {paso === 1 && pasoColumnas}
      {paso === 2 && hayPasoCategorias && pasoCategorias}
      {paso === 3 && pasoRevisar}
    </Modal>
  );
}
