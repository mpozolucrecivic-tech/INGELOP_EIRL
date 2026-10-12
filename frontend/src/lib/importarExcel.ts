/**
 * Lectura de Excel/CSV de gastos en el navegador (el archivo no se sube al servidor):
 * hojas y celdas, fila de encabezados, emparejamiento de columnas y conversión de fechas y montos.
 * Sin dependencias de la interfaz para poder probarlo aparte.
 */
import type { CategoriaGasto } from '@/types/api';

export type Celda = string | number | Date | null;
export interface Hoja {
  nombre: string;
  filas: Celda[][];
}

export const MAX_MB_ARCHIVO = 5;
export const MAX_FILAS_LEIDAS = 5000;

// ---------- Lectura del archivo ----------

export async function leerArchivo(archivo: File): Promise<Hoja[]> {
  const ext = archivo.name.toLowerCase().split('.').pop();
  if (archivo.size > MAX_MB_ARCHIVO * 1024 * 1024) throw new Error(`El archivo supera ${MAX_MB_ARCHIVO} MB`);
  if (ext === 'xls') throw new Error('El formato .xls (Excel 97-2003) no se puede leer. Ábrelo en Excel y guárdalo como .xlsx («Guardar como» → Libro de Excel).');
  if (ext === 'csv' || ext === 'txt') return [{ nombre: archivo.name, filas: leerCsv(decodificar(await archivo.arrayBuffer())) }];
  if (ext !== 'xlsx') throw new Error('Sube un archivo .xlsx o .csv');

  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new Error('No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx) y que no tenga contraseña.');
  }
  const hojas: Hoja[] = [];
  libro.eachSheet((hoja) => {
    if (hoja.state !== 'visible') return;
    const filas: Celda[][] = [];
    const total = Math.min(hoja.rowCount, MAX_FILAS_LEIDAS);
    for (let r = 1; r <= total; r++) {
      const fila = hoja.getRow(r);
      const celdas: Celda[] = [];
      for (let c = 1; c <= hoja.columnCount; c++) {
        const cell = fila.getCell(c);
        // En celdas combinadas solo la principal lleva el valor (si no, un título se repetiría en cada columna)
        celdas.push(cell.isMerged && cell.master.address !== cell.address ? null : valorCelda(cell.value));
      }
      filas.push(recortar(celdas));
    }
    hojas.push({ nombre: hoja.name, filas });
  });
  if (!hojas.length) throw new Error('El archivo no tiene hojas visibles');
  return hojas;
}

/** Valor de una celda de exceljs: texto con formato, fórmulas (su resultado), enlaces, errores */
function valorCelda(v: unknown): Celda {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; error?: unknown };
    if (o.richText) return o.richText.map((t) => t.text).join('').trim() || null;
    if ('result' in o) return valorCelda(o.result);
    if ('text' in o) return valorCelda(o.text);
  }
  return null;
}

const vacia = (c: Celda) => c === null || c === '';
const recortar = (celdas: Celda[]) => {
  let fin = celdas.length;
  while (fin > 0 && vacia(celdas[fin - 1])) fin--;
  return celdas.slice(0, fin);
};

/** CSV de Excel en español suele venir en Windows-1252 y separado por «;» */
function decodificar(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

export function leerCsv(texto: string): Celda[][] {
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', ',', '\t'].map((s) => ({ s, n: primera.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const filas: Celda[][] = [];
  let fila: Celda[] = [];
  let campo = '';
  let comillas = false;
  const cerrarCampo = () => {
    fila.push(campo.trim() || null);
    campo = '';
  };
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) cerrarCampo();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      cerrarCampo();
      filas.push(recortar(fila));
      fila = [];
      if (filas.length >= MAX_FILAS_LEIDAS) return filas;
    } else campo += ch;
  }
  if (campo || fila.length) {
    cerrarCampo();
    filas.push(recortar(fila));
  }
  return filas;
}

// ---------- Encabezados y columnas ----------

export type Campo = 'fecha' | 'descripcion' | 'monto' | 'categoria' | 'proyecto';
export type Mapeo = Record<Campo, number | null>; // índice de columna o null

export const normalizar = (t: unknown) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/%]+/g, ' ')
    .trim();

