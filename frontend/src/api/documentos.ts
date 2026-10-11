import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from './client';
import { useApiMutation } from './mutation';
import type { CategoriaDocumento, Documento, Etapa, PaginaDocumentos, TipoEtapa } from '@/types/api';

// ---------- Etapas ----------

export const useEtapas = (proyectoId: number) =>
  useQuery({
    queryKey: ['etapas', proyectoId],
    queryFn: async () => (await api.get<Etapa[]>(`/proyectos/${proyectoId}/etapas`)).data,
  });

const invalidarEtapas = (proyectoId: number) => [['etapas', proyectoId], ['documentos']];

export const useIniciarEtapa = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { tipo: TipoEtapa; fechaInicio?: string; fechaFin?: string }) =>
      (await api.post<Etapa>(`/proyectos/${proyectoId}/etapas`, data)).data,
    invalidate: invalidarEtapas(proyectoId),
    exito: 'Etapa iniciada',
  });

export const useEditarEtapa = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: { id: number; fechaInicio?: string; fechaFin?: string | null }) => (await api.patch<Etapa>(`/etapas/${id}`, data)).data,
    invalidate: invalidarEtapas(proyectoId),
    exito: 'Fechas actualizadas',
  });

export const useAccionEtapa = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, accion, observacion }: { id: number; accion: 'enviar' | 'aprobar' | 'observar'; observacion?: string }) =>
      (await api.post<Etapa>(`/etapas/${id}/${accion}`, accion === 'observar' ? { observacion } : {})).data,
    invalidate: invalidarEtapas(proyectoId),
    exito: (e) => (e.estado === 'APROBADO' ? 'Etapa aprobada' : e.estado === 'OBSERVADO' ? 'Observación enviada al responsable' : 'Etapa enviada a revisión'),
  });

export const useEliminarEtapa = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/etapas/${id}`);
    },
    invalidate: invalidarEtapas(proyectoId),
    exito: 'Etapa eliminada',
  });

// ---------- Documentos ----------

export interface FiltrosDocumentos {
  proyectoId?: number;
  etapa?: TipoEtapa;
  categoria?: CategoriaDocumento;
  usuarioId?: number;
  desde?: string;
  hasta?: string;
  q?: string;
  pagina?: number;
  porPagina?: number;
}

const limpiar = (f: FiltrosDocumentos) =>
  Object.fromEntries(Object.entries({ ...f, ...(f.hasta && { hasta: `${f.hasta}T23:59:59.999` }) }).filter(([, v]) => v !== undefined && v !== ''));

/** Documentos de un proyecto (la API ya filtra: un arquitecto o ingeniero solo recibe los suyos) */
export const useDocumentosProyecto = (proyectoId: number) =>
  useQuery({
    queryKey: ['documentos', 'proyecto', proyectoId],
    queryFn: async () => (await api.get<Documento[]>(`/proyectos/${proyectoId}/documentos`)).data,
  });

/** Jefatura: todos. Resto: "mis documentos" */
export const useListadoDocumentos = (modo: 'todos' | 'mios', f: FiltrosDocumentos) =>
  useQuery({
    queryKey: ['documentos', modo, f],
    queryFn: async () => (await api.get<PaginaDocumentos>(modo === 'todos' ? '/documentos' : '/documentos/mios', { params: limpiar(f) })).data,
    placeholderData: (anterior) => anterior,
  });

export const useSubirDocumento = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ etapaId, categoria, descripcion, archivo }: { etapaId: number; categoria: CategoriaDocumento; descripcion?: string; archivo: File }) => {
      const form = new FormData();
      form.append('categoria', categoria);
      if (descripcion) form.append('descripcion', descripcion);
      form.append('archivo', archivo);
      return (await api.post<Documento>(`/proyectos/${proyectoId}/etapas/${etapaId}/documentos`, form)).data;
    },
    invalidate: [['documentos']],
    exito: 'Documento subido',
  });

export const useEliminarDocumento = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/documentos/${id}`);
    },
    invalidate: [['documentos']],
    exito: 'Documento eliminado',
  });

/** Descarga un documento protegido con su nombre original (petición autenticada -> blob) */
export async function descargarDocumento(d: Pick<Documento, 'descargaUrl' | 'nombreArchivo'>) {
  const ruta = d.descargaUrl.startsWith(API_URL) ? d.descargaUrl.slice(API_URL.length) : d.descargaUrl.replace(/^\/api\/v1/, '');
  const res = await api.get<Blob>(ruta, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = d.nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
