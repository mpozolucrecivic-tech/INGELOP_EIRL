-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('ENTIDAD_PUBLICA', 'EMPRESA', 'PERSONA');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('EXPEDIENTE_TECNICO', 'DISENO_ARQUITECTONICO', 'DISENO_ESTRUCTURAL', 'SUPERVISION', 'CONSULTORIA', 'OTRO');

-- CreateEnum
CREATE TYPE "Especialidad" AS ENUM ('ARQUITECTURA', 'ESTRUCTURAS', 'INSTALACIONES_SANITARIAS', 'INSTALACIONES_ELECTRICAS', 'INSTALACIONES_MECANICAS', 'TOPOGRAFIA', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoRevision" AS ENUM ('BORRADOR', 'EN_REVISION', 'OBSERVADO', 'APROBADO');



-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'EMPRESA',
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroHoras" (
    "id" SERIAL NOT NULL,
    "trabajadorId" INTEGER NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "horas" DECIMAL(4,1) NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plano" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "especialidad" "Especialidad" NOT NULL,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "responsableId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoVersion" (
    "id" SERIAL NOT NULL,
    "planoId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "comentario" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'BORRADOR',
    "gastosGeneralesPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "utilidadPct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "igvPct" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPresupuesto" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "esTitulo" BOOLEAN NOT NULL DEFAULT false,
    "unidad" TEXT,
    "metrado" DECIMAL(14,2),
    "precioUnitario" DECIMAL(12,2),

    CONSTRAINT "PartidaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entregable" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'BORRADOR',
    "fechaLimite" DATE,
    "fechaEntrega" DATE,
    "responsableId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entregable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_documento_key" ON "Cliente"("documento");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoId_fecha_idx" ON "RegistroHoras"("proyectoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Plano_proyectoId_codigo_key" ON "Plano"("proyectoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoVersion_planoId_revision_key" ON "PlanoVersion"("planoId", "revision");

-- CreateIndex
CREATE INDEX "PartidaPresupuesto_presupuestoId_orden_idx" ON "PartidaPresupuesto"("presupuestoId", "orden");

-- ===== Migración de datos existentes (escrita a mano) =====

-- Proyecto.presupuesto pasa a ser el monto del contrato (honorarios)
ALTER TABLE "Proyecto" RENAME COLUMN "presupuesto" TO "montoContrato";
ALTER TABLE "Proyecto" ADD COLUMN "tipoServicio" "TipoServicio" NOT NULL DEFAULT 'EXPEDIENTE_TECNICO';

-- Proyecto.cliente (texto) -> tabla Cliente
ALTER TABLE "Proyecto" ADD COLUMN "clienteId" INTEGER;
INSERT INTO "Cliente" ("nombre") SELECT DISTINCT "cliente" FROM "Proyecto";
UPDATE "Proyecto" p SET "clienteId" = c."id" FROM "Cliente" c WHERE c."nombre" = p."cliente";
ALTER TABLE "Proyecto" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "Proyecto" DROP COLUMN "cliente";

-- Asistencia de obra -> registros de horas (solo días con asistencia)
INSERT INTO "RegistroHoras" ("trabajadorId", "proyectoId", "fecha", "horas", "descripcion")
SELECT "trabajadorId", "proyectoId", "fecha", "horas", 'Migrado desde asistencia'
FROM "Asistencia" WHERE "presente" = true AND "horas" > 0;
DROP TABLE "Asistencia";

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plano" ADD CONSTRAINT "Plano_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plano" ADD CONSTRAINT "Plano_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoVersion" ADD CONSTRAINT "PlanoVersion_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoVersion" ADD CONSTRAINT "PlanoVersion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuesto" ADD CONSTRAINT "PartidaPresupuesto_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

