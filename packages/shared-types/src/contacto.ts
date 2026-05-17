export interface Contacto {
  _id: string;
  usuarioId: string;
  tipo: 'fisica' | 'juridica';
  tipologia: 'cliente' | 'parte_contraria' | 'interesado' | 'otros';
  nombre: string;
  documentacionFiscal?: string;
  documentoIdentidad?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  parametros: Record<string, unknown>;
  activo: boolean;
  fechaInactivacion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}
export interface ContactoListResponse {
  items: Contacto[];
  total: number;
  page: number;
  limit: number;
}
export interface ContactoDetailResponse extends Contacto {
  expedientesVinculados: Array<{ _id: string; nombre: string; rol: string }>;
}
