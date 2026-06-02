export interface Clausula {
  _id: string;
  usuarioId: string;
  nombre: string;
  texto: string;
  labels: string[];
  activo: boolean;
  fechaInactivacion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ClausulaListResponse {
  items: Clausula[];
  total: number;
  page: number;
  limit: number;
}
