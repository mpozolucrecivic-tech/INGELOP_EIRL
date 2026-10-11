-- CreateEnum
CREATE TYPE "TipoEtapa" AS ENUM ('PREINVERSION', 'EXPEDIENTE_TECNICO', 'SUPERVISION', 'LIQUIDACION');

-- CreateEnum
CREATE TYPE "EstadoEtapa" AS ENUM ('EN_ELABORACION', 'EN_REVISION', 'OBSERVADO', 'APROBADO');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('MEMORIA', 'PLANOS', 'METRADOS', 'PRESUPUESTO', 'CRONOGRAMA', 'INFORME');

-- Conversión de los tipos de cliente (aprobada): no se borra ningún registro, solo cambia el valor.
--   ENTIDAD_PUBLICA -> GOBIERNO_REGIONAL si el nombre empieza con "Gobierno Regional", si no -> MUNICIPALIDAD
--   EMPRESA -> EMPRESA_PRIVADA · PERSONA -> PERSONA
CREATE TYPE "TipoCliente_new" AS ENUM ('MUNICIPALIDAD', 'GOBIERNO_REGIONAL', 'EMPRESA_PRIVADA', 'PERSONA');
ALTER TABLE "Cliente" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "Cliente" ALTER COLUMN "tipo" TYPE "TipoCliente_new" USING (
  CASE
    WHEN "tipo"::text = 'ENTIDAD_PUBLICA' AND btrim("nombre") ILIKE 'gobierno regional%' THEN 'GOBIERNO_REGIONAL'
    WHEN "tipo"::text = 'ENTIDAD_PUBLICA' THEN 'MUNICIPALIDAD'
    WHEN "tipo"::text = 'EMPRESA' THEN 'EMPRESA_PRIVADA'
    ELSE 'PERSONA'
  END
)::"TipoCliente_new";
ALTER TYPE "TipoCliente" RENAME TO "TipoCliente_old";
ALTER TYPE "TipoCliente_new" RENAME TO "TipoCliente";
DROP TYPE "TipoCliente_old";
ALTER TABLE "Cliente" ALTER COLUMN "tipo" SET DEFAULT 'EMPRESA_PRIVADA';

-- CreateTable
CREATE TABLE "Etapa" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "tipo" "TipoEtapa" NOT NULL,
    "estado" "EstadoEtapa" NOT NULL DEFAULT 'EN_ELABORACION',
    "fechaInicio" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" DATE,
    "fechaAprobacion" TIMESTAMP(3),
    "observacion" TEXT,
    "observadoEn" TIMESTAMP(3),
    "observadoPorId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "etapaId" INTEGER NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Etapa_proyectoId_tipo_key" ON "Etapa"("proyectoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_ruta_key" ON "Documento"("ruta");

-- CreateIndex
CREATE INDEX "Documento_proyectoId_etapaId_idx" ON "Documento"("proyectoId", "etapaId");

-- CreateIndex
CREATE INDEX "Documento_usuarioId_fecha_idx" ON "Documento"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "Documento_fecha_idx" ON "Documento"("fecha");

-- AddForeignKey
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_observadoPorId_fkey" FOREIGN KEY ("observadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

