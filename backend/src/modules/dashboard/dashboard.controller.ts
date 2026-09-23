import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import type { DashboardGeneralQuery } from './dashboard.schema';

export async function proyecto(req: Request, res: Response) {
  res.json(await dashboardService.dashboardProyecto(Number(req.params.id)));
}

export async function general(req: Request, res: Response) {
  res.json(await dashboardService.dashboardGeneral((req.query as unknown as DashboardGeneralQuery).meses));
}
