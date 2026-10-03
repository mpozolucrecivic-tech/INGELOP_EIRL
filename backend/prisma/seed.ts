/**
 * Seed inicial: usuario ADMIN + datos de prueba de una consultora de diseño
 * (clientes, expedientes técnicos, planos con revisiones, presupuestos, entregables y equipo técnico).
 * Es idempotente para los usuarios (upsert) y recrea los datos de demo en cada ejecución.
 * Ejecutar: npm run db:seed
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  CategoriaGasto,
  Especialidad,
  EstadoActividad,
  EstadoProyecto,
  EstadoRevision,
  PrismaClient,
  Rol,
  RubroObra,
  TipoCliente,
  TipoEvidencia,
  TipoServicio,
} from '@prisma/client';
import { cargarServiciosIniciales } from '../src/data/serviciosIniciales';
import { cargarClaves as cargarDatosSitio } from '../src/modules/sitio/sitio.service';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@ingelop.com';
// Las contraseñas de los usuarios de demostración se leen de .env: nunca se escriben en el código
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '';
const USUARIO_PASSWORD = process.env.SEED_USUARIO_PASSWORD ?? '';
const UPLOAD_PATH = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** PDF mínimo de una página con el rótulo del plano (para que las descargas funcionen en la demo) */
function crearPdfDemo(proyectoId: number, nombreArchivo: string, rotulo: string) {
  const texto = rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, '');
  const contenido = `BT /F1 28 Tf 60 500 Td (${texto}) Tj ET BT /F1 14 Tf 60 460 Td (INGELOP - archivo de demostracion) Tj ET`;
  const pdf = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 842 595]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length ${contenido.length}>>stream`,
    contenido,
    'endstream endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%EOF',
  ].join('\n');
  const rel = `proyectos/${proyectoId}/planos/${nombreArchivo}`;
  fs.mkdirSync(path.join(UPLOAD_PATH, 'proyectos', String(proyectoId), 'planos'), { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_PATH, rel), pdf);
  return { archivoUrl: rel, tamano: Buffer.byteLength(pdf) };
}

async function main() {
  // El seed BORRA los datos de negocio y carga datos de demostración: nunca en producción
  if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_SEED !== 'si') {
    console.error('❌ El seed de demostración está bloqueado en producción (borraría los datos reales).');
    console.error('   Para crear el administrador usa: node dist/scripts/crearAdmin.js');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 8 || USUARIO_PASSWORD.length < 8) {
    console.error('❌ Define SEED_ADMIN_PASSWORD y SEED_USUARIO_PASSWORD en backend/.env (mínimo 8 caracteres).');
    process.exit(1);
  }
  console.log('🌱 Ejecutando seed...');

  // ---------- Servicios de la web (no se borran: se crean solo los que falten) ----------
  console.log(`   Servicios de la web creados: ${await cargarServiciosIniciales(prisma)}`);
  console.log(`   Datos de contacto de la web creados (vacíos y ocultos): ${await cargarDatosSitio()}`);

  // ---------- Usuarios ----------
  const admin = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { nombre: 'Administrador INGELOP', email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10), rol: Rol.ADMIN },
  });
  const residente = await prisma.usuario.upsert({
    where: { email: 'residente@ingelop.com' },
    update: { nombre: 'Arq. Carlos Rivera' },
    create: { nombre: 'Arq. Carlos Rivera', email: 'residente@ingelop.com', passwordHash: await bcrypt.hash(USUARIO_PASSWORD, 10), rol: Rol.USUARIO },
  });
  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisor@ingelop.com' },
    update: { nombre: 'Ing. María Torres' },
    create: { nombre: 'Ing. María Torres', email: 'supervisor@ingelop.com', passwordHash: await bcrypt.hash(USUARIO_PASSWORD, 10), rol: Rol.USUARIO },
  });

  // ---------- Limpieza de datos de demo (los usuarios se conservan) ----------
  await prisma.$transaction([
    prisma.evidencia.deleteMany(),
    prisma.registroHoras.deleteMany(),
    prisma.asignacion.deleteMany(),
    prisma.movimientoMaterial.deleteMany(),
    prisma.material.deleteMany(),
    prisma.gasto.deleteMany(),
    prisma.actividad.deleteMany(),
    prisma.sprint.deleteMany(),
    prisma.planoVersion.deleteMany(),
    prisma.plano.deleteMany(),
    prisma.partidaPresupuesto.deleteMany(),
    prisma.presupuesto.deleteMany(),
    prisma.entregable.deleteMany(),
    prisma.usuarioProyecto.deleteMany(),
    prisma.proyecto.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.trabajador.deleteMany(),
  ]);
  fs.rmSync(path.join(UPLOAD_PATH, 'proyectos'), { recursive: true, force: true });

  // ---------- Clientes (datos ficticios) ----------
  const municipalidad = await prisma.cliente.create({
    data: {
      tipo: TipoCliente.ENTIDAD_PUBLICA,
      nombre: 'Municipalidad Distrital de La Victoria',
      documento: '20601234567',
      contacto: 'Gerencia de Desarrollo Urbano e Infraestructura',
      telefono: '074 000 000',
      email: 'infraestructura@munidemo.gob.pe',
      direccion: 'La Victoria, Chiclayo, Lambayeque',
    },
  });
  const gobRegional = await prisma.cliente.create({
    data: {
      tipo: TipoCliente.ENTIDAD_PUBLICA,
      nombre: 'Gobierno Regional de Lambayeque',
      documento: '20609876543',
      contacto: 'Sub Gerencia de Obras',
      email: 'obras@regiondemo.gob.pe',
    },
  });
  const inmobiliaria = await prisma.cliente.create({
    data: {
      tipo: TipoCliente.EMPRESA,
      nombre: 'Inmobiliaria Los Parques del Norte S.A.C.',
      documento: '20612345678',
      contacto: 'Gerencia general',
      telefono: '987 654 321',
      email: 'gerencia@losparquesdemo.pe',
      direccion: 'Chiclayo, Lambayeque',
    },
  });
  const muniPimentel = await prisma.cliente.create({
    data: {
      tipo: TipoCliente.ENTIDAD_PUBLICA,
      nombre: 'Municipalidad Distrital de Pimentel',
      documento: '20605555551',
      contacto: 'Sub Gerencia de Obras Públicas',
      direccion: 'Pimentel, Chiclayo, Lambayeque',
    },
  });
  await prisma.cliente.create({
    data: { tipo: TipoCliente.PERSONA, nombre: 'Jorge Quispe Mendoza', documento: '45678912', telefono: '956 111 222', direccion: 'Lambayeque' },
  });

  // ---------- Proyectos ----------
  const expediente = await prisma.proyecto.create({
    data: {
      nombre: 'Expediente técnico: Mejoramiento de la I.E. N° 10125',
      clienteId: municipalidad.id,
      tipoServicio: TipoServicio.EXPEDIENTE_TECNICO,
      rubro: RubroObra.EDIFICACIONES,
      ubicacion: 'La Victoria, Chiclayo',
      fechaInicio: d('2026-07-01'),
      fechaFin: d('2026-12-20'),
      montoContrato: 185000,
      estado: EstadoProyecto.EN_EJECUCION,
      responsableId: admin.id,
      usuarios: { create: [{ usuarioId: residente.id }] },
    },
  });
  const vivienda = await prisma.proyecto.create({
    data: {
      nombre: 'Diseño de vivienda multifamiliar de 5 pisos',
      clienteId: inmobiliaria.id,
      tipoServicio: TipoServicio.DISENO_ARQUITECTONICO,
      rubro: RubroObra.EDIFICACIONES,
      ubicacion: 'Urb. Santa Victoria, Chiclayo',
      fechaInicio: d('2026-08-15'),
      fechaFin: d('2026-11-30'),
      montoContrato: 48000,
      estado: EstadoProyecto.EN_EJECUCION,
      responsableId: admin.id,
      usuarios: { create: [{ usuarioId: supervisor.id }] },
    },
  });
  const supervision = await prisma.proyecto.create({
    data: {
      nombre: 'Supervisión de obra: Mejoramiento de pistas y veredas',
      clienteId: gobRegional.id,
      tipoServicio: TipoServicio.SUPERVISION,
      rubro: RubroObra.VIALES,
      ubicacion: 'José Leonardo Ortiz, Chiclayo',
      fechaInicio: d('2026-10-01'),
      fechaFin: d('2027-03-31'),
      montoContrato: 96000,
      estado: EstadoProyecto.PLANIFICADA,
      responsableId: admin.id,
    },
  });

  await prisma.proyecto.create({
    data: {
      nombre: 'Expediente técnico: Ampliación de redes de agua potable y alcantarillado',
      clienteId: muniPimentel.id,
      tipoServicio: TipoServicio.EXPEDIENTE_TECNICO,
      rubro: RubroObra.SANEAMIENTO,
      ubicacion: 'Pimentel, Chiclayo',
      fechaInicio: d('2026-11-02'),
      fechaFin: d('2027-04-30'),
      montoContrato: 142000,
      estado: EstadoProyecto.PLANIFICADA,
      responsableId: admin.id,
    },
  });

  // ---------- Sprints y actividades de diseño ----------
  const sprintsExp = [];
  for (const [i, s] of [
    ['2026-07-01', '2026-07-31', 'Levantamiento de información y estudios básicos'],
    ['2026-08-01', '2026-08-31', 'Anteproyecto arquitectónico'],
    ['2026-09-01', '2026-10-15', 'Proyecto de especialidades'],
    ['2026-10-16', '2026-11-30', 'Metrados, costos y presupuesto'],
  ].entries()) {
    sprintsExp.push(
      await prisma.sprint.create({ data: { proyectoId: expediente.id, numero: i + 1, fechaInicio: d(s[0]), fechaFin: d(s[1]), objetivo: s[2] } }),
    );
  }
  const A = (sprint: number, nombre: string, responsableId: number, estado: EstadoActividad, avance: number) => ({
    sprintId: sprintsExp[sprint].id,
    nombre,
    responsableId,
    estado,
    avance,
  });
  await prisma.actividad.createMany({
    data: [
      A(0, 'Levantamiento topográfico del terreno', residente.id, EstadoActividad.COMPLETADA, 100),
      A(0, 'Estudio de mecánica de suelos', admin.id, EstadoActividad.COMPLETADA, 100),
      A(0, 'Diagnóstico de la infraestructura existente', residente.id, EstadoActividad.COMPLETADA, 100),
      A(1, 'Programa arquitectónico y zonificación', residente.id, EstadoActividad.COMPLETADA, 100),
      A(1, 'Anteproyecto: plantas, cortes y elevaciones', residente.id, EstadoActividad.COMPLETADA, 100),
      A(2, 'Diseño estructural: cimentación y pórticos', admin.id, EstadoActividad.EN_PROCESO, 65),
      A(2, 'Levantar observaciones de arquitectura (cortes)', residente.id, EstadoActividad.EN_REVISION, 90),
      A(2, 'Diseño de instalaciones sanitarias', residente.id, EstadoActividad.EN_PROCESO, 40),
      A(2, 'Diseño de instalaciones eléctricas', admin.id, EstadoActividad.POR_HACER, 0),
      A(3, 'Planilla de metrados por especialidad', residente.id, EstadoActividad.BACKLOG, 0),
      A(3, 'Análisis de costos unitarios y presupuesto', admin.id, EstadoActividad.BACKLOG, 0),
    ],
  });
  const sprintViv = await prisma.sprint.create({
    data: { proyectoId: vivienda.id, numero: 1, fechaInicio: d('2026-08-15'), fechaFin: d('2026-09-30'), objetivo: 'Anteproyecto y licencia' },
  });
  await prisma.actividad.createMany({
    data: [
      { sprintId: sprintViv.id, nombre: 'Distribución de departamentos tipo', responsableId: supervisor.id, estado: EstadoActividad.EN_REVISION, avance: 85 },
      { sprintId: sprintViv.id, nombre: 'Expediente para licencia de edificación', responsableId: supervisor.id, estado: EstadoActividad.EN_PROCESO, avance: 30 },
    ],
  });

  // ---------- Planos con revisiones ----------
  type VersionDemo = { fecha: string; comentario?: string; usuarioId: number };
  const planosDemo: {
    proyectoId: number;
    codigo: string;
    titulo: string;
    especialidad: Especialidad;
    estado: EstadoRevision;
    responsableId: number;
    observacion?: string;
    versiones: VersionDemo[];
  }[] = [
    { proyectoId: expediente.id, codigo: 'A-01', titulo: 'Plano de ubicación y localización', especialidad: Especialidad.ARQUITECTURA, estado: EstadoRevision.APROBADO, responsableId: residente.id, versiones: [{ fecha: '2026-08-12', usuarioId: residente.id }, { fecha: '2026-08-20', comentario: 'Se corrigió el cuadro de áreas', usuarioId: residente.id }] },
    { proyectoId: expediente.id, codigo: 'A-02', titulo: 'Plantas de distribución – 1er y 2do nivel', especialidad: Especialidad.ARQUITECTURA, estado: EstadoRevision.APROBADO, responsableId: residente.id, versiones: [{ fecha: '2026-08-25', usuarioId: residente.id }] },
    { proyectoId: expediente.id, codigo: 'A-03', titulo: 'Cortes y elevaciones', especialidad: Especialidad.ARQUITECTURA, estado: EstadoRevision.OBSERVADO, responsableId: residente.id, observacion: 'Falta indicar el nivel de piso terminado en el corte B-B y la altura de parapetos.', versiones: [{ fecha: '2026-09-10', usuarioId: residente.id }] },
    { proyectoId: expediente.id, codigo: 'E-01', titulo: 'Cimentación', especialidad: Especialidad.ESTRUCTURAS, estado: EstadoRevision.EN_REVISION, responsableId: admin.id, versiones: [{ fecha: '2026-09-15', usuarioId: admin.id }, { fecha: '2026-09-19', comentario: 'Se ajustó el peralte de vigas de cimentación', usuarioId: admin.id }] },
    { proyectoId: expediente.id, codigo: 'E-02', titulo: 'Aligerados y vigas', especialidad: Especialidad.ESTRUCTURAS, estado: EstadoRevision.BORRADOR, responsableId: admin.id, versiones: [] },
    { proyectoId: expediente.id, codigo: 'IS-01', titulo: 'Instalaciones sanitarias – agua fría', especialidad: Especialidad.INSTALACIONES_SANITARIAS, estado: EstadoRevision.EN_REVISION, responsableId: residente.id, versiones: [{ fecha: '2026-09-18', usuarioId: residente.id }] },
    { proyectoId: expediente.id, codigo: 'IE-01', titulo: 'Instalaciones eléctricas – alumbrado y tomacorrientes', especialidad: Especialidad.INSTALACIONES_ELECTRICAS, estado: EstadoRevision.BORRADOR, responsableId: admin.id, versiones: [] },
    { proyectoId: vivienda.id, codigo: 'A-01', titulo: 'Planta típica de departamentos', especialidad: Especialidad.ARQUITECTURA, estado: EstadoRevision.EN_REVISION, responsableId: supervisor.id, versiones: [{ fecha: '2026-09-05', usuarioId: supervisor.id }] },
    { proyectoId: vivienda.id, codigo: 'A-02', titulo: 'Elevación principal', especialidad: Especialidad.ARQUITECTURA, estado: EstadoRevision.BORRADOR, responsableId: supervisor.id, versiones: [] },
  ];
  for (const p of planosDemo) {
    const { versiones, ...datos } = p;
    const plano = await prisma.plano.create({ data: datos });
    for (const [i, v] of versiones.entries()) {
      const letra = String.fromCharCode(65 + i);
      const archivo = crearPdfDemo(p.proyectoId, `${p.codigo}_Rev${letra}_demo.pdf`, `${p.codigo} ${p.titulo} - Rev. ${letra}`);
      await prisma.planoVersion.create({
        data: {
          planoId: plano.id,
          revision: i + 1,
          nombreArchivo: `${p.codigo}_Rev${letra}.pdf`,
          comentario: v.comentario,
          usuarioId: v.usuarioId,
          fecha: d(v.fecha),
          ...archivo,
        },
      });
    }
  }

  // ---------- Presupuestos ----------
  type P = [string, string, string?, number?, number?];
  const T = (item: string, descripcion: string): P => [item, descripcion];
  const partidasObra: P[] = [
    T('01', 'OBRAS PROVISIONALES'),
    ['01.01', 'Cartel de identificación de obra 3.60 x 2.40 m', 'und', 1, 1850],
    ['01.02', 'Almacén, oficina y caseta de guardianía', 'glb', 1, 6500],
    ['01.03', 'Movilización y desmovilización de equipos', 'glb', 1, 4800],
    T('02', 'TRABAJOS PRELIMINARES'),
    ['02.01', 'Limpieza de terreno manual', 'm2', 620, 2.1],
    ['02.02', 'Trazo, nivelación y replanteo', 'm2', 620, 3.45],
    T('03', 'MOVIMIENTO DE TIERRAS'),
    ['03.01', 'Excavación de zanjas para cimientos', 'm3', 148.5, 38.6],
    ['03.02', 'Relleno compactado con material propio', 'm3', 62.3, 29.9],
    ['03.03', 'Eliminación de material excedente', 'm3', 107.4, 32.5],
    T('04', 'CONCRETO SIMPLE'),
    ['04.01', 'Cimientos corridos mezcla 1:10 + 30% PG', 'm3', 86.4, 265.4],
    ['04.02', 'Sobrecimientos mezcla 1:8 + 25% PM', 'm3', 18.2, 298.7],
    T('05', 'CONCRETO ARMADO'),
    T('05.01', 'ZAPATAS'),
    ["05.01.01", "Concreto f'c = 210 kg/cm2", 'm3', 42.6, 412.3],
    ['05.01.02', 'Acero de refuerzo fy = 4200 kg/cm2', 'kg', 2980, 5.85],
    T('05.02', 'COLUMNAS'),
    ["05.02.01", "Concreto f'c = 210 kg/cm2", 'm3', 28.4, 438.9],
    ['05.02.02', 'Encofrado y desencofrado normal', 'm2', 312, 52.4],
    ['05.02.03', 'Acero de refuerzo fy = 4200 kg/cm2', 'kg', 4260, 5.85],
    T('06', 'MUROS Y TABIQUES DE ALBAÑILERÍA'),
    ['06.01', 'Muro de ladrillo KK de soga, mortero 1:4', 'm2', 540, 68.2],
    T('07', 'REVOQUES Y ENLUCIDOS'),
    ['07.01', 'Tarrajeo de muros interiores, mortero 1:5', 'm2', 980, 24.6],
  ];
  const aPartidas = (lista: P[]) =>
    lista.map(([item, descripcion, unidad, metrado, precioUnitario], orden) => ({
      orden,
      item,
      descripcion,
      esTitulo: unidad === undefined,
      unidad: unidad ?? null,
      metrado: metrado ?? null,
      precioUnitario: precioUnitario ?? null,
    }));
  await prisma.presupuesto.create({
    data: {
      proyectoId: expediente.id,
      nombre: 'Presupuesto de obra – Mejoramiento I.E. N° 10125',
      version: 1,
      fecha: d('2026-09-12'),
      estado: EstadoRevision.OBSERVADO,
      observaciones: 'Versión inicial enviada a la municipalidad.',
      partidas: { create: aPartidas(partidasObra) },
    },
  });
  await prisma.presupuesto.create({
    data: {
      proyectoId: expediente.id,
      nombre: 'Presupuesto de obra – Mejoramiento I.E. N° 10125',
      version: 2,
      fecha: d('2026-09-19'),
      estado: EstadoRevision.EN_REVISION,
      observaciones: 'Se actualizaron precios de concreto y acero según cotización de setiembre.',
      partidas: {
        create: aPartidas(
          partidasObra.map((p) => (p[0].startsWith('05.') && p[3] !== undefined ? ([p[0], p[1], p[2], p[3], round(p[4]! * 1.04)] as P) : p)),
        ),
      },
    },
  });
  await prisma.presupuesto.create({
    data: {
      proyectoId: vivienda.id,
      nombre: 'Presupuesto referencial – Vivienda multifamiliar',
      fecha: d('2026-09-08'),
      estado: EstadoRevision.BORRADOR,
      partidas: {
        create: aPartidas([
          T('01', 'ESTRUCTURAS'),
          ['01.01', 'Concreto armado en elementos estructurales (global)', 'm3', 310, 980],
          T('02', 'ARQUITECTURA'),
          ['02.01', 'Muros, revoques y pisos (global por m2 techado)', 'm2', 1250, 385],
          T('03', 'INSTALACIONES'),
          ['03.01', 'Instalaciones sanitarias y eléctricas (global por m2 techado)', 'm2', 1250, 120],
        ]),
      },
    },
  });

  // ---------- Entregables del expediente ----------
  const entregablesDemo: [string, EstadoRevision, string | null, number | null][] = [
    ['Memoria descriptiva', EstadoRevision.APROBADO, '2026-08-15', residente.id],
    ['Estudio topográfico', EstadoRevision.APROBADO, '2026-07-31', residente.id],
    ['Estudio de mecánica de suelos', EstadoRevision.APROBADO, '2026-08-05', admin.id],
    ['Planos de arquitectura', EstadoRevision.OBSERVADO, '2026-09-15', residente.id],
    ['Planos de estructuras', EstadoRevision.EN_REVISION, '2026-10-05', admin.id],
    ['Planos de instalaciones sanitarias', EstadoRevision.BORRADOR, '2026-10-10', residente.id],
    ['Planos de instalaciones eléctricas', EstadoRevision.BORRADOR, '2026-10-10', admin.id],
    ['Especificaciones técnicas', EstadoRevision.BORRADOR, '2026-11-05', residente.id],
    ['Planilla de metrados', EstadoRevision.BORRADOR, '2026-11-10', residente.id],
    ['Análisis de costos unitarios', EstadoRevision.BORRADOR, '2026-11-20', admin.id],
    ['Presupuesto de obra', EstadoRevision.EN_REVISION, '2026-11-25', admin.id],
    ['Fórmula polinómica', EstadoRevision.BORRADOR, '2026-11-25', admin.id],
    ['Cronograma de ejecución de obra', EstadoRevision.BORRADOR, '2026-11-30', admin.id],
    ['Panel fotográfico', EstadoRevision.BORRADOR, '2026-12-10', residente.id],
  ];
  await prisma.entregable.createMany({
    data: entregablesDemo.map(([nombre, estado, limite, responsableId], orden) => ({
      proyectoId: expediente.id,
      orden,
      nombre,
      estado,
      fechaLimite: limite ? d(limite) : null,
      fechaEntrega: estado === EstadoRevision.APROBADO && limite ? d(limite) : null,
      responsableId,
    })),
  });
  await prisma.entregable.createMany({
    data: [
      { proyectoId: vivienda.id, orden: 0, nombre: 'Anteproyecto arquitectónico', estado: EstadoRevision.EN_REVISION, fechaLimite: d('2026-09-30'), responsableId: supervisor.id },
      { proyectoId: vivienda.id, orden: 1, nombre: 'Expediente de licencia de edificación', estado: EstadoRevision.BORRADOR, fechaLimite: d('2026-10-31'), responsableId: supervisor.id },
    ],
  });

  // ---------- Equipo técnico y horas ----------
  const equipo = await Promise.all(
    [
      { dni: '41234567', nombre: 'Arq. Lucía Paredes Salas', cargo: 'Arquitecta proyectista', costoHora: 45 },
      { dni: '42345678', nombre: 'Ing. Miguel Huamán Rojas', cargo: 'Ingeniero estructural', costoHora: 55 },
      { dni: '43456789', nombre: 'Ing. Rosa Vilca Condori', cargo: 'Ingeniera sanitaria', costoHora: 48 },
      { dni: '44567890', nombre: 'Ing. Jorge Ramírez Tello', cargo: 'Ingeniero electricista', costoHora: 48 },
      { dni: '45678901', nombre: 'Ing. Ana Castillo Ríos', cargo: 'Especialista en costos y presupuestos', costoHora: 50 },
      { dni: '72345678', nombre: 'Kevin Ccori Mamani', cargo: 'Dibujante CAD / BIM', costoHora: 18 },
    ].map((t) => prisma.trabajador.create({ data: t })),
  );
  const [lucia, miguel, rosa, jorge, ana, kevin] = equipo;
  for (const t of equipo) {
    await prisma.asignacion.create({ data: { trabajadorId: t.id, proyectoId: expediente.id, fechaInicio: d('2026-07-01') } });
  }
  for (const t of [lucia, miguel, kevin]) {
    await prisma.asignacion.create({ data: { trabajadorId: t.id, proyectoId: vivienda.id, fechaInicio: d('2026-08-15') } });
  }

  const tareas: Record<number, string[]> = {
    [lucia.id]: ['Levantamiento de observaciones de arquitectura', 'Detalles de escaleras y baños', 'Reunión con la municipalidad'],
    [miguel.id]: ['Modelado estructural en ETABS', 'Diseño de cimentación', 'Revisión de planos de estructuras'],
    [rosa.id]: ['Cálculo de dotación y red de agua fría', 'Diseño de desagüe y ventilación'],
    [jorge.id]: ['Cálculo de máxima demanda', 'Diagrama unifilar'],
    [ana.id]: ['Metrados de estructuras', 'Actualización de precios unitarios'],
    [kevin.id]: ['Dibujo de plantas y cortes', 'Rotulado y ploteo de láminas', 'Modelado BIM'],
  };
  const dias = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22'];
  const registros = [];
  for (const [i, fecha] of dias.entries()) {
    for (const [j, t] of equipo.entries()) {
      if ((i + j) % 5 === 4) continue; // algunos días sin registro
      const lista = tareas[t.id];
      const enVivienda = [lucia.id, miguel.id, kevin.id].includes(t.id) && (i + j) % 3 === 0;
      registros.push({
        trabajadorId: t.id,
        proyectoId: expediente.id,
        fecha: d(fecha),
        horas: enVivienda ? 5 : 8,
        descripcion: lista[(i + j) % lista.length],
      });
      if (enVivienda) {
        registros.push({ trabajadorId: t.id, proyectoId: vivienda.id, fecha: d(fecha), horas: 3, descripcion: 'Anteproyecto vivienda multifamiliar' });
      }
    }
  }
  await prisma.registroHoras.createMany({ data: registros });

  // ---------- Gastos propios del servicio ----------
  await prisma.gasto.createMany({
    data: [
      { proyectoId: expediente.id, categoria: CategoriaGasto.OTROS, descripcion: 'Estudio de mecánica de suelos (laboratorio externo)', monto: 6800, fecha: d('2026-07-20') },
      { proyectoId: expediente.id, categoria: CategoriaGasto.TRANSPORTE, descripcion: 'Visitas de campo y levantamiento topográfico', monto: 1250, fecha: d('2026-07-10') },
      { proyectoId: expediente.id, categoria: CategoriaGasto.MANO_DE_OBRA, descripcion: 'Honorarios del equipo técnico – julio', monto: 18500, fecha: d('2026-07-31') },
      { proyectoId: expediente.id, categoria: CategoriaGasto.MANO_DE_OBRA, descripcion: 'Honorarios del equipo técnico – agosto', monto: 19800, fecha: d('2026-08-31') },
      { proyectoId: expediente.id, categoria: CategoriaGasto.EQUIPOS, descripcion: 'Licencias AutoCAD / Revit (prorrateo)', monto: 2400, fecha: d('2026-08-05') },
      { proyectoId: expediente.id, categoria: CategoriaGasto.MATERIALES, descripcion: 'Impresión y ploteo de planos A1', monto: 980.5, fecha: d('2026-09-12') },
      { proyectoId: vivienda.id, categoria: CategoriaGasto.MANO_DE_OBRA, descripcion: 'Honorarios del equipo – agosto', monto: 6200, fecha: d('2026-08-31') },
      { proyectoId: vivienda.id, categoria: CategoriaGasto.OTROS, descripcion: 'Trámite de parámetros urbanísticos', monto: 450, fecha: d('2026-08-20') },
      { proyectoId: supervision.id, categoria: CategoriaGasto.OTROS, descripcion: 'Garantía de fiel cumplimiento', monto: 1900, fecha: d('2026-09-15') },
    ],
  });

  // ---------- Documentos y observaciones ----------
  await prisma.evidencia.createMany({
    data: [
      {
        proyectoId: expediente.id,
        tipo: TipoEvidencia.OBSERVACION,
        titulo: 'Reunión de coordinación con la Municipalidad de La Victoria',
        descripcion: 'Se acordó priorizar el bloque de aulas del 2do nivel y presentar el presupuesto actualizado antes del 25/09.',
        usuarioId: admin.id,
        fecha: d('2026-09-16'),
      },
      {
        proyectoId: expediente.id,
        tipo: TipoEvidencia.OBSERVACION,
        titulo: 'Visita de verificación al terreno',
        descripcion: 'Se confirmó la ubicación del buzón de desagüe existente para el diseño sanitario.',
        usuarioId: residente.id,
        fecha: d('2026-09-18'),
      },
    ],
  });

  console.log('✅ Seed completado');
  console.log(`   ADMIN:   ${ADMIN_EMAIL} / (SEED_ADMIN_PASSWORD)`);
  console.log(`   USUARIO: residente@ingelop.com / (SEED_USUARIO_PASSWORD)  -> "${expediente.nombre}"`);
  console.log(`   USUARIO: supervisor@ingelop.com / (SEED_USUARIO_PASSWORD) -> "${vivienda.nombre}"`);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
