-- CreateEnum
CREATE TYPE "RubroObra" AS ENUM ('EDIFICACIONES', 'SANEAMIENTO', 'VIALES', 'ELECTROMECANICAS', 'REPRESAS_IRRIGACIONES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Especialidad" ADD VALUE 'SANEAMIENTO';
ALTER TYPE "Especialidad" ADD VALUE 'VIALIDAD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoServicio" ADD VALUE 'ESTUDIO_PREINVERSION';
ALTER TYPE "TipoServicio" ADD VALUE 'LIQUIDACION_OBRA';

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "rubro" "RubroObra" NOT NULL DEFAULT 'EDIFICACIONES';

