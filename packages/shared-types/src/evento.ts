export interface Evento {
  _id: string;
  usuarioId: string;
  origen: 'documento' | 'manual';
  expedienteId: string | null;
  documentoId: string | null;
  subtipo: 'fecha_limite' | 'aviso' | 'recordatorio' | null;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;   // ISO string
  fechaFin: string | null;
  color: string | null;
  mostrarEnCalendario: boolean;  // D-01
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface EventoListResponse {
  items: Evento[];
  total: number;
  page: number;
  limit: number;
}

export interface EventoCountResponse { total: number; }