const SINONIMOS: Record<Campo, string[]> = {
  fecha: ['fecha', 'f emision', 'fecha de emision', 'fecha emision', 'f pago', 'fecha de pago', 'fecha pago', 'fec', 'dia', 'fecha doc', 'fecha del gasto'],
  monto: ['monto', 'importe', 'total', 's/', 'soles', 'monto s/', 'importe s/', 'total s/', 'precio', 'valor', 'costo', 'pago', 'monto total', 'importe total'],
  descripcion: ['descripcion', 'concepto', 'detalle', 'glosa', 'item', 'producto', 'servicio', 'motivo', 'observacion', 'descripcion del gasto'],
  categoria: ['categoria', 'tipo', 'rubro', 'partida', 'clasificacion', 'tipo de gasto', 'cuenta', 'categoria del gasto'],
  proyecto: ['obra', 'proyecto', 'centro de costo', 'centro de costos', 'cc', 'proyecto/obra', 'obra/proyecto', 'proyecto obra'],
};

function puntaje(encabezado: string, campo: Campo) {
  const e = normalizar(encabezado);
  if (!e) return 0;
  let mejor = 0;
  for (const s of SINONIMOS[campo]) {
    if (e === s) return 3;
    if (s.length > 2 && new RegExp(`(^| )${s.replace(/[/]/g, '\\/')}( |$)`).test(e)) mejor = Math.max(mejor, 1);
  }
  // "Subtotal" o "IGV" no son el monto final
  if (campo === 'monto' && /subtotal|igv|base imponible|valor venta/.test(e)) return 0;
  return mejor;
}

/** La fila de encabezados: entre las primeras 20, la que más parece títulos de columna */
export function detectarEncabezado(filas: Celda[][]): number {
  let mejor = 0;
  let mejorPuntaje = -1;
  filas.slice(0, 20).forEach((fila, i) => {
    const textos = fila.filter((c) => typeof c === 'string' && !esNumeroTexto(c));
    if (textos.length < 2) return;
    const conocidos = textos.filter((t) => (Object.keys(SINONIMOS) as Campo[]).some((campo) => puntaje(String(t), campo) > 0)).length;
    const p = textos.length + conocidos * 3;
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejor = i;
    }
  });
  return mejor;
}

const esNumeroTexto = (t: string) => /^[\s\d.,/-]+$/.test(t);

export const letraColumna = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

export function nombresColumnas(filas: Celda[][], filaEncabezado: number): string[] {
  const enc = filas[filaEncabezado] ?? [];
  const ancho = Math.max(enc.length, ...filas.slice(filaEncabezado + 1, filaEncabezado + 50).map((f) => f.length), 0);
  return Array.from({ length: ancho }, (_, i) => {
    const t = enc[i];
    return t === null || t === undefined || t === '' ? `Columna ${letraColumna(i)}` : t instanceof Date ? fechaIso(t) : String(t);
  });
}

/** Emparejamiento propuesto por el nombre de las columnas (cada columna se usa una sola vez) */
export function sugerirMapeo(columnas: string[], campos: Campo[]): Mapeo {
  const mapeo: Mapeo = { fecha: null, descripcion: null, monto: null, categoria: null, proyecto: null };
  const candidatos = campos
    .flatMap((campo) => columnas.map((col, i) => ({ campo, i, p: puntaje(col, campo) })))
    .filter((c) => c.p > 0)
    .sort((a, b) => b.p - a.p);
  const usadas = new Set<number>();
  for (const c of candidatos) {
    if (mapeo[c.campo] !== null || usadas.has(c.i)) continue;
    mapeo[c.campo] = c.i;
    usadas.add(c.i);
  }
  return mapeo;
}

// ---------- Fechas y montos ----------

const MESES: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, apr: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, aug: 8, set: 9, sep: 9, sept: 9, setiembre: 9, septiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12, dec: 12,
};

const fechaIso = (d: Date) => d.toISOString().slice(0, 10);

function armarFecha(a: number, m: number, d: number): string | null {
  if (a < 100) a += 2000;
  const f = new Date(Date.UTC(a, m - 1, d));
  // Descarta fechas imposibles (31/02) y fuera de rango
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d || a < 1990 || a > 2100) return null;
  return fechaIso(f);
}

