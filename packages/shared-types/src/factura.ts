export type EstadoFactura = 'pendiente' | 'facturado' | 'cobrado';

export interface Factura {
  _id: string;
  usuarioId: string;
  expedienteId: string;
  concepto: string;
  importe: number;
  fecha: string;          // ISO string
  numero: string | null;
  notas: string | null;
  estado: EstadoFactura;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface FacturaListResponse {
  items: Factura[];
  total: number;
  page: number;
  limit: number;
}

export interface FacturaTotales {
  total: number;
  pendiente: number;
  facturado: number;
  cobrado: number;
}
