export interface DatosCongelados {
  expediente: Record<string, unknown>;
  contacto: Record<string, Record<string, unknown>>;
  clausula: Record<string, Record<string, unknown>>;
  fecha: Record<string, unknown>;
}

export interface Documento {
  _id: string;
  usuarioId: string;
  expedienteId: string;
  nombre: string;
  tipo: 'generado' | 'subido';
  plantillaId: string | null;
  datosCongelados: DatosCongelados | null;
  clausulasUsadas: string[] | null;
  storagePath: string;
  formato: 'docx' | 'pdf' | 'txt';
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface DocumentoListResponse {
  items: Documento[];
  total: number;
  page: number;
  limit: number;
}

export interface DownloadUrlResponse {
  url: string;
}
