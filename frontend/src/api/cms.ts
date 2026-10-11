import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';

export interface BloqueCms {
  id: string; tipo: 'texto' | 'servicios' | 'portafolio' | 'contacto'; visible: boolean;
  titulo: string; texto: string; medioId: number | null; botonTexto: string; botonUrl: string;
}
export interface PaginaCms {
  tipo: 'pagina'; slug: string; titulo: string; descripcion: string; imagenSocialId: number | null; bloques: BloqueCms[];
}
export interface ConfiguracionCms {
  tipo: 'configuracion'; nombre: string; subtitulo: string; descripcion: string; logoId: number | null;
  menu: { etiqueta: string; slug: string }[];
}
export type ContenidoCms = PaginaCms | ConfiguracionCms;
export interface DocumentoCms {
  clave: string; borrador: ContenidoCms; publicado: ContenidoCms | null; version: number;
  publicadoEn: string | null; actualizadoEn: string | null;
}
export interface MedioCms { id: number; nombre: string; textoAlternativo: string; tamano: number; url: string }
export interface RevisionCms { id: number; accion: string; autorNombre: string; fecha: string }
export const useDocumentosCms = () => useQuery({ queryKey: ['cms'], queryFn: async () => (await api.get<DocumentoCms[]>('/cms/documentos')).data });
export const useMediosCms = () => useQuery({ queryKey: ['cms-medios'], queryFn: async () => (await api.get<MedioCms[]>('/cms/medios')).data });
export const useHistorialCms = (clave: string) => useQuery({ queryKey: ['cms-historial', clave], queryFn: async () => (await api.get<RevisionCms[]>(`/cms/documentos/${clave}/historial`)).data, enabled: !!clave });
export const useGuardarCms = () => useApiMutation({
  fn: async ({ clave, ...body }: { clave: string; version: number; contenido: ContenidoCms }) => (await api.put<DocumentoCms>(`/cms/documentos/${clave}`, body)).data,
  invalidate: [['cms'], ['cms-historial']], exito: 'Borrador guardado. La web conserva la versión publicada.',
});
export const useAccionCms = () => useApiMutation({
  fn: async ({ clave, accion, ...body }: { clave: string; version: number; accion: 'publicar' | 'retirar' | 'restaurar'; revisionId?: number }) =>
    (await api.post<DocumentoCms>(`/cms/documentos/${clave}/${accion}`, body)).data,
  invalidate: [['cms'], ['cms-historial']], exito: 'Documento actualizado',
});
export const useVistaPreviaCms = () => useApiMutation({
  fn: async ({ clave, version }: { clave: string; version: number }) => (await api.post<{ url: string; minutos: number }>(`/cms/documentos/${clave}/vista-previa`, { version })).data,
});
export const useSubirMedioCms = () => useApiMutation({
  fn: async (archivo: File) => { const form = new FormData(); form.append('archivo', archivo); return (await api.post<MedioCms>('/cms/medios', form)).data; },
  invalidate: [['cms-medios']], exito: 'Imagen añadida a la biblioteca',
});
export const useEditarMedioCms = () => useApiMutation({
  fn: async ({ id, textoAlternativo }: { id: number; textoAlternativo: string }) => (await api.put(`/cms/medios/${id}`, { textoAlternativo })).data,
  invalidate: [['cms-medios']], exito: 'Descripción de imagen guardada',
});
