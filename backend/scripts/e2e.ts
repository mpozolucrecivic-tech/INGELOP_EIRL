/**
 * Prueba end-to-end de TODOS los endpoints de la API contra un servidor en ejecución.
 * Crea sus propios datos (proyecto, usuario, trabajador...) y los elimina/desactiva al final.
 *
 * Uso:  npm run dev   (en otra terminal)   y luego   npm run test:e2e
 * Variables opcionales: API_URL (default http://localhost:4000/api/v1), SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 * Ojo: POST /contacto tiene límite anti-spam (RATE_LIMIT_CONTACTO por IP cada RATE_LIMIT_VENTANA_MIN minutos).
 * Si se ejecuta varias veces seguidas, reinicia la API (el contador está en memoria) o sube ese límite en .env.
 */
import 'dotenv/config';

const API = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api/v1`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@ingelop.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '';

let pasadas = 0;
const fallos: string[] = [];

type Resp = { status: number; body: any; headers: Headers };

async function call(method: string, path: string, opts: { token?: string; json?: unknown; form?: FormData } = {}): Promise<Resp> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }
  const res = await fetch(`${API}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta no JSON (archivos) */
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

function check(nombre: string, cond: boolean, detalle?: unknown) {
  if (cond) {
    pasadas++;
    console.log(`  ✔ ${nombre}`);
  } else {
    fallos.push(nombre);
    console.log(`  ✘ ${nombre}`, detalle !== undefined ? JSON.stringify(detalle).slice(0, 400) : '');
  }
}

const expectStatus = (nombre: string, r: Resp, status: number) => check(`${nombre} -> ${status}`, r.status === status, { status: r.status, body: r.body });

function seccion(titulo: string) {
  console.log(`\n■ ${titulo}`);
}

