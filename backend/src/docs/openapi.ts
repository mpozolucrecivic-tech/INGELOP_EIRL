import type { Application } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { verifyToken } from '../middlewares/auth';
import { leerMarca, type MarcaDocs } from './marcas';

extendZodWithOpenApi(z);

/**
 * Documentación OpenAPI generada a partir de las RUTAS REALES de Express y de los MISMOS esquemas Zod
 * que validan cada petición: si se agrega o cambia un endpoint, la documentación cambia sola.
 */

const BASE = '/api/v1';

// Nombre de cada grupo en Swagger (el primer recurso de la ruta)
const GRUPOS: Record<string, string> = {
  auth: 'Autenticación',
  usuarios: 'Usuarios (accesos)',
  clientes: 'Clientes',
  proyectos: 'Proyectos',
  etapas: 'Etapas',
  documentos: 'Documentos',
  planos: 'Planos',
  presupuestos: 'Presupuestos',
  entregables: 'Entregables',
  sprints: 'Tareas (periodos)',
  actividades: 'Tareas (periodos)',
  evidencias: 'Fotos y observaciones',
  gastos: 'Gastos',
  trabajadores: 'Personal y horas',
  asignaciones: 'Personal y horas',
  horas: 'Personal y horas',
  'registros-horas': 'Personal y horas',
  materiales: 'Materiales (oculto)',
  dashboard: 'Resumen',
  auditoria: 'Auditoría',
  servicios: 'Web: servicios',
  contacto: 'Web: contacto',
  web: 'Web: contenido público',
  sitio: 'Web: datos de la empresa',
  portafolio: 'Web: proyectos realizados',
  cms: 'Web: editor de páginas (CMS)',
};

const ACCIONES: Record<string, string> = {
  publicar: 'Publicar',
  retirar: 'Retirar publicación',
  restaurar: 'Restaurar versión',
  'vista-previa': 'Vista previa',
  enviar: 'Enviar a revisión',
  aprobar: 'Aprobar',
  observar: 'Observar con comentario',
  duplicar: 'Duplicar',
  archivo: 'Descargar archivo',
  foto: 'Foto',
  login: 'Iniciar sesión',
  me: 'Usuario de la sesión',
};

/** Quita .refine/.transform/.preprocess para llegar al objeto (OpenAPI necesita la forma) */
function aObjeto(schema?: ZodTypeAny): z.AnyZodObject | undefined {
  let s: ZodTypeAny | undefined = schema;
  for (let i = 0; i < 5 && s; i++) {
    if (s instanceof z.ZodObject) return s;
    const def = (s as { _def?: { schema?: ZodTypeAny; innerType?: ZodTypeAny } })._def;
    s = def?.schema ?? def?.innerType;
  }
  return undefined;
}

function grupoDe(ruta: string) {
  const literales = ruta.split('/').filter((x) => x && !x.startsWith(':') && !(x in ACCIONES));
  // Dentro de un proyecto manda el recurso conocido más específico (/proyectos/:id/etapas/:id/documentos -> Documentos)
  const recurso = literales[0] === 'proyectos' ? ([...literales].reverse().find((x) => GRUPOS[x]) ?? 'proyectos') : (literales[0] ?? 'otros');
  return GRUPOS[recurso] ?? recurso;
}

function resumenDe(metodo: string, ruta: string) {
  const segmentos = ruta.split('/').filter(Boolean);
  const ultimo = segmentos[segmentos.length - 1] ?? '';
  if (ACCIONES[ultimo]) return metodo === 'delete' ? `Quitar ${ACCIONES[ultimo].toLowerCase()}` : ACCIONES[ultimo];
  const conId = ultimo.startsWith(':');
  return { get: conId ? 'Obtener' : 'Listar', post: 'Crear', put: 'Actualizar', patch: 'Actualizar', delete: 'Eliminar' }[metodo] ?? metodo;
}

interface RutaEncontrada {
  metodo: string;
  ruta: string;
  publica: boolean;
  marcas: MarcaDocs[];
}

type Capa = { route?: { path: string; methods: Record<string, boolean>; stack: Capa[] }; handle: unknown; match?: (p: string) => boolean };

/** Recorre el router de Express: las rutas montadas antes de verifyToken son públicas */
function recolectarRutas(app: Application): RutaEncontrada[] {
  const raiz = (app as unknown as { router: { stack: Capa[] } }).router.stack;
  const api = raiz.find((c) => (c.handle as { stack?: Capa[] })?.stack)?.handle as { stack: Capa[] } | undefined;
  if (!api) return [];
  const rutas: RutaEncontrada[] = [];
  let publica = true;
  for (const capa of api.stack) {
    if (capa.handle === verifyToken) {
      publica = false;
      continue;
    }
    const sub = (capa.handle as { stack?: Capa[] })?.stack;
    if (!sub) continue;
    const guardias: Capa[] = [];
    for (const c of sub) {
      if (!c.route) {
        if (leerMarca(c.handle)) guardias.push(c);
        continue;
      }
      const ruta = c.route.path;
      const marcas = [
        ...guardias.filter((g) => g.match?.(ruta)).map((g) => leerMarca(g.handle)!),
        ...c.route.stack.map((l) => leerMarca(l.handle)).filter((m): m is MarcaDocs => !!m),
      ];
      // Algunas rutas públicas por montaje aplican verifyToken en la propia ruta (p. ej. GET /auth/me)
      const protegidaEnRuta = c.route.stack.some((l) => l.handle === verifyToken);
      for (const metodo of Object.keys(c.route.methods)) rutas.push({ metodo, ruta, publica: publica && !protegidaEnRuta, marcas });
    }
  }
  return rutas;
}

