-- Proyectos archivados: fuera de listas y recordatorios; solo un proyecto archivado se puede eliminar.
-- No modifica datos existentes: ningún proyecto queda archivado.

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "archivadoEn" TIMESTAMP(3);