/** Devuelve YYYY-MM-DD o null. Día antes que mes (formato peruano). */
export function convertirFecha(c: Celda): string | null {
  if (c === null) return null;
  if (c instanceof Date) return armarFecha(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
  if (typeof c === 'number') {
    // Número de serie de Excel (días desde 1899-12-30): 1990 ≈ 32874, 2100 ≈ 73051
    if (c < 32874 || c > 73051) return null;
    const f = new Date(Date.UTC(1899, 11, 30) + Math.floor(c) * 86400000);
    return fechaIso(f);
  }
  const t = normalizar(c).replace(/ de(l)? /g, ' ');
  let m = String(c).trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return armarFecha(+m[1], +m[2], +m[3]);
  m = String(c).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(\s|$)/);
  if (m) return armarFecha(+m[3], +m[2], +m[1]);
  m = t.match(/^(\d{1,2})[ /-]*([a-z]+)[ /-]*(\d{2}|\d{4})$/);
  if (m && MESES[m[2]]) return armarFecha(+m[3], MESES[m[2]], +m[1]);
  return null;
}

export type ResultadoMonto = { valor: number } | { error: string };

/** Acepta 1250.5, «S/ 1,250.50», «1.250,50», «(80.00)»; rechaza dólares y negativos */
export function convertirMonto(c: Celda): ResultadoMonto {
  if (c === null) return { error: 'Monto vacío' };
  if (c instanceof Date) return { error: 'El monto parece una fecha' };
  let n: number;
  if (typeof c === 'number') n = c;
  else {
    const crudo = c.trim();
    if (/\$|us\s*d|usd|dolar|dólar/i.test(crudo)) return { error: 'El monto parece estar en dólares' };
    let t = crudo.replace(/s\/\.?|pen|soles|\s/gi, '');
    const negativo = /^\(.*\)$/.test(t) || t.startsWith('-');
    t = t.replace(/[()+-]/g, '');
    if (!/^[\d.,]+$/.test(t)) return { error: `«${crudo}» no es un monto` };
    const coma = t.lastIndexOf(',');
    const punto = t.lastIndexOf('.');
    if (coma >= 0 && punto >= 0) {
      // El último separador es el decimal
      t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    } else if (coma >= 0) {
      t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3}){2,}$/.test(t)) {
      t = t.replace(/\./g, ''); // 1.250.000
    }
    n = Number(t);
    if (!Number.isFinite(n)) return { error: `«${crudo}» no es un monto` };
    if (negativo) n = -n;
  }
  if (n < 0) return { error: 'Monto negativo (¿es una devolución?)' };
  if (n === 0) return { error: 'Monto en cero' };
  if (n >= 1e10) return { error: 'Monto demasiado grande' };
  return { valor: Math.round(n * 100) / 100 };
}

export const textoCelda = (c: Celda) => (c === null ? '' : c instanceof Date ? fechaIso(c) : String(c).trim());

/** Filas que no son gastos: vacías, títulos y totales/subtotales */
export function motivoIgnorar(fila: Celda[], mapeo: Mapeo): string | null {
  if (fila.every(vacia)) return 'Fila vacía';
  if (fila.some((c) => typeof c === 'string' && /^(sub ?total|total|totales|suma|importe total|total general)\b/.test(normalizar(c)))) return 'Fila de total';
  const fecha = mapeo.fecha !== null ? fila[mapeo.fecha] ?? null : null;
  const monto = mapeo.monto !== null ? fila[mapeo.monto] ?? null : null;
  if (vacia(fecha) && vacia(monto)) return 'Sin fecha ni monto (título o nota)';
  return null;
}

// ---------- Categorías y obras ----------

type Regla = [RegExp, CategoriaGasto];
// El orden importa: lo más específico primero (p. ej. «impuesto a la renta» antes que «renta»)
const REGLAS_EMPRESA: Regla[] = [
  [/impuesto|sunat|tribut|arbitrio|igv|detraccion|municipal|notari|tramite|licencia de funcionamiento|registros publicos|sunarp/, 'IMPUESTOS'],
  [/alquiler|arriendo|renta/, 'ALQUILER'],
  [/^servicios?( basicos)?$|luz|electric|agua|sedapal|epsel|internet|telefon|celular|movil|claro|movistar|entel|bitel|enosa|ensa|hidrandina/, 'SERVICIOS_BASICOS'],
  [/sueldo|planilla|remuneraci|honorario|rxh|recibo por honorarios|cts|gratificaci|essalud|afp|onp|vacaciones/, 'SUELDOS'],
  [/software|licencia|autocad|revit|s10|office|microsoft|adobe|suscripci|hosting|dominio|google workspace|antivirus/, 'SOFTWARE'],
  [/util|papel|oficina|limpieza|tinta|toner|impresi|escritorio|archivador|cafe/, 'UTILES_OFICINA'],
];
const REGLAS_PROYECTO: Regla[] = [
  [/honorario|planilla|sueldo|mano de obra|personal|rxh|recibo por honorarios|especialista|consultor|jornal/, 'MANO_DE_OBRA'],
  [/transporte|pasaje|movilidad|flete|viatico|combustible|gasolina|petroleo|peaje|hospedaje|hotel|alimentaci|taxi|\bbus\b|traslado/, 'TRANSPORTE'],
  [/equipo|software|licencia|estacion total|gps|dron|laptop|computadora|alquiler de/, 'EQUIPOS'],
  [/impresi|ploteo|plotter|copia|util|papel|tinta|toner|anillado|empaste|material/, 'MATERIALES'],
];