let cache: object | null = null;

export function generarOpenApi(app: Application) {
  if (cache) return cache;
  const registro = new OpenAPIRegistry();
  const bearer = registro.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Inicia sesión con POST /auth/login y pega aquí el "token" de la respuesta.',
  });
  const ErrorApi = registro.register(
    'Error',
    z.object({
      message: z.string().openapi({ example: 'Error de validación' }),
      errors: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
    }),
  );
  const respuestaError = (descripcion: string) => ({ description: descripcion, content: { 'application/json': { schema: ErrorApi } } });

  for (const r of recolectarRutas(app)) {
    const esquemas = Object.assign({}, ...r.marcas.map((m) => m.esquemas ?? {})) as NonNullable<MarcaDocs['esquemas']>;
    const roles = r.marcas.flatMap((m) => m.roles ?? []);
    const editorWeb = r.marcas.some((m) => m.editorWeb);
    const accesoProyecto = r.marcas.some((m) => m.accesoProyecto);
    const subida = r.marcas.find((m) => m.subida)?.subida;
    const limite = r.marcas.find((m) => m.limite)?.limite;

    const claves = [...r.ruta.matchAll(/:(\w+)/g)].map((m) => m[1]);
    const params = aObjeto(esquemas.params) ?? (claves.length ? z.object(Object.fromEntries(claves.map((k) => [k, z.string()]))) : undefined);
    const query = aObjeto(esquemas.query);
    const cuerpo = aObjeto(esquemas.body);

    let body: Record<string, unknown> | undefined;
    if (subida) {
      const archivo = z.string().openapi({ type: 'string', format: 'binary', description: `Archivo (máx. ${subida.maxMB} MB)` });
      body = { content: { 'multipart/form-data': { schema: (cuerpo ?? z.object({})).extend({ archivo }) } } };
    } else if (cuerpo) {
      body = { content: { 'application/json': { schema: cuerpo } } };
    }

    const quien = r.publica
      ? 'Pública (sin token).'
      : roles.length
        ? `Requiere rol: ${roles.map((x) => (x === 'ADMIN' ? 'jefatura (ADMIN)' : 'arquitecto o ingeniero (USUARIO)')).join(' o ')}.`
        : editorWeb
          ? 'Jefatura o usuario con permiso de editor web.'
          : 'Cualquier usuario con sesión.';
    const descripcion = [quien, accesoProyecto && 'Además, el usuario debe tener acceso al proyecto.', limite && `Límite: ${limite}.`]
      .filter(Boolean)
      .join(' ');

    registro.registerPath({
      method: r.metodo as 'get',
      path: BASE + r.ruta.replace(/:(\w+)/g, '{$1}'),
      tags: [grupoDe(r.ruta)],
      summary: resumenDe(r.metodo, r.ruta),
      description: descripcion,
      ...(!r.publica && { security: [{ [bearer.name]: [] }] }),
      request: { ...(params && { params }), ...(query && { query }), ...(body && { body: body as never }) },
      responses: {
        [r.metodo === 'post' ? 201 : 200]: { description: 'Correcto (algunas eliminaciones responden 204 sin contenido)' },
        ...((esquemas.body || esquemas.query || esquemas.params) && { 422: respuestaError('Datos no válidos: detalle por campo') }),
        ...(!r.publica && { 401: respuestaError('Sin sesión, sesión vencida o alterada') }),
        ...((roles.length || editorWeb || accesoProyecto) && { 403: respuestaError('Sin permiso') }),
        ...(subida && { 413: respuestaError('Archivo demasiado grande') }),
        ...(limite && { 429: respuestaError('Demasiados intentos') }),
      },
    });
  }

  registro.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Estado'],
    summary: 'La API está en funcionamiento',
    responses: { 200: { description: 'Correcto' } },
  });

  cache = new OpenApiGeneratorV3(registro.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'API INGELOP',
      version: '1.0.0',
      description:
        'API de la intranet y de la web de INGELOP Consultores y Ejecutores E.I.R.L. Errores en español con `{ message, errors? }`. ' +
        'Para probar las rutas protegidas: ejecuta **POST /api/v1/auth/login**, copia el `token` y pulsa **Authorize**.',
    },
    servers: [{ url: '/' }],
  });
  return cache;
}
