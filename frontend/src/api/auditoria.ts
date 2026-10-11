import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { AlertasAuditoria, PaginaAuditoria, UltimoAcceso } from '@/types/api';

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  usuarioId?: number;
  modulo?: string;
  accion?: string;
  resultado?: 'EXITO' | 'FALLO';
  ip?: string;
  pagina?: number;
  porPagina?: number;
}

/** Quita filtros vacíos y convierte las fechas del día completo (hasta = fin del día) */
export const parametros = (f: FiltrosAuditoria) =>
  Object.fromEntries(
    Object.entries({ ...f, ...(f.hasta && { hasta: `${f.hasta}T23:59:59.999` }) }).filter(([, v]) => v !== undefined && v !== ''),
  );

export const useAuditoria = (f: FiltrosAuditoria) =>
  useQuery({
    queryKey: ['auditoria', f],
    queryFn: async () => (await api.get<PaginaAuditoria>('/auditoria', { params: parametros(f) })).data,
    placeholderData: (anterior) => anterior,
  });

export const useAlertasAuditoria = () =>
  useQuery({
    queryKey: ['auditoria-alertas'],
    queryFn: async () => (await api.get<AlertasAuditoria>('/auditoria/alertas')).data,
    refetchInterval: 60_000,
  });

export const useUltimosAccesos = (enabled = true) =>
  useQuery({
    queryKey: ['auditoria-ultimos-accesos'],
    queryFn: async () => (await api.get<UltimoAcceso[]>('/auditoria/ultimos-accesos')).data,
    enabled,
  });

/** Descarga el CSV con los filtros actuales (petición autenticada -> blob -> enlace temporal) */
export async function descargarCsvAuditoria(f: FiltrosAuditoria) {
  const res = await api.get<Blob>('/auditoria/exportar', { params: parametros(f), responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
