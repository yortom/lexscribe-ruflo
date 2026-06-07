import type {
  Factura,
  FacturaListResponse,
  FacturaTotales,
  EstadoFactura,
} from '@lexscribe/shared-types';
import type { CreateFacturaInput, UpdateFacturaInput } from '@lexscribe/shared-validation';
import { session } from '../auth/session';
import { refresh } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function rawFetch(path: string, init: RequestInit | undefined, token: string | null) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let token = session.get();
  let res = await rawFetch(path, init, token);

  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed?.accessToken) {
      session.set(refreshed.accessToken);
      token = refreshed.accessToken;
      res = await rawFetch(path, init, token);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.code ?? 'UNKNOWN', body.message ?? 'API error', res.status);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

/**
 * Listar facturas de un expediente con paginación (FAC-01).
 * GET /facturas?expedienteId=&page=&limit=
 */
export function listFacturas(
  expedienteId: string,
  page = 1,
  limit = 100,
): Promise<FacturaListResponse> {
  return apiFetch<FacturaListResponse>(
    `/facturas?expedienteId=${expedienteId}&page=${page}&limit=${limit}`,
  );
}

/**
 * Obtener totales y subtotales por estado de un expediente (FAC-05).
 * GET /facturas/totales/:expedienteId
 */
export function getTotalesFactura(expedienteId: string): Promise<FacturaTotales> {
  return apiFetch<FacturaTotales>(`/facturas/totales/${expedienteId}`);
}

/**
 * Crear entrada de facturación (FAC-02).
 * POST /facturas
 * fecha defaults to today server-side when omitted.
 */
export function createFactura(input: CreateFacturaInput): Promise<Factura> {
  return apiFetch<Factura>('/facturas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Editar concepto/importe/fecha/numero/notas de una factura (FAC-04).
 * PATCH /facturas/:id
 */
export function updateFactura(id: string, patch: UpdateFacturaInput): Promise<Factura> {
  return apiFetch<Factura>(`/facturas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * Actualizar estado de una factura (FAC-03).
 * PATCH /facturas/:id/estado — dedicated endpoint (state machine, not general PATCH)
 */
export function updateEstadoFactura(id: string, estado: EstadoFactura): Promise<Factura> {
  return apiFetch<Factura>(`/facturas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

/**
 * Soft-delete de factura (FAC-04).
 * DELETE /facturas/:id
 */
export function deleteFactura(id: string): Promise<void> {
  return apiFetch<void>(`/facturas/${id}`, { method: 'DELETE' });
}
