-- Gastos de la empresa (sin proyecto), sus categorías e importaciones desde Excel.
-- No modifica datos existentes: todos los gastos actuales conservan su proyecto.
-- AlterEnum


ALTER TYPE "CategoriaGasto" ADD VALUE 'ALQUILER';
ALTER TYPE "CategoriaGasto" ADD VALUE 'SERVICIOS_BASICOS';
ALTER TYPE "CategoriaGasto" ADD VALUE 'SUELDOS';
ALTER TYPE "CategoriaGasto" ADD VALUE 'SOFTWARE';
ALTER TYPE "CategoriaGasto" ADD VALUE 'IMPUESTOS';
ALTER TYPE "CategoriaGasto" ADD VALUE 'UTILES_OFICINA';

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "importacionId" INTEGER,
ALTER COLUMN "proyectoId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ImportacionGasto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER,
    "usuarioId" INTEGER,
    "nombreArchivo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deshechaEn" TIMESTAMP(3),

    CONSTRAINT "ImportacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportacionGasto_proyectoId_creadoEn_idx" ON "ImportacionGasto"("proyectoId", "creadoEn");

-- CreateIndex
CREATE INDEX "Gasto_proyectoId_fecha_idx" ON "Gasto"("proyectoId", "fecha");

-- CreateIndex
CREATE INDEX "Gasto_importacionId_idx" ON "Gasto"("importacionId");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "ImportacionGasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionGasto" ADD CONSTRAINT "ImportacionGasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionGasto" ADD CONSTRAINT "ImportacionGasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

