import type { Documento } from './documento';

export interface ContactoVinculado {
  contactoId: string;
  rol: string;
}

export interface Expediente {
  _id: string;
  usuarioId: string;
  nombre: string;
  contactos: ContactoVinculado[];
  parametros: Record<string, unknown>;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ExpedienteDetailResponse extends Expediente {
  documentos: Documento[]; // Phase 6 (EXPE-07)
  fechas: unknown[]; // Phase 7 placeholder (EXPE-06)
}

export interface ExpedienteListResponse {
  items: Expediente[];
  total: number;
  page: number;
  limit: number;
}