async function main() {
  const sufijo = Date.now();

  seccion('Auth');
  expectStatus('GET /proyectos sin token', await call('GET', '/proyectos'), 401);
  expectStatus('GET /proyectos con token basura', await call('GET', '/proyectos', { token: 'abc.def.ghi' }), 401);
  expectStatus('POST /auth/login password incorrecto', await call('POST', '/auth/login', { json: { email: ADMIN_EMAIL, password: 'mala' } }), 401);
  expectStatus('POST /auth/login email inexistente', await call('POST', '/auth/login', { json: { email: 'no@existe.com', password: 'x' } }), 401);
  expectStatus('POST /auth/login body inválido', await call('POST', '/auth/login', { json: { email: 'no-es-email' } }), 422);
  const loginAdmin = await call('POST', '/auth/login', { json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expectStatus('POST /auth/login admin', loginAdmin, 200);
  check('login devuelve token y usuario sin hash', !!loginAdmin.body?.token && loginAdmin.body.usuario?.rol === 'ADMIN' && !('passwordHash' in loginAdmin.body.usuario));
  const A = loginAdmin.body.token as string;
  const payload = JSON.parse(Buffer.from(A.split('.')[1], 'base64url').toString());
  check('payload JWT solo contiene id, rol, iat, exp', Object.keys(payload).sort().join() === 'exp,iat,id,rol', payload);
  const me = await call('GET', '/auth/me', { token: A });
  expectStatus('GET /auth/me', me, 200);
  check('/auth/me sin passwordHash', me.body && !('passwordHash' in me.body));

  seccion('Usuarios (ADMIN)');
  const emailU = `e2e.${sufijo}@ingelop.com`;
  const nuevoU = await call('POST', '/usuarios', { token: A, json: { nombre: 'Usuario E2E', email: emailU, password: 'Clave12345' } });
  expectStatus('POST /usuarios', nuevoU, 201);
  const usuarioId = nuevoU.body.id as number;
  check('usuario creado con rol USUARIO por defecto y sin hash', nuevoU.body.rol === 'USUARIO' && !('passwordHash' in nuevoU.body));
  expectStatus('POST /usuarios email duplicado', await call('POST', '/usuarios', { token: A, json: { nombre: 'Otro', email: emailU, password: 'Clave12345' } }), 409);
  expectStatus('POST /usuarios password corto', await call('POST', '/usuarios', { token: A, json: { nombre: 'Otro', email: `x${sufijo}@a.com`, password: '123' } }), 422);
  const listaU = await call('GET', '/usuarios', { token: A });
  expectStatus('GET /usuarios', listaU, 200);
  check('lista de usuarios sin passwordHash', Array.isArray(listaU.body) && listaU.body.every((u: any) => !('passwordHash' in u)));
  expectStatus('PUT /usuarios/:id', await call('PUT', `/usuarios/${usuarioId}`, { token: A, json: { nombre: 'Usuario E2E Editado' } }), 200);
  expectStatus('PUT /usuarios/:id inexistente', await call('PUT', '/usuarios/999999', { token: A, json: { nombre: 'Nadie' } }), 404);
  expectStatus('DELETE /usuarios/:id a sí mismo', await call('DELETE', `/usuarios/${me.body.id}`, { token: A }), 409);

  const loginU = await call('POST', '/auth/login', { json: { email: emailU, password: 'Clave12345' } });
  expectStatus('login USUARIO', loginU, 200);
  const U = loginU.body.token as string;
  expectStatus('USUARIO GET /usuarios', await call('GET', '/usuarios', { token: U }), 403);
  expectStatus('USUARIO POST /usuarios', await call('POST', '/usuarios', { token: U, json: {} }), 403);

  seccion('Clientes (ADMIN)');
  const ruc = `20${String(sufijo).slice(-9)}`;
  const cli = await call('POST', '/clientes', { token: A, json: { tipo: 'EMPRESA_PRIVADA', nombre: `Cliente E2E ${sufijo}`, documento: ruc, email: 'contacto@e2e.pe' } });
  expectStatus('POST /clientes', cli, 201);
  const C = cli.body.id as number;
  expectStatus('POST /clientes RUC duplicado', await call('POST', '/clientes', { token: A, json: { tipo: 'EMPRESA_PRIVADA', nombre: 'Otro', documento: ruc } }), 409);
  expectStatus('POST /clientes documento inválido', await call('POST', '/clientes', { token: A, json: { tipo: 'PERSONA', nombre: 'Otro', documento: '123' } }), 422);
  expectStatus('GET /clientes', await call('GET', `/clientes?q=${sufijo}`, { token: A }), 200);
  expectStatus('PUT /clientes/:id', await call('PUT', `/clientes/${C}`, { token: A, json: { contacto: 'Gerencia' } }), 200);
  expectStatus('USUARIO GET /clientes', await call('GET', '/clientes', { token: U }), 403);

  seccion('Proyectos');
  const proyectoBody = {
    nombre: `Proyecto E2E ${sufijo}`,
    clienteId: C,
    tipoServicio: 'EXPEDIENTE_TECNICO',
    rubro: 'SANEAMIENTO',
    ubicacion: 'Chiclayo',
    fechaInicio: '2026-09-01',
    fechaFin: '2027-02-28',
    montoContrato: 100000,
    responsableId: me.body.id,
  };
  expectStatus('POST /proyectos fechas incoherentes', await call('POST', '/proyectos', { token: A, json: { ...proyectoBody, fechaFin: '2026-01-01' } }), 422);
  expectStatus('USUARIO POST /proyectos', await call('POST', '/proyectos', { token: U, json: proyectoBody }), 403);
  const proy = await call('POST', '/proyectos', { token: A, json: proyectoBody });
  expectStatus('POST /proyectos', proy, 201);
  const P = proy.body.id as number;
  check('montoContrato serializado como number e incluye cliente', proy.body.montoContrato === 100000 && proy.body.cliente?.id === C && proy.body.rubro === 'SANEAMIENTO', proy.body);
  expectStatus('DELETE /clientes/:id con proyectos', await call('DELETE', `/clientes/${C}`, { token: A }), 409);
  expectStatus('GET /proyectos (admin)', await call('GET', '/proyectos', { token: A }), 200);
  const porRubro = await call('GET', '/proyectos?rubro=SANEAMIENTO', { token: A });
  check('GET /proyectos?rubro filtra por rubro OSCE', porRubro.status === 200 && porRubro.body.every((p: any) => p.rubro === 'SANEAMIENTO') && porRubro.body.some((p: any) => p.id === P), porRubro.body?.length);
  expectStatus('POST /proyectos rubro inválido', await call('POST', '/proyectos', { token: A, json: { ...proyectoBody, rubro: 'MINERIA' } }), 422);
  expectStatus('GET /proyectos/:id', await call('GET', `/proyectos/${P}`, { token: A }), 200);
  expectStatus('GET /proyectos/:id inexistente', await call('GET', '/proyectos/999999', { token: A }), 404);
  expectStatus('GET /proyectos/abc (id inválido)', await call('GET', '/proyectos/abc', { token: A }), 422);
  expectStatus('PUT /proyectos/:id', await call('PUT', `/proyectos/${P}`, { token: A, json: { estado: 'EN_EJECUCION' } }), 200);
  expectStatus('USUARIO PUT /proyectos/:id', await call('PUT', `/proyectos/${P}`, { token: U, json: { estado: 'FINALIZADA' } }), 403);

  // USUARIO aún no asignado
  const listaAntes = await call('GET', '/proyectos', { token: U });
  check('USUARIO no asignado no ve el proyecto en la lista', listaAntes.status === 200 && !listaAntes.body.some((p: any) => p.id === P));
  expectStatus('USUARIO GET /proyectos/:id no asignado', await call('GET', `/proyectos/${P}`, { token: U }), 403);

  expectStatus('POST /proyectos/:id/usuarios', await call('POST', `/proyectos/${P}/usuarios`, { token: A, json: { usuarioId } }), 201);
  expectStatus('POST /proyectos/:id/usuarios duplicado', await call('POST', `/proyectos/${P}/usuarios`, { token: A, json: { usuarioId } }), 409);
  expectStatus('GET /proyectos/:id/usuarios', await call('GET', `/proyectos/${P}/usuarios`, { token: A }), 200);
  const listaDespues = await call('GET', '/proyectos', { token: U });
  check('USUARIO asignado ve el proyecto', listaDespues.body.some((p: any) => p.id === P));
  expectStatus('USUARIO GET /proyectos/:id asignado', await call('GET', `/proyectos/${P}`, { token: U }), 200);

  seccion('Sprints y actividades (Scrum)');
  const sprint = await call('POST', `/proyectos/${P}/sprints`, { token: A, json: { fechaInicio: '2026-09-01', fechaFin: '2026-09-30', objetivo: 'Obras preliminares' } });
  expectStatus('POST /proyectos/:id/sprints', sprint, 201);
  check('sprint numerado automáticamente (1)', sprint.body.numero === 1);
  const S = sprint.body.id as number;
  expectStatus('POST sprint número duplicado', await call('POST', `/proyectos/${P}/sprints`, { token: A, json: { numero: 1, fechaInicio: '2026-10-01', fechaFin: '2026-10-30', objetivo: 'Duplicado' } }), 409);
  expectStatus('USUARIO POST sprint', await call('POST', `/proyectos/${P}/sprints`, { token: U, json: {} }), 403);
  const sprints = await call('GET', `/proyectos/${P}/sprints`, { token: U });
  expectStatus('USUARIO GET /proyectos/:id/sprints', sprints, 200);

  const act = await call('POST', `/sprints/${S}/actividades`, { token: A, json: { nombre: 'Limpieza de terreno', responsableId: usuarioId } });
  expectStatus('POST /sprints/:id/actividades', act, 201);
  const ACT = act.body.id as number;
  check('actividad inicia en BACKLOG con avance 0', act.body.estado === 'BACKLOG' && act.body.avance === 0);
  expectStatus('POST actividad avance > 100', await call('POST', `/sprints/${S}/actividades`, { token: A, json: { nombre: 'Mala', responsableId: usuarioId, avance: 150 } }), 422);
  expectStatus('GET /sprints/:id/actividades', await call('GET', `/sprints/${S}/actividades`, { token: U }), 200);
  const kanban = await call('GET', `/sprints/${S}/actividades?vista=kanban`, { token: A });
  check('vista kanban con 5 columnas', kanban.status === 200 && kanban.body.columnas?.length === 5, kanban.body);
  expectStatus('PATCH /actividades/:id -> EN_PROCESO', await call('PATCH', `/actividades/${ACT}`, { token: A, json: { estado: 'EN_PROCESO', avance: 40 } }), 200);
  const completada = await call('PATCH', `/actividades/${ACT}`, { token: A, json: { estado: 'COMPLETADA' } });
  check('COMPLETADA sin avance -> avance 100', completada.status === 200 && completada.body.avance === 100, completada.body);
  expectStatus('PATCH estado inválido', await call('PATCH', `/actividades/${ACT}`, { token: A, json: { estado: 'TERMINADO' } }), 422);
  expectStatus('USUARIO PATCH /actividades/:id', await call('PATCH', `/actividades/${ACT}`, { token: U, json: { avance: 10 } }), 403);

  seccion('Materiales y stock');
  const mat = await call('POST', `/proyectos/${P}/materiales`, { token: A, json: { nombre: 'Cemento', unidad: 'bolsa', stockMinimo: 20, stockInicial: 50 } });
  expectStatus('POST /proyectos/:id/materiales', mat, 201);
  const M = mat.body.id as number;
  check('stock inicial 50', mat.body.stockActual === 50);
  expectStatus('GET /proyectos/:id/materiales', await call('GET', `/proyectos/${P}/materiales`, { token: A }), 200);
  expectStatus('USUARIO GET /proyectos/:id/materiales', await call('GET', `/proyectos/${P}/materiales`, { token: U }), 403);
  const salida = await call('POST', `/materiales/${M}/movimientos`, { token: A, json: { tipo: 'SALIDA', cantidad: 35 } });
  expectStatus('POST /materiales/:id/movimientos SALIDA', salida, 201);
  check('stock tras salida = 15 y en alerta', salida.body.material?.stockActual === 15 && salida.body.material?.enAlerta === true, salida.body);
  const sinStock = await call('POST', `/materiales/${M}/movimientos`, { token: A, json: { tipo: 'SALIDA', cantidad: 16 } });
  expectStatus('SALIDA con stock insuficiente', sinStock, 409);
  check('409 informa stock actual', sinStock.body.details?.stockActual === 15, sinStock.body);
  expectStatus('POST movimiento cantidad 0', await call('POST', `/materiales/${M}/movimientos`, { token: A, json: { tipo: 'ENTRADA', cantidad: 0 } }), 422);
  expectStatus('USUARIO POST movimiento', await call('POST', `/materiales/${M}/movimientos`, { token: U, json: { tipo: 'ENTRADA', cantidad: 1 } }), 403);
  const alertas = await call('GET', `/proyectos/${P}/materiales/alertas`, { token: U });
  expectStatus('GET /proyectos/:id/materiales/alertas', alertas, 200);
  check('alertas incluye el cemento', alertas.body.some((m: any) => m.id === M));
  const entrada = await call('POST', `/materiales/${M}/movimientos`, { token: A, json: { tipo: 'ENTRADA', cantidad: 100.5, observacion: 'Compra' } });
  check('ENTRADA suma stock (115.5) y sale de alerta', entrada.body.material?.stockActual === 115.5 && entrada.body.material?.enAlerta === false, entrada.body);
  const movs = await call('GET', `/materiales/${M}/movimientos`, { token: A });
  check('GET /materiales/:id/movimientos lista 3 movimientos', movs.status === 200 && movs.body.length === 3, movs.body);

  // Concurrencia: 5 salidas simultáneas de 30 con stock 115.5 -> solo 3 deben pasar
  const concurrentes = await Promise.all(
    Array.from({ length: 5 }, () => call('POST', `/materiales/${M}/movimientos`, { token: A, json: { tipo: 'SALIDA', cantidad: 30 } })),
  );
  const ok = concurrentes.filter((r) => r.status === 201).length;
  const conflictos = concurrentes.filter((r) => r.status === 409).length;
  const matFinal = (await call('GET', `/proyectos/${P}/materiales`, { token: A })).body.find((m: any) => m.id === M);
  check(`salidas concurrentes: 3 OK / 2 rechazadas, stock final 25.5 (obtenido ${ok}/${conflictos}, ${matFinal?.stockActual})`, ok === 3 && conflictos === 2 && matFinal?.stockActual === 25.5);

  seccion('Personal');
  const dni = String(sufijo).slice(-8);
  const trab = await call('POST', '/trabajadores', { token: A, json: { dni, nombre: 'Trabajador E2E', cargo: 'Operario', costoHora: 20 } });
  expectStatus('POST /trabajadores', trab, 201);
  const T = trab.body.id as number;
  expectStatus('POST /trabajadores DNI duplicado', await call('POST', '/trabajadores', { token: A, json: { dni, nombre: 'Otro', cargo: 'Peón', costoHora: 10 } }), 409);
  expectStatus('POST /trabajadores DNI inválido', await call('POST', '/trabajadores', { token: A, json: { dni: '123', nombre: 'Otro', cargo: 'Peón', costoHora: 10 } }), 422);
  expectStatus('GET /trabajadores', await call('GET', '/trabajadores?activo=true', { token: A }), 200);
  expectStatus('USUARIO GET /trabajadores', await call('GET', '/trabajadores', { token: U }), 403);
  expectStatus('PUT /trabajadores/:id', await call('PUT', `/trabajadores/${T}`, { token: A, json: { costoHora: 22.5 } }), 200);

  expectStatus('POST horas sin asignación', await call('POST', `/proyectos/${P}/registros-horas`, { token: A, json: { trabajadorId: T, fecha: '2026-09-10', horas: 8 } }), 409);
  const asig = await call('POST', `/proyectos/${P}/asignaciones`, { token: A, json: { trabajadorId: T, fechaInicio: '2026-09-01' } });
  expectStatus('POST /proyectos/:id/asignaciones', asig, 201);
  expectStatus('POST asignación solapada', await call('POST', `/proyectos/${P}/asignaciones`, { token: A, json: { trabajadorId: T, fechaInicio: '2026-09-15' } }), 409);
  expectStatus('GET /proyectos/:id/asignaciones', await call('GET', `/proyectos/${P}/asignaciones`, { token: A }), 200);
  const reg1 = await call('POST', `/proyectos/${P}/registros-horas`, { token: A, json: { trabajadorId: T, fecha: '2026-09-10', horas: 6, descripcion: 'Modelado estructural' } });
  expectStatus('POST /proyectos/:id/registros-horas', reg1, 201);
  expectStatus('POST segundo registro el mismo día', await call('POST', `/proyectos/${P}/registros-horas`, { token: A, json: { trabajadorId: T, fecha: '2026-09-10', horas: 2, descripcion: 'Reunión' } }), 201);
  expectStatus('POST horas que superan 24 en el día', await call('POST', `/proyectos/${P}/registros-horas`, { token: A, json: { trabajadorId: T, fecha: '2026-09-10', horas: 20 } }), 409);
  expectStatus('POST horas no múltiplo de 0.5', await call('POST', `/proyectos/${P}/registros-horas`, { token: A, json: { trabajadorId: T, fecha: '2026-09-11', horas: 1.3 } }), 422);
  expectStatus('USUARIO POST registros-horas', await call('POST', `/proyectos/${P}/registros-horas`, { token: U, json: {} }), 403);
  const regs = await call('GET', `/proyectos/${P}/registros-horas?desde=2026-09-01&hasta=2026-09-30`, { token: A });
  check('GET /proyectos/:id/registros-horas lista 2 registros', regs.status === 200 && regs.body.length === 2, regs.body);
  const horas = await call('GET', `/proyectos/${P}/horas`, { token: U });
  expectStatus('GET /proyectos/:id/horas', horas, 200);
  check('horas: 8 h en 1 día, costo 180 (8 × 22.5)', horas.body.totalHoras === 8 && horas.body.costoTotal === 180 && horas.body.trabajadores[0]?.diasTrabajados === 1, horas.body);
  expectStatus('DELETE /registros-horas/:id', await call('DELETE', `/registros-horas/${reg1.body.id}`, { token: A }), 204);
  expectStatus('PATCH /asignaciones/:id (cerrar)', await call('PATCH', `/asignaciones/${asig.body.id}`, { token: A, json: { fechaFin: '2026-09-30' } }), 200);

  seccion('Gastos');
  const gasto = await call('POST', `/proyectos/${P}/gastos`, { token: A, json: { categoria: 'MATERIALES', descripcion: 'Compra de cemento', monto: 12500.75, fecha: '2026-09-05' } });
  expectStatus('POST /proyectos/:id/gastos', gasto, 201);
  await call('POST', `/proyectos/${P}/gastos`, { token: A, json: { categoria: 'TRANSPORTE', descripcion: 'Flete', monto: 499.25, fecha: '2026-10-02' } });
  expectStatus('POST gasto monto negativo', await call('POST', `/proyectos/${P}/gastos`, { token: A, json: { categoria: 'OTROS', descripcion: 'Malo', monto: -5, fecha: '2026-09-05' } }), 422);
  expectStatus('POST gasto 3 decimales', await call('POST', `/proyectos/${P}/gastos`, { token: A, json: { categoria: 'OTROS', descripcion: 'Malo', monto: 1.234, fecha: '2026-09-05' } }), 422);
  expectStatus('USUARIO POST gasto', await call('POST', `/proyectos/${P}/gastos`, { token: U, json: {} }), 403);
  expectStatus('USUARIO GET gastos', await call('GET', `/proyectos/${P}/gastos`, { token: U }), 403);
  const filtrados = await call('GET', `/proyectos/${P}/gastos?categoria=MATERIALES`, { token: A });
  check('GET /proyectos/:id/gastos?categoria filtra', filtrados.status === 200 && filtrados.body.length === 1, filtrados.body);
  const resumen = await call('GET', `/proyectos/${P}/gastos/resumen`, { token: U });
  expectStatus('GET /proyectos/:id/gastos/resumen', resumen, 200);
  check('resumen: total 13000, saldo 87000, 13%', resumen.body.totalGastado === 13000 && resumen.body.saldo === 87000 && resumen.body.porcentajeEjecutado === 13, resumen.body);
  check('resumen: 5 categorías y 2 meses', resumen.body.porCategoria?.length === 5 && resumen.body.porMes?.length === 2);
  expectStatus('PUT /gastos/:id', await call('PUT', `/gastos/${gasto.body.id}`, { token: A, json: { descripcion: 'Compra de cemento Sol' } }), 200);

  seccion('Gastos de la empresa e importación desde Excel');
  const gEmp = await call('POST', '/gastos/empresa', { token: A, json: { categoria: 'ALQUILER', descripcion: 'Alquiler de oficina setiembre', monto: 1500, fecha: '2026-09-01' } });
  expectStatus('POST /gastos/empresa', gEmp, 201);
  check('gasto de la empresa sin proyecto', gEmp.body.proyectoId === null, gEmp.body);
  expectStatus('POST /gastos/empresa con categoría de proyecto', await call('POST', '/gastos/empresa', { token: A, json: { categoria: 'MATERIALES', descripcion: 'Malo', monto: 5, fecha: '2026-09-01' } }), 400);
  expectStatus('POST gasto de proyecto con categoría de empresa', await call('POST', `/proyectos/${P}/gastos`, { token: A, json: { categoria: 'ALQUILER', descripcion: 'Malo', monto: 5, fecha: '2026-09-01' } }), 400);
  expectStatus('PUT gasto de empresa a categoría de proyecto', await call('PUT', `/gastos/${gEmp.body.id}`, { token: A, json: { categoria: 'MATERIALES' } }), 400);
  expectStatus('PUT gasto de empresa (OTROS sirve para ambos)', await call('PUT', `/gastos/${gEmp.body.id}`, { token: A, json: { categoria: 'OTROS' } }), 200);
  await call('PUT', `/gastos/${gEmp.body.id}`, { token: A, json: { categoria: 'ALQUILER' } });
  expectStatus('USUARIO GET /gastos/empresa', await call('GET', '/gastos/empresa', { token: U }), 403);
  const listaEmp = await call('GET', '/gastos/empresa?categoria=ALQUILER', { token: A });
  check('GET /gastos/empresa lista solo gastos sin proyecto', listaEmp.status === 200 && listaEmp.body.some((g: any) => g.id === gEmp.body.id) && listaEmp.body.every((g: any) => g.proyectoId === null));
  const resEmp = await call('GET', '/gastos/empresa/resumen?desde=2026-09-01&hasta=2026-09-30', { token: A });
  check('resumen de la empresa: 7 categorías e incluye el alquiler', resEmp.status === 200 && resEmp.body.porCategoria?.length === 7 && resEmp.body.total >= 1500, resEmp.body);

  const fila = (n: number, extra: Record<string, unknown>) => ({ fila: n, proyectoId: P, categoria: 'TRANSPORTE', descripcion: `Movilidad e2e ${sufijo}`, monto: 80, fecha: '2026-09-20', ...extra });
  const verif = await call('POST', '/gastos/importar/verificar', {
    token: A,
    json: { filas: [fila(2, { categoria: 'MATERIALES', descripcion: '  compra de CEMENTO sol ', monto: 12500.75, fecha: '2026-09-05' }), fila(3, {}), fila(4, {})] },
  });
  check(
    'verificar: detecta gasto existente (sin importar mayúsculas/espacios) y repetido en el archivo',
    verif.status === 200 && verif.body[0]?.duplicado === 'EXISTE' && verif.body[0]?.gastoId === gasto.body.id && verif.body[1]?.duplicado === null && verif.body[2]?.duplicado === 'ARCHIVO',
    verif.body,
  );
  const ajena = await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'x.xlsx', origenProyectoId: P, filas: [fila(2, {}), fila(3, { proyectoId: null, categoria: 'ALQUILER' })] } });
  check('importar desde un proyecto rechaza filas de otro destino e indica la fila', ajena.status === 400 && ajena.body.details?.some((d: any) => d.fila === 3), ajena.body);
  const malaCat = await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'x.xlsx', origenProyectoId: P, filas: [fila(7, { categoria: 'SUELDOS' })] } });
  check('importar rechaza categoría de empresa en un proyecto (fila 7)', malaCat.status === 400 && malaCat.body.details?.[0]?.fila === 7, malaCat.body);
  expectStatus('importar fila con monto 0', await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'x.xlsx', origenProyectoId: P, filas: [fila(2, { monto: 0 })] } }), 422);
  expectStatus('importar más de 1000 filas', await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'x.xlsx', origenProyectoId: null, filas: Array.from({ length: 1001 }, (_, i) => fila(i + 2, {})) } }), 422);
  expectStatus('importar a proyecto inexistente', await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'x.xlsx', origenProyectoId: null, filas: [fila(2, { proyectoId: 99999999 })] } }), 400);
  expectStatus('USUARIO POST /gastos/importar', await call('POST', '/gastos/importar', { token: U, json: {} }), 403);
  const antesImp = (await call('GET', `/proyectos/${P}/gastos/resumen`, { token: A })).body.totalGastado;

  const impP = await call('POST', '/gastos/importar', { token: A, json: { nombreArchivo: 'gastos-obra.xlsx', origenProyectoId: P, filas: [fila(2, {}), fila(3, { monto: 120.5, categoria: 'OTROS' })] } });
  expectStatus('POST /gastos/importar (desde el proyecto)', impP, 201);
  check('importación: 2 filas, total 200.50', impP.body.cantidad === 2 && impP.body.total === 200.5, impP.body);
  const impMixta = await call('POST', '/gastos/importar', {
    token: A,
    json: { nombreArchivo: 'gastos-mezclados.xlsx', origenProyectoId: null, filas: [fila(2, { monto: 50 }), fila(3, { proyectoId: null, categoria: 'SERVICIOS_BASICOS', descripcion: 'Luz oficina', monto: 230.4 })] },
  });
  expectStatus('POST /gastos/importar (mezcla obra y empresa)', impMixta, 201);
  const trasImp = (await call('GET', `/proyectos/${P}/gastos/resumen`, { token: A })).body.totalGastado;
  check('los gastos importados suman al proyecto (200.50 + 50)', Math.abs(trasImp - antesImp - 250.5) < 0.001, { antesImp, trasImp });
  const histP = await call('GET', `/gastos/importaciones?proyectoId=${P}`, { token: A });
  check('historial del proyecto: la importación con 2 gastos vigentes y quién la hizo', histP.status === 200 && histP.body[0]?.id === impP.body.id && histP.body[0]?.gastosVigentes === 2 && histP.body[0]?.usuario?.id === payload.id, histP.body[0]);
  const histEmp = await call('GET', '/gastos/importaciones', { token: A });
  check('historial de la empresa: incluye la mixta y no la del proyecto', histEmp.body.some((i: any) => i.id === impMixta.body.id) && !histEmp.body.some((i: any) => i.id === impP.body.id));
  const generalEmp = await call('GET', '/dashboard/general?meses=36', { token: A });
  const septiembre = generalEmp.body.finanzas?.porMes?.find((m: any) => m.mes === '2026-09');
  check(
    'dashboard general separa obras y empresa',
    generalEmp.body.finanzas?.gastoEmpresa >= 1730.4 && generalEmp.body.finanzas?.porCategoriaEmpresa?.length === 7 && generalEmp.body.finanzas?.porCategoria?.length === 5 && septiembre?.empresa >= 1730.4 && septiembre?.obras > 0,
    generalEmp.body.finanzas,
  );
  const deshacer = await call('DELETE', `/gastos/importaciones/${impP.body.id}`, { token: A });
  check('deshacer importación borra sus 2 gastos', deshacer.status === 200 && deshacer.body.gastosEliminados === 2, deshacer.body);
  expectStatus('deshacer dos veces', await call('DELETE', `/gastos/importaciones/${impP.body.id}`, { token: A }), 409);
  expectStatus('USUARIO deshacer importación', await call('DELETE', `/gastos/importaciones/${impMixta.body.id}`, { token: U }), 403);
  check('deshecha queda en el historial', (await call('GET', `/gastos/importaciones?proyectoId=${P}`, { token: A })).body[0]?.deshechaEn != null);
  expectStatus('deshacer la importación mixta', await call('DELETE', `/gastos/importaciones/${impMixta.body.id}`, { token: A }), 200);
  check('el proyecto vuelve a su total anterior', (await call('GET', `/proyectos/${P}/gastos/resumen`, { token: A })).body.totalGastado === antesImp);
  expectStatus('DELETE gasto de la empresa', await call('DELETE', `/gastos/${gEmp.body.id}`, { token: A }), 204);

  seccion('Evidencias (multipart)');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const formFoto = () => {
    const f = new FormData();
    f.append('tipo', 'FOTO');
    f.append('titulo', 'Avance de muros');
    f.append('descripcion', 'Foto tomada por el residente');
    f.append('actividadId', String(ACT));
    f.append('archivo', new Blob([png], { type: 'image/png' }), 'avance.png');
    return f;
  };
  const evU = await call('POST', `/proyectos/${P}/evidencias`, { token: U, form: formFoto() });
  expectStatus('USUARIO asignado sube FOTO', evU, 201);
  check('evidencia con archivoUrl y descargaUrl', !!evU.body.archivoUrl && evU.body.descargaUrl === `/api/v1/evidencias/${evU.body.id}/archivo`, evU.body);

  const archivo = await fetch(`${API}/evidencias/${evU.body.id}/archivo`, { headers: { Authorization: `Bearer ${U}` } });
  const bytes = Buffer.from(await archivo.arrayBuffer());
  check('GET /evidencias/:id/archivo devuelve el mismo archivo', archivo.status === 200 && bytes.equals(png) && archivo.headers.get('content-type') === 'image/png');
  expectStatus('GET archivo sin token', await call('GET', `/evidencias/${evU.body.id}/archivo`), 401);

  const obs = await call('POST', `/proyectos/${P}/evidencias`, { token: A, json: { tipo: 'OBSERVACION', titulo: 'Observación sin archivo' } });
  expectStatus('ADMIN crea OBSERVACION sin archivo (JSON)', obs, 201);
  const sinArchivo = new FormData();
  sinArchivo.append('tipo', 'INFORME');
  sinArchivo.append('titulo', 'Informe sin archivo');
  expectStatus('INFORME sin archivo', await call('POST', `/proyectos/${P}/evidencias`, { token: U, form: sinArchivo }), 400);
  const exe = new FormData();
  exe.append('tipo', 'DOCUMENTO');
  exe.append('titulo', 'Archivo peligroso');
  exe.append('archivo', new Blob(['MZ'], { type: 'application/x-msdownload' }), 'virus.exe');
  expectStatus('tipo de archivo no permitido', await call('POST', `/proyectos/${P}/evidencias`, { token: U, form: exe }), 400);
  const invalida = formFoto();
  invalida.set('titulo', 'x');
  expectStatus('evidencia con título inválido', await call('POST', `/proyectos/${P}/evidencias`, { token: U, form: invalida }), 422);
  const lista = await call('GET', `/proyectos/${P}/evidencias`, { token: U });
  check('GET /proyectos/:id/evidencias: solo 2 evidencias (las fallidas no se guardaron)', lista.status === 200 && lista.body.length === 2, lista.body?.length);
  expectStatus('GET evidencias filtro tipo', await call('GET', `/proyectos/${P}/evidencias?tipo=FOTO`, { token: A }), 200);
  expectStatus('USUARIO DELETE evidencia', await call('DELETE', `/evidencias/${obs.body.id}`, { token: U }), 403);
  expectStatus('ADMIN DELETE evidencia', await call('DELETE', `/evidencias/${obs.body.id}`, { token: A }), 204);

  seccion('Planos (revisiones)');
  const pdf = Buffer.from('%PDF-1.4 demo');
  const formPlano = (codigo: string, conArchivo = true, nombre = 'plano.pdf') => {
    const f = new FormData();
    f.append('codigo', codigo);
    f.append('titulo', 'Planta de cimentación');
    f.append('especialidad', 'ESTRUCTURAS');
    if (conArchivo) f.append('archivo', new Blob([pdf], { type: 'application/octet-stream' }), nombre);
    return f;
  };
  const plano = await call('POST', `/proyectos/${P}/planos`, { token: U, form: formPlano('e-01') });
  expectStatus('USUARIO crea plano con archivo', plano, 201);
  const PL = plano.body.id as number;
  check('plano: código en mayúsculas, EN_REVISION, Rev 1', plano.body.codigo === 'E-01' && plano.body.estado === 'EN_REVISION' && plano.body.ultimaVersion?.revision === 1, plano.body);
  expectStatus('plano con código repetido', await call('POST', `/proyectos/${P}/planos`, { token: A, form: formPlano('E-01', false) }), 409);
  const borrador = await call('POST', `/proyectos/${P}/planos`, { token: A, form: formPlano('E-02', false) });
  check('plano sin archivo queda en BORRADOR', borrador.status === 201 && borrador.body.estado === 'BORRADOR', borrador.body);
  expectStatus('aprobar plano sin archivo', await call('PATCH', `/planos/${borrador.body.id}`, { token: A, json: { estado: 'APROBADO' } }), 409);
  expectStatus('formato de plano no permitido', await call('POST', `/proyectos/${P}/planos`, { token: U, form: formPlano('E-09', true, 'virus.exe') }), 400);
  expectStatus('USUARIO no puede aprobar', await call('PATCH', `/planos/${PL}`, { token: U, json: { estado: 'APROBADO' } }), 403);
  expectStatus('OBSERVADO sin observación', await call('PATCH', `/planos/${PL}`, { token: A, json: { estado: 'OBSERVADO' } }), 422);
  const observado = await call('PATCH', `/planos/${PL}`, { token: A, json: { estado: 'OBSERVADO', observacion: 'Falta detalle de zapata Z-2' } });
  check('ADMIN observa el plano', observado.status === 200 && observado.body.estado === 'OBSERVADO', observado.body);
  const fv = new FormData();
  fv.append('comentario', 'Se agregó detalle de Z-2');
  fv.append('archivo', new Blob([pdf], { type: 'application/pdf' }), 'E-01_revB.pdf');
  const v2 = await call('POST', `/planos/${PL}/versiones`, { token: U, form: fv });
  check('USUARIO sube Rev 2', v2.status === 201 && v2.body.revision === 2, v2.body);
  const detalle = await call('GET', `/planos/${PL}`, { token: U });
  check('plano vuelve a EN_REVISION con 2 versiones', detalle.body.estado === 'EN_REVISION' && detalle.body.versiones?.length === 2, detalle.body);
  const descarga = await fetch(`${API}${detalle.body.versiones[0].descargaUrl.replace('/api/v1', '')}`, { headers: { Authorization: `Bearer ${U}` } });
  check('descarga de versión con nombre CÓDIGO_RevX', descarga.status === 200 && /E-01_RevB\.pdf/.test(decodeURIComponent(descarga.headers.get('content-disposition') ?? '')), descarga.headers.get('content-disposition'));
  expectStatus('ADMIN aprueba', await call('PATCH', `/planos/${PL}`, { token: A, json: { estado: 'APROBADO' } }), 200);
  const listaPlanos = await call('GET', `/proyectos/${P}/planos?especialidad=ESTRUCTURAS`, { token: U });
  check('GET /proyectos/:id/planos filtra por especialidad', listaPlanos.status === 200 && listaPlanos.body.length === 2, listaPlanos.body);
  expectStatus('USUARIO DELETE plano', await call('DELETE', `/planos/${borrador.body.id}`, { token: U }), 403);
  expectStatus('ADMIN DELETE plano', await call('DELETE', `/planos/${borrador.body.id}`, { token: A }), 204);

  seccion('Presupuestos');
  const pres = await call('POST', `/proyectos/${P}/presupuestos`, { token: U, json: { nombre: 'Presupuesto de obra' } });
  expectStatus('USUARIO crea presupuesto', pres, 201);
  const PR = pres.body.id as number;
  check('porcentajes por defecto GG 10 / U 5 / IGV 18', pres.body.gastosGeneralesPct === 10 && pres.body.utilidadPct === 5 && pres.body.igvPct === 18, pres.body);
  const partidas = [
    { item: '01', descripcion: 'OBRAS PROVISIONALES', esTitulo: true },
    { item: '01.01', descripcion: 'Cartel de obra', unidad: 'und', metrado: 1, precioUnitario: 1000 },
    { item: '02', descripcion: 'CONCRETO', esTitulo: true },
    { item: '02.01', descripcion: 'Concreto fc 210', unidad: 'm3', metrado: 10, precioUnitario: 400 },
  ];
  const guardado = await call('PUT', `/presupuestos/${PR}/partidas`, { token: U, json: { partidas } });
  expectStatus('PUT /presupuestos/:id/partidas', guardado, 200);
  const t = guardado.body.totales;
  // CD 5000 · GG 500 · U 250 · Subtotal 5750 · IGV 1035 · Total 6785
  check('totales: CD 5000, GG 500, U 250, IGV 1035, total 6785', t?.costoDirecto === 5000 && t.gastosGenerales === 500 && t.utilidad === 250 && t.igv === 1035 && t.total === 6785, t);
  check('título 02 suma sus partidas (4000)', guardado.body.partidas?.find((x: any) => x.item === '02')?.parcial === 4000, guardado.body.partidas);
  expectStatus('partida sin metrado', await call('PUT', `/presupuestos/${PR}/partidas`, { token: U, json: { partidas: [{ item: '01', descripcion: 'X' }] } }), 422);
  expectStatus('ítem repetido', await call('PUT', `/presupuestos/${PR}/partidas`, { token: U, json: { partidas: [partidas[1], partidas[1]] } }), 400);
  expectStatus('USUARIO envía a revisión', await call('PUT', `/presupuestos/${PR}`, { token: U, json: { estado: 'EN_REVISION' } }), 200);
  expectStatus('USUARIO no puede aprobar', await call('PUT', `/presupuestos/${PR}`, { token: U, json: { estado: 'APROBADO' } }), 403);
  expectStatus('ADMIN aprueba', await call('PUT', `/presupuestos/${PR}`, { token: A, json: { estado: 'APROBADO' } }), 200);
  expectStatus('aprobado no se puede editar', await call('PUT', `/presupuestos/${PR}/partidas`, { token: A, json: { partidas } }), 409);
  const v2p = await call('POST', `/presupuestos/${PR}/duplicar`, { token: U });
  check('duplicar crea versión 2 en BORRADOR con las mismas partidas', v2p.status === 201 && v2p.body.version === 2 && v2p.body.estado === 'BORRADOR' && v2p.body.totales?.total === 6785, v2p.body);
  const listaP = await call('GET', `/proyectos/${P}/presupuestos`, { token: U });
  check('GET /proyectos/:id/presupuestos lista 2 versiones con totales', listaP.status === 200 && listaP.body.length === 2 && listaP.body.every((x: any) => x.totales && !x.partidas), listaP.body);
  expectStatus('USUARIO DELETE presupuesto', await call('DELETE', `/presupuestos/${v2p.body.id}`, { token: U }), 403);
  expectStatus('ADMIN DELETE presupuesto', await call('DELETE', `/presupuestos/${v2p.body.id}`, { token: A }), 204);

  seccion('Entregables');
  const plantilla = await call('POST', `/proyectos/${P}/entregables/plantilla`, { token: A });
  check('plantilla agrega 14 entregables', plantilla.status === 201 && plantilla.body.agregados === 14, plantilla.body);
  const otraVez = await call('POST', `/proyectos/${P}/entregables/plantilla`, { token: A });
  check('plantilla no duplica', otraVez.body.agregados === 0, otraVez.body);
  const ent = await call('POST', `/proyectos/${P}/entregables`, { token: A, json: { nombre: 'Estudio de impacto vial', fechaLimite: '2026-01-10' } });
  expectStatus('POST /proyectos/:id/entregables', ent, 201);
  check('entregable con fecha pasada figura como vencido', ent.body.vencido === true, ent.body);
  const aprobado = await call('PATCH', `/entregables/${ent.body.id}`, { token: A, json: { estado: 'APROBADO' } });
  check('al aprobar registra fecha de entrega y deja de estar vencido', aprobado.status === 200 && !!aprobado.body.fechaEntrega && aprobado.body.vencido === false, aprobado.body);
  expectStatus('USUARIO PATCH entregable', await call('PATCH', `/entregables/${ent.body.id}`, { token: U, json: { estado: 'BORRADOR' } }), 403);
  const listaE = await call('GET', `/proyectos/${P}/entregables`, { token: U });
  check('USUARIO ve los 15 entregables', listaE.status === 200 && listaE.body.length === 15, listaE.body?.length);
  expectStatus('DELETE /entregables/:id', await call('DELETE', `/entregables/${ent.body.id}`, { token: A }), 204);

  seccion('Dashboard');
  const dash = await call('GET', `/proyectos/${P}/dashboard`, { token: U });
  expectStatus('GET /proyectos/:id/dashboard', dash, 200);
  check('dashboard: avance 100, gasto 13000, 1 foto', dash.body.avance?.avanceGeneral === 100 && dash.body.finanzas?.totalGastado === 13000 && dash.body.evidencias?.porTipo?.FOTO === 1, dash.body);
  check('dashboard: plano aprobado, 14 entregables, 1 presupuesto', dash.body.planos?.total === 1 && dash.body.planos?.porEstado?.APROBADO === 1 && dash.body.entregables?.total === 14 && dash.body.presupuestos?.length === 1, { planos: dash.body.planos, entregables: dash.body.entregables });
  const general = await call('GET', '/dashboard/general?meses=6', { token: A });
  expectStatus('GET /dashboard/general', general, 200);
  check('dashboard general: serie de 6 meses e incluye el proyecto', general.body.finanzas?.porMes?.length === 6 && general.body.resumenProyectos?.some((p: any) => p.id === P));
  check('dashboard general: planos por revisar y entregables vencidos', Array.isArray(general.body.planosPorRevisar) && Array.isArray(general.body.entregablesVencidos));
  expectStatus('USUARIO GET /dashboard/general', await call('GET', '/dashboard/general', { token: U }), 403);

  seccion('Web pública: servicios');
  const pub = await call('GET', '/servicios');
  expectStatus('GET /servicios sin token (público)', pub, 200);
  check('servicios públicos ordenados y sin ruta interna de la foto', Array.isArray(pub.body) && pub.body.every((s: any, i: number, a: any[]) => s.activo && !('foto' in s) && (i === 0 || a[i - 1].orden <= s.orden)), pub.body);
  expectStatus('GET /servicios/todos sin token', await call('GET', '/servicios/todos'), 401);
  expectStatus('USUARIO GET /servicios/todos', await call('GET', '/servicios/todos', { token: U }), 403);
  expectStatus('USUARIO POST /servicios', await call('POST', '/servicios', { token: U, json: { nombre: 'X', descripcion: 'X' } }), 403);
  expectStatus('POST /servicios inválido', await call('POST', '/servicios', { token: A, json: { nombre: 'ab', descripcion: 'corta', slug: 'No Valido' } }), 422);
  const slugE2E = `e2e-${sufijo}`;
  const serv = await call('POST', '/servicios', { token: A, json: { nombre: 'Servicio E2E', descripcion: 'Servicio creado por la prueba e2e', slug: slugE2E, icono: 'lupa', items: ['Uno', 'Dos'] } });
  expectStatus('POST /servicios', serv, 201);
  const SV = serv.body.id as number;
  expectStatus('POST /servicios slug duplicado', await call('POST', '/servicios', { token: A, json: { nombre: 'Otro E2E', descripcion: 'Servicio con slug repetido', slug: slugE2E } }), 409);
  const servEd = await call('PUT', `/servicios/${SV}`, { token: A, json: { orden: 999 } });
  check('PUT /servicios/:id parcial conserva los puntos', servEd.status === 200 && servEd.body.orden === 999 && servEd.body.items?.length === 2, servEd.body);
  const formServ = (tipo: string, nombre: string, datos: BlobPart = png) => {
    const f = new FormData();
    f.append('archivo', new Blob([datos], { type: tipo }), nombre);
    return f;
  };
  expectStatus('USUARIO POST /servicios/:id/foto', await call('POST', `/servicios/${SV}/foto`, { token: U, form: formServ('image/png', 'f.png') }), 403);
  expectStatus('POST /servicios/:id/foto tipo no permitido', await call('POST', `/servicios/${SV}/foto`, { token: A, form: formServ('application/pdf', 'f.pdf') }), 400);
  const conFoto = await call('POST', `/servicios/${SV}/foto`, { token: A, form: formServ('image/png', 'f.png') });
  expectStatus('POST /servicios/:id/foto', conFoto, 200);
  const fotoPub = await fetch(`${API}${conFoto.body.fotoUrl}`);
  check('foto pública visible sin token', fotoPub.status === 200 && fotoPub.headers.get('content-type') === 'image/png', fotoPub.status);
  check('DELETE /servicios/:id/foto', (await call('DELETE', `/servicios/${SV}/foto`, { token: A })).body?.fotoUrl === null);
  expectStatus('DELETE /servicios/:id (ocultar)', await call('DELETE', `/servicios/${SV}`, { token: A }), 204);
  check('servicio oculto no aparece en la web', !(await call('GET', '/servicios')).body.some((s: any) => s.id === SV));
  expectStatus('foto de servicio oculto', await call('GET', `/servicios/${SV}/foto`), 404);

  seccion('Web pública: contacto');
  expectStatus('POST /contacto inválido', await call('POST', '/contacto', { json: { nombre: 'A', correo: 'malo', mensaje: 'corto' } }), 422);
  const marca = `E2E-${sufijo}`;
  expectStatus('POST /contacto (público)', await call('POST', '/contacto', { json: { nombre: 'Visitante E2E', correo: 'visitante@ejemplo.com', tipo: 'CONSULTA_TECNICA', mensaje: `Consulta de prueba ${marca}` } }), 201);
  expectStatus('GET /contacto sin token', await call('GET', '/contacto'), 401);
  expectStatus('USUARIO GET /contacto', await call('GET', '/contacto', { token: U }), 403);
  const msgs = await call('GET', `/contacto?q=${marca}`, { token: A });
  check('ADMIN ve el mensaje guardado', msgs.status === 200 && msgs.body.length === 1 && msgs.body[0].tipo === 'CONSULTA_TECNICA' && !msgs.body[0].leido, msgs.body);
  const leido = await call('PATCH', `/contacto/${msgs.body[0]?.id}/leido`, { token: A, json: { leido: true } });
  check('PATCH /contacto/:id/leido', leido.status === 200 && leido.body.leido === true, leido.body);
  expectStatus('USUARIO PATCH /contacto/:id/leido', await call('PATCH', `/contacto/${msgs.body[0]?.id}/leido`, { token: U, json: { leido: false } }), 403);

  seccion('Web pública: datos de la empresa y proyectos realizados');
  const web0 = await call('GET', '/web');
  check('GET /web público con datos y proyectos', web0.status === 200 && typeof web0.body.datos === 'object' && Array.isArray(web0.body.proyectos), web0.body);
  expectStatus('GET /sitio sin token', await call('GET', '/sitio'), 401);
  expectStatus('USUARIO GET /sitio', await call('GET', '/sitio', { token: U }), 403);
  const sitioAntes = await call('GET', '/sitio', { token: A });
  check('GET /sitio devuelve las 8 claves', sitioAntes.status === 200 && sitioAntes.body.length === 8, sitioAntes.body);
  const original = (clave: string) => sitioAntes.body.find((d: any) => d.clave === clave);
  expectStatus('PUT /sitio clave desconocida', await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'clave', valor: 'x', publicado: false }] } }), 422);
  expectStatus('PUT /sitio WhatsApp con formato inválido', await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'whatsapp', valor: '979660255', publicado: false }] } }), 422);
  expectStatus('PUT /sitio publicar un dato vacío', await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'horario', valor: '', publicado: true }] } }), 422);
  expectStatus('USUARIO PUT /sitio', await call('PUT', '/sitio', { token: U, json: { datos: [{ clave: 'horario', valor: 'x', publicado: false }] } }), 403);
  const horarioE2E = `Horario E2E ${sufijo}`;
  expectStatus('PUT /sitio guardar oculto', await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'horario', valor: horarioE2E, publicado: false }] } }), 200);
  check('dato oculto NO sale en /web', (await call('GET', '/web')).body.datos.horario !== horarioE2E);
  expectStatus('PUT /sitio publicar', await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'horario', valor: horarioE2E, publicado: true }] } }), 200);
  check('dato publicado sale en /web', (await call('GET', '/web')).body.datos.horario === horarioE2E);
  // Se restaura el horario como estaba
  await call('PUT', '/sitio', { token: A, json: { datos: [{ clave: 'horario', valor: original('horario').valor, publicado: original('horario').publicado }] } });

  expectStatus('GET /portafolio sin token', await call('GET', '/portafolio'), 401);
  expectStatus('USUARIO POST /portafolio', await call('POST', '/portafolio', { token: U, json: { titulo: 'Proyecto de usuario' } }), 403);
  expectStatus('POST /portafolio inválido', await call('POST', '/portafolio', { token: A, json: { titulo: 'abc', anio: 1990 } }), 422);
  const pw = await call('POST', '/portafolio', { token: A, json: { titulo: `Proyecto realizado E2E ${sufijo}`, cliente: 'Cliente E2E', anio: 2025, servicio: 'Expediente técnico' } });
  expectStatus('POST /portafolio', pw, 201);
  const PW = pw.body.id as number;
  const fotoPw = new FormData();
  fotoPw.append('archivo', new Blob([png], { type: 'image/png' }), 'pw.png');
  const pwFoto = await call('POST', `/portafolio/${PW}/foto`, { token: A, form: fotoPw });
  expectStatus('POST /portafolio/:id/foto', pwFoto, 200);
  check('foto del proyecto realizado pública', (await fetch(`${API}${pwFoto.body.fotoUrl}`)).status === 200);
  check('proyecto realizado sale en /web sin ruta interna', (await call('GET', '/web')).body.proyectos.some((p: any) => p.id === PW && !('foto' in p)));
  expectStatus('DELETE /portafolio/:id/foto', await call('DELETE', `/portafolio/${PW}/foto`, { token: A }), 200);
  expectStatus('DELETE /portafolio/:id (ocultar)', await call('DELETE', `/portafolio/${PW}`, { token: A }), 204);
  check('proyecto oculto no sale en /web', !(await call('GET', '/web')).body.proyectos.some((p: any) => p.id === PW));

  seccion('Etapas');
  expectStatus('USUARIO no inicia etapas', await call('POST', `/proyectos/${P}/etapas`, { token: U, json: { tipo: 'EXPEDIENTE_TECNICO' } }), 403);
  const et1 = await call('POST', `/proyectos/${P}/etapas`, { token: A, json: { tipo: 'EXPEDIENTE_TECNICO' } });
  expectStatus('iniciar primera etapa (cualquiera)', et1, 201);
  const E1 = et1.body.id as number;
  check('nace en elaboración', et1.body.estado === 'EN_ELABORACION');
  expectStatus('no se repite la misma etapa', await call('POST', `/proyectos/${P}/etapas`, { token: A, json: { tipo: 'EXPEDIENTE_TECNICO' } }), 409);
  expectStatus('no se vuelve a una etapa anterior', await call('POST', `/proyectos/${P}/etapas`, { token: A, json: { tipo: 'PREINVERSION' } }), 409);
  const sinAprobar = await call('POST', `/proyectos/${P}/etapas`, { token: A, json: { tipo: 'SUPERVISION' } });
  check('no se inicia la siguiente sin aprobar la anterior -> 409', sinAprobar.status === 409 && /aprobarse/.test(sinAprobar.body.message), sinAprobar.body);
  expectStatus('USUARIO ve las etapas de su proyecto', await call('GET', `/proyectos/${P}/etapas`, { token: U }), 200);
  expectStatus('USUARIO no aprueba', await call('POST', `/etapas/${E1}/aprobar`, { token: U }), 403);
  expectStatus('responsable envía a revisión', await call('POST', `/etapas/${E1}/enviar`, { token: U }), 200);
  expectStatus('no se envía dos veces', await call('POST', `/etapas/${E1}/enviar`, { token: U }), 409);
  expectStatus('observar sin comentario', await call('POST', `/etapas/${E1}/observar`, { token: A, json: { observacion: '' } }), 422);
  const obsEtapa = await call('POST', `/etapas/${E1}/observar`, { token: A, json: { observacion: 'Falta el plano de cortes' } });
  check('jefatura observa con comentario', obsEtapa.status === 200 && obsEtapa.body.estado === 'OBSERVADO' && obsEtapa.body.observacion === 'Falta el plano de cortes' && obsEtapa.body.observadoPor?.id, obsEtapa.body);
  expectStatus('responsable corrige y reenvía', await call('POST', `/etapas/${E1}/enviar`, { token: U }), 200);

  seccion('Documentos');
  const archivoDoc = (nombre: string, contenido: Buffer | string, categoria = 'MEMORIA') => {
    const f = new FormData();
    f.append('categoria', categoria);
    f.append('descripcion', 'Documento de prueba');
    f.append('archivo', new Blob([typeof contenido === 'string' ? contenido : new Uint8Array(contenido)]), nombre);
    return f;
  };
  const pdfDoc = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF');
  const rutaDocs = `/proyectos/${P}/etapas/${E1}/documentos`;
  expectStatus('formato no permitido (.exe)', await call('POST', rutaDocs, { token: U, form: archivoDoc('virus.exe', 'MZ') }), 400);
  expectStatus('PDF falso (texto renombrado)', await call('POST', rutaDocs, { token: U, form: archivoDoc('falso.pdf', 'no soy un pdfDoc') }), 400);
  expectStatus('categoría inválida', await call('POST', rutaDocs, { token: U, form: archivoDoc('memoria.pdf', pdfDoc, 'OTRA') }), 422);
  const docU = await call('POST', rutaDocs, { token: U, form: archivoDoc('memoria.pdf', pdfDoc) });
  expectStatus('USUARIO sube un PDF', docU, 201);
  check('guarda quién lo subió y sin ruta interna', docU.body.usuario?.id === usuarioId && !('ruta' in docU.body) && docU.body.descargaUrl, docU.body);
  const docA = await call('POST', rutaDocs, { token: A, form: archivoDoc('plano.dwg', Buffer.from('AC1032' + '\0'.repeat(20)), 'PLANOS') });
  expectStatus('jefatura sube un DWG', docA, 201);
  const vistosU = await call('GET', `/proyectos/${P}/documentos`, { token: U });
  check('USUARIO ve solo sus documentos dentro del proyecto', vistosU.body.length === 1 && vistosU.body[0].id === docU.body.id, vistosU.body.map((d: any) => d.id));
  check('jefatura ve todos', (await call('GET', `/proyectos/${P}/documentos`, { token: A })).body.length === 2);
  expectStatus('USUARIO no descarga el de otro', await call('GET', `/documentos/${docA.body.id}/archivo`, { token: U }), 403);
  const bajada = await fetch(`${API}/documentos/${docU.body.id}/archivo`, { headers: { Authorization: `Bearer ${U}` } });
  check('USUARIO descarga el suyo', bajada.status === 200 && (await bajada.text()).startsWith('%PDF'));
  expectStatus('USUARIO GET /documentos (global)', await call('GET', '/documentos', { token: U }), 403);
  const mios = await call('GET', '/documentos/mios', { token: U });
  check('Mis documentos: solo los suyos', mios.status === 200 && mios.body.total >= 1 && mios.body.documentos.every((d: any) => d.usuario.id === usuarioId), mios.body);
  const filtradosDoc = await call('GET', `/documentos?proyectoId=${P}&etapa=EXPEDIENTE_TECNICO&categoria=PLANOS`, { token: A });
  check('jefatura filtra por proyecto, etapa y categoría', filtradosDoc.body.total === 1 && filtradosDoc.body.documentos[0].id === docA.body.id, filtradosDoc.body);
  expectStatus('USUARIO edita la descripción del suyo', await call('PATCH', `/documentos/${docU.body.id}`, { token: U, json: { descripcion: 'Memoria corregida' } }), 200);
  expectStatus('USUARIO no elimina', await call('DELETE', `/documentos/${docU.body.id}`, { token: U }), 403);
  expectStatus('no se elimina una etapa con documentos', await call('DELETE', `/etapas/${E1}`, { token: A }), 409);

  // Aprobar y avanzar
  expectStatus('jefatura aprueba', await call('POST', `/etapas/${E1}/aprobar`, { token: A }), 200);
  expectStatus('etapa aprobada no admite documentos', await call('POST', rutaDocs, { token: U, form: archivoDoc('tarde.pdf', pdfDoc) }), 409);
  const et2 = await call('POST', `/proyectos/${P}/etapas`, { token: A, json: { tipo: 'SUPERVISION' } });
  expectStatus('con la anterior aprobada, se inicia la siguiente', et2, 201);
  expectStatus('no se reabre una etapa aprobada con otra posterior', await call('POST', `/etapas/${E1}/observar`, { token: A, json: { observacion: 'Reabrir por error' } }), 409);
  expectStatus('la última etapa sin documentos se puede eliminar', await call('DELETE', `/etapas/${et2.body.id}`, { token: A }), 204);
  expectStatus('jefatura elimina un documento', await call('DELETE', `/documentos/${docA.body.id}`, { token: A }), 204);
  expectStatus('documento eliminado ya no existe', await call('GET', `/documentos/${docA.body.id}/archivo`, { token: A }), 404);

  seccion('Auditoría');
  await new Promise((r) => setTimeout(r, 400)); // los eventos se guardan al terminar cada petición
  expectStatus('USUARIO GET /auditoria', await call('GET', '/auditoria', { token: U }), 403);
  expectStatus('GET /auditoria sin token', await call('GET', '/auditoria'), 401);
  const fallidos = await call('GET', '/auditoria?accion=LOGIN_FALLIDO&porPagina=50', { token: A });
  check('login fallido registrado con correo, IP y motivo (sin contraseña)', fallidos.status === 200 && fallidos.body.registros.some((r: any) => r.correo === ADMIN_EMAIL && r.ip && r.detalle?.motivo === 'credenciales'), fallidos.body.registros?.[0]);
  const denegados = await call('GET', '/auditoria?accion=ACCESO_DENEGADO&porPagina=50', { token: A });
  check('acceso denegado registrado con el usuario', denegados.body.registros.some((r: any) => r.usuarioId === usuarioId && r.codigoHttp === 403));
  const permisos = await call('GET', `/auditoria?accion=CAMBIO_PERMISOS&porPagina=50`, { token: A });
  const subidas = await call('GET', '/auditoria?accion=SUBIR&modulo=documentos&porPagina=20', { token: A });
  check('subida de documento auditada con usuario e IP', subidas.body.registros.some((r: any) => r.usuarioId === usuarioId && r.ip && r.detalle?.archivo?.nombre === 'memoria.pdf'), subidas.body.registros?.[0]);
  const observadas = await call('GET', '/auditoria?accion=OBSERVAR&porPagina=20', { token: A });
  check('observación de etapa auditada', observadas.body.registros.some((r: any) => r.modulo === 'etapas' && r.registroId === String(E1)));
  const descargas = await call('GET', '/auditoria?accion=DESCARGAR&modulo=documentos&porPagina=20', { token: A });
  check('descarga de documento auditada', descargas.body.registros.some((r: any) => r.usuarioId === usuarioId));
  check('creación de usuario registrada como cambio de permisos', permisos.body.registros.some((r: any) => r.registroId === String(usuarioId)));
  const importaciones = await call('GET', '/auditoria?accion=IMPORTAR&modulo=gastos&porPagina=20', { token: A });
  check('importación de gastos auditada con archivo y filas', importaciones.body.registros.some((r: any) => r.registroId === String(impP.body.id) && r.detalle?.archivo === 'gastos-obra.xlsx' && r.detalle?.filas === 2), importaciones.body.registros?.[0]);
  const deshechas = await call('GET', '/auditoria?accion=DESHACER_IMPORTACION&porPagina=20', { token: A });
  check('deshacer importación auditado', deshechas.body.registros.some((r: any) => r.registroId === String(impP.body.id) && r.detalle?.gastosEliminados === 2));
  const todo = await call('GET', '/auditoria?porPagina=200', { token: A });
  check('ningún registro guarda contraseñas', !JSON.stringify(todo.body).includes('Clave12345') && !JSON.stringify(todo.body).includes(ADMIN_PASSWORD));
  check('las rutas se guardan como plantilla (/x/:id)', todo.body.registros.filter((r: any) => r.ruta).every((r: any) => !/\/\d+(\/|$)/.test(r.ruta)));
  // Bloqueo por cuenta: tras LOGIN_BLOQUEO_INTENTOS fallos seguidos, el correo queda bloqueado (aunque no exista)
  const correoBloqueo = `bloqueo.${sufijo}@ejemplo.com`;
  const intentos: number[] = [];
  for (let i = 0; i < 5; i++) intentos.push((await call('POST', '/auth/login', { json: { email: correoBloqueo, password: 'incorrecta' } })).status);
  check('5 intentos fallidos -> 401', intentos.every((c) => c === 401), intentos);
  expectStatus('6.º intento con la cuenta bloqueada', await call('POST', '/auth/login', { json: { email: correoBloqueo, password: 'incorrecta' } }), 429);
  await new Promise((r) => setTimeout(r, 300));
  const bloqueos = await call('GET', `/auditoria?accion=LOGIN_BLOQUEADO&porPagina=20`, { token: A });
  check('bloqueo registrado', bloqueos.body.registros.some((r: any) => r.correo === correoBloqueo));
  const alertasSeg = await call('GET', '/auditoria/alertas', { token: A });
  check('GET /auditoria/alertas', alertasSeg.status === 200 && alertasSeg.body.loginsFallidos >= 5 && alertasSeg.body.bloqueos >= 1, alertasSeg.body);
  const accesos = await call('GET', '/auditoria/ultimos-accesos', { token: A });
  check('GET /auditoria/ultimos-accesos incluye al usuario de prueba', accesos.status === 200 && accesos.body.some((a: any) => a.usuarioId === usuarioId));
  const csv = await fetch(`${API}/auditoria/exportar?accion=LOGIN_OK`, { headers: { Authorization: `Bearer ${A}` } });
  check('GET /auditoria/exportar devuelve CSV', csv.status === 200 && (csv.headers.get('content-type') ?? '').includes('text/csv'));

  seccion('Varios');
  expectStatus('ruta inexistente', await call('GET', '/no-existe', { token: A }), 404);
  const malJson = await fetch(`${API}/proyectos`, { method: 'POST', headers: { Authorization: `Bearer ${A}`, 'Content-Type': 'application/json' }, body: '{malo' });
  check('JSON mal formado -> 400', malJson.status === 400);

  seccion('Limpieza');
  expectStatus('DELETE /proyectos/:id/usuarios/:usuarioId', await call('DELETE', `/proyectos/${P}/usuarios/${usuarioId}`, { token: A }), 204);
  expectStatus('USUARIO desasignado pierde acceso', await call('GET', `/proyectos/${P}`, { token: U }), 403);
  expectStatus('DELETE /actividades/:id', await call('DELETE', `/actividades/${ACT}`, { token: A }), 204);
  expectStatus('DELETE /sprints/:id', await call('DELETE', `/sprints/${S}`, { token: A }), 204);
  expectStatus('DELETE /gastos/:id', await call('DELETE', `/gastos/${gasto.body.id}`, { token: A }), 204);
  expectStatus('USUARIO DELETE /proyectos/:id', await call('DELETE', `/proyectos/${P}`, { token: U }), 403);
  expectStatus('DELETE /proyectos/:id (cascade)', await call('DELETE', `/proyectos/${P}`, { token: A }), 204);
  expectStatus('GET proyecto eliminado', await call('GET', `/proyectos/${P}`, { token: A }), 404);
  expectStatus('DELETE /clientes/:id sin proyectos', await call('DELETE', `/clientes/${C}`, { token: A }), 204);
  expectStatus('PUT /trabajadores/:id (desactivar)', await call('PUT', `/trabajadores/${T}`, { token: A, json: { activo: false } }), 200);
  expectStatus('DELETE /usuarios/:id (baja lógica)', await call('DELETE', `/usuarios/${usuarioId}`, { token: A }), 204);
  expectStatus('usuario desactivado no puede loguearse', await call('POST', '/auth/login', { json: { email: emailU, password: 'Clave12345' } }), 401);

  console.log(`\n${fallos.length ? '❌' : '✅'} ${pasadas} pruebas OK, ${fallos.length} fallidas`);
  if (fallos.length) {
    fallos.forEach((f) => console.log(`   - ${f}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error ejecutando las pruebas:', e);
  process.exit(1);
});
