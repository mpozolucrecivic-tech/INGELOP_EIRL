-- Los pagos al personal (arquitectos, ingenieros) ya no se registran como gasto de obra:
-- su costo se ve en "Equipo y horas". Se borran los gastos de esa categoría y se quita del enum.

-- 1. Importaciones desde Excel que incluían esos gastos: se recalculan cantidad y total
UPDATE "ImportacionGasto" i
SET "cantidad" = sub."cantidad", "total" = sub."total"
FROM (
  SELECT g."importacionId" AS id,
         COUNT(*) FILTER (WHERE g."categoria" <> 'MANO_DE_OBRA')::int AS "cantidad",
         COALESCE(SUM(g."monto") FILTER (WHERE g."categoria" <> 'MANO_DE_OBRA'), 0) AS "total"
  FROM "Gasto" g
  WHERE g."importacionId" IN (SELECT DISTINCT "importacionId" FROM "Gasto" WHERE "categoria" = 'MANO_DE_OBRA' AND "importacionId" IS NOT NULL)
  GROUP BY g."importacionId"
) sub
WHERE i."id" = sub.id;

-- 2. Borrar los gastos de honorarios y planilla
DELETE FROM "Gasto" WHERE "categoria" = 'MANO_DE_OBRA';

-- 3. Quitar el valor del enum (PostgreSQL no permite borrar un valor: se recrea el tipo)
ALTER TYPE "CategoriaGasto" RENAME TO "CategoriaGasto_old";
CREATE TYPE "CategoriaGasto" AS ENUM ('MATERIALES', 'TRANSPORTE', 'EQUIPOS', 'OTROS', 'ALQUILER', 'SERVICIOS_BASICOS', 'SUELDOS', 'SOFTWARE', 'IMPUESTOS', 'UTILES_OFICINA');
ALTER TABLE "Gasto" ALTER COLUMN "categoria" TYPE "CategoriaGasto" USING ("categoria"::text::"CategoriaGasto");
DROP TYPE "CategoriaGasto_old";
