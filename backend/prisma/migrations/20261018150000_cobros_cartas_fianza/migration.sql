-- Cobros al cliente (programado, facturado, cobrado) y cartas fianza. No modifica datos existentes.

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('PROGRAMADO', 'FACTURADO', 'COBRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('FIEL_CUMPLIMIENTO', 'ADELANTO', 'OTRA');

-- CreateEnum
CREATE TYPE "EstadoGarantia" AS ENUM ('VIGENTE', 'RENOVADA', 'DEVUELTA', 'EJECUTADA');

-- CreateTable
CREATE TABLE "Cobro" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "detraccion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penalidad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaProgramada" DATE,
    "comprobante" TEXT,
    "fechaEmision" DATE,
    "fechaCobro" DATE,
    "estado" "EstadoCobro" NOT NULL DEFAULT 'PROGRAMADO',
    "observacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartaFianza" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "tipo" "TipoGarantia" NOT NULL DEFAULT 'FIEL_CUMPLIMIENTO',
    "numero" TEXT NOT NULL,
    "entidadFinanciera" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fechaEmision" DATE NOT NULL,
    "fechaVencimiento" DATE NOT NULL,
    "estado" "EstadoGarantia" NOT NULL DEFAULT 'VIGENTE',
    "observacion" TEXT,
    "renovadaDeId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartaFianza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cobro_proyectoId_idx" ON "Cobro"("proyectoId");

-- CreateIndex
CREATE INDEX "Cobro_estado_fechaProgramada_idx" ON "Cobro"("estado", "fechaProgramada");

-- CreateIndex
CREATE UNIQUE INDEX "CartaFianza_renovadaDeId_key" ON "CartaFianza"("renovadaDeId");

-- CreateIndex
CREATE INDEX "CartaFianza_proyectoId_idx" ON "CartaFianza"("proyectoId");

-- CreateIndex
CREATE INDEX "CartaFianza_estado_fechaVencimiento_idx" ON "CartaFianza"("estado", "fechaVencimiento");

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartaFianza" ADD CONSTRAINT "CartaFianza_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartaFianza" ADD CONSTRAINT "CartaFianza_renovadaDeId_fkey" FOREIGN KEY ("renovadaDeId") REFERENCES "CartaFianza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

