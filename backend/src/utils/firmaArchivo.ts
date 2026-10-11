/**
 * Comprueba que el contenido real del archivo corresponde a su extensión (los "números mágicos"
 * de cada formato). Evita, por ejemplo, un ejecutable renombrado como .pdf.
 */
const empiezaCon = (b: Buffer, firma: number[]) => b.length >= firma.length && firma.every((v, i) => b[i] === v);
const textoAl = (b: Buffer, desde: number, texto: string) => b.toString('latin1', desde, desde + texto.length) === texto;

const ZIP = [0x50, 0x4b, 0x03, 0x04]; // .docx, .xlsx y .zip son archivos ZIP
const ZIP_VACIO = [0x50, 0x4b, 0x05, 0x06];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // .doc y .xls (Office 97-2003)

const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  '.pdf': (b) => textoAl(b, 0, '%PDF-'),
  '.docx': (b) => empiezaCon(b, ZIP),
  '.xlsx': (b) => empiezaCon(b, ZIP),
  '.zip': (b) => empiezaCon(b, ZIP) || empiezaCon(b, ZIP_VACIO),
  '.doc': (b) => empiezaCon(b, OLE),
  '.xls': (b) => empiezaCon(b, OLE),
  '.jpg': (b) => empiezaCon(b, [0xff, 0xd8, 0xff]),
  '.jpeg': (b) => empiezaCon(b, [0xff, 0xd8, 0xff]),
  '.png': (b) => empiezaCon(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.webp': (b) => textoAl(b, 0, 'RIFF') && textoAl(b, 8, 'WEBP'),
  '.dwg': (b) => textoAl(b, 0, 'AC10'), // AutoCAD: AC1015, AC1018, AC1024, AC1027, AC1032…
  // DXF en texto: empieza con el código de grupo 0 (con o sin espacios) seguido de SECTION
  '.dxf': (b) => /^\s*0\s*\r?\n\s*SECTION/.test(b.toString('latin1', 0, 64)) || textoAl(b, 0, 'AutoCAD Binary DXF'),
};

export const EXTENSIONES_DOCUMENTO = Object.keys(FIRMAS);

/** Se necesitan como mucho los primeros 64 bytes */
export const BYTES_FIRMA = 64;

export function firmaValida(extension: string, inicio: Buffer): boolean {
  const verificar = FIRMAS[extension.toLowerCase()];
  return verificar ? verificar(inicio) : false;
}
