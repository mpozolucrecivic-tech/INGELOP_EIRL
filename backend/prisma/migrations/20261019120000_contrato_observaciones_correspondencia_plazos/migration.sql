-- Contrato: observaciones de la entidad, correspondencia (cartas y oficios) y ampliaciones de plazo.
-- No modifica datos existentes.

-- CreateEnum
CREATE TYPE "EstadoObservacion" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'LEVANTADA', 'NO_PROCEDE');

-- CreateEnum
CREATE TYPE "TipoCorrespondencia" AS ENUM ('ENVIADA', 'RECIBIDA');

-- CreateEnum
CREATE TYPE "EstadoAmpliacion" AS ENUM ('SOLICITADA', 'APROBADA', 'DENEGADA');

-- CreateTable
CREATE TABLE "ObservacionEntidad" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "documento" TEXT NOT NULL,
    "fechaRecepcion" DATE NOT NULL,
    "fechaLimite" DATE,
    "descripcion" TEXT NOT NULL,
    "etapaId" INTEGER,
    "responsableId" INTEGER,
    "estado" "EstadoObservacion" NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,
    "fechaRespuesta" DATE,
    "correspondenciaId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservacionEntidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correspondencia" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "tipo" "TipoCorrespondencia" NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "asunto" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "referencia" TEXT,
    "respondeAId" INTEGER,
    "ruta" TEXT,
    "nombreArchivo" TEXT,
    "tamano" INTEGER,
    "tipoArchivo" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correspondencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmpliacionPlazo" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "diasSolicitados" INTEGER NOT NULL,
    "fechaSolicitud" DATE NOT NULL,
    "estado" "EstadoAmpliacion" NOT NULL DEFAULT 'SOLICITADA',
    "diasAprobados" INTEGER,
    "fechaResolucion" DATE,
    "documentoResolucion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmpliacionPlazo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObservacionEntidad_estado_fechaLimite_idx" ON "ObservacionEntidad"("estado", "fechaLimite");

-- CreateIndex
CREATE UNIQUE INDEX "ObservacionEntidad_proyectoId_numero_key" ON "ObservacionEntidad"("proyectoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Correspondencia_ruta_key" ON "Correspondencia"("ruta");

-- CreateIndex
CREATE INDEX "Correspondencia_proyectoId_fecha_idx" ON "Correspondencia"("proyectoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "AmpliacionPlazo_proyectoId_numero_key" ON "AmpliacionPlazo"("proyectoId", "numero");

-- AddForeignKey
ALTER TABLE "ObservacionEntidad" ADD CONSTRAINT "ObservacionEntidad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionEntidad" ADD CONSTRAINT "ObservacionEntidad_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionEntidad" ADD CONSTRAINT "ObservacionEntidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionEntidad" ADD CONSTRAINT "ObservacionEntidad_correspondenciaId_fkey" FOREIGN KEY ("correspondenciaId") REFERENCES "Correspondencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondencia" ADD CONSTRAINT "Correspondencia_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondencia" ADD CONSTRAINT "Correspondencia_respondeAId_fkey" FOREIGN KEY ("respondeAId") REFERENCES "Correspondencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondencia" ADD CONSTRAINT "Correspondencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmpliacionPlazo" ADD CONSTRAINT "AmpliacionPlazo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