/**
 * Categoría sugerida a partir de un texto (el de la columna «Categoría» o la descripción).
 * Primero busca el nombre exacto de una categoría; si no, palabras clave; si no, Otros.
 */
export function sugerirCategoria(texto: string, tipo: 'proyecto' | 'empresa', etiquetas: Record<CategoriaGasto, string>, validas: CategoriaGasto[]): CategoriaGasto {
  const t = normalizar(texto);
  if (!t) return 'OTROS';
  const exacta = validas.find((c) => normalizar(etiquetas[c]) === t || normalizar(c.replace(/_/g, ' ')) === t);
  if (exacta) return exacta;
  for (const [regla, categoria] of tipo === 'empresa' ? REGLAS_EMPRESA : REGLAS_PROYECTO) if (regla.test(t)) return categoria;
  return 'OTROS';
}

export const EMPRESA = 'EMPRESA' as const;
export const OMITIR = 'OMITIR' as const;
export type DestinoObra = number | typeof EMPRESA | typeof OMITIR;

/** Proyecto sugerido para un valor de la columna «Obra»: vacío/oficina = empresa; si no, el de nombre más parecido */
export function sugerirDestino(valor: string, proyectos: { id: number; nombre: string }[]): DestinoObra {
  const v = normalizar(valor);
  if (!v || /^(oficina|empresa|general|generales|administraci|adm|gastos generales|ingelop)/.test(v)) return EMPRESA;
  const exacto = proyectos.find((p) => normalizar(p.nombre) === v);
  if (exacto) return exacto.id;
  const palabras = v.split(' ').filter((w) => w.length > 2);
  let mejor: { id: number; p: number } | null = null;
  for (const p of proyectos) {
    const n = normalizar(p.nombre);
    const comunes = palabras.filter((w) => n.includes(w)).length;
    const puntaje = n.includes(v) || v.includes(n) ? 100 : palabras.length ? comunes / palabras.length : 0;
    if (puntaje >= 0.6 && (!mejor || puntaje > mejor.p)) mejor = { id: p.id, p: puntaje };
  }
  return mejor?.id ?? OMITIR;
}

// ---------- Plantilla ----------

/** Excel de ejemplo con las columnas que el asistente reconoce solo y la lista de categorías */
export async function descargarPlantilla(categorias: string[], conObra: boolean) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Gastos');
  const columnas = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 44 },
    { header: 'Categoría', key: 'categoria', width: 30 },
    { header: 'Monto (S/)', key: 'monto', width: 14 },
    ...(conObra ? [{ header: 'Obra', key: 'obra', width: 30 }] : []),
  ];
  hoja.columns = columnas;
  hoja.getRow(1).font = { bold: true };
  hoja.addRow({ fecha: new Date(Date.UTC(new Date().getFullYear(), 0, 15)), descripcion: 'Ejemplo: borra esta fila', categoria: categorias.at(-1), monto: 150.5, obra: conObra ? 'Oficina' : undefined });
  hoja.getColumn('fecha').numFmt = 'dd/mm/yyyy';
  hoja.getColumn('monto').numFmt = '#,##0.00';
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  const lista = libro.addWorksheet('Categorías');
  lista.columns = [{ header: 'Categorías válidas', key: 'c', width: 36 }];
  lista.getRow(1).font = { bold: true };
  categorias.forEach((c) => lista.addRow({ c }));
  for (let r = 2; r <= 1001; r++) {
    hoja.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'Categorías'!$A$2:$A$${categorias.length + 1}`],
    };
  }

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = conObra ? 'plantilla-gastos-empresa.xlsx' : 'plantilla-gastos-proyecto.xlsx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
