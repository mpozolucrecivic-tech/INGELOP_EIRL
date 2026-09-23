import { z } from 'zod';

export const dashboardGeneralQuery = z.object({
  meses: z.coerce.number().int().min(1).max(36).default(12), // ventana del gráfico de gasto mensual
});

export type DashboardGeneralQuery = z.infer<typeof dashboardGeneralQuery>;
