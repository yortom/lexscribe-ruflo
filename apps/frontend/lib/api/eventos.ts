import type { Evento, EventoListResponse, EventoCountResponse } from '@lexscribe/shared-types';
import type { CreateEventoInput, UpdateEventoInput } from '@lexscribe/shared-validation';
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
 * Crear un evento (CAL-01 origen documento, CAL-02 origen manual).
 * POST /eventos
 */
export function createEvento(input: CreateEventoInput): Promise<Evento> {
  return apiFetch<Evento>('/eventos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Listar eventos con filtros opcionales (CAL-03).
 * GET /eventos?expedienteId=&documentoId=&fechaDesde=&fechaHasta=&soloCalendario=&page=&limit=
 */
export function listEventos(params: {
  expedienteId?: string;
  documentoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  soloCalendario?: boolean;
  page?: number;
  limit?: number;
}): Promise<EventoListResponse> {
  const qs = new URLSearchParams();
  if (params.expedienteId) qs.set('expedienteId', params.expedienteId);
  if (params.documentoId) qs.set('documentoId', params.documentoId);
  if (params.fechaDesde) qs.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) qs.set('fechaHasta', params.fechaHasta);
  if (params.soloCalendario !== undefined) qs.set('soloCalendario', String(params.soloCalendario));
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<EventoListResponse>(`/eventos${query ? `?${query}` : ''}`);
}

/**
 * Actualizar un evento (CAL-04 color, mostrarEnCalendario, etc.).
 * PATCH /eventos/:id
 */
export function updateEvento(id: string, patch: UpdateEventoInput): Promise<Evento> {
  return apiFetch<Evento>(`/eventos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * Soft-delete un evento.
 * DELETE /eventos/:id
 */
export function deleteEvento(id: string): Promise<void> {
  return apiFetch<void>(`/eventos/${id}`, { method: 'DELETE' });
}

/**
 * Contar eventos activos de un documento (FL-9 pre-check).
 * GET /eventos/count?documentoId=:id
 */
export function countEventosByDocumento(documentoId: string): Promise<EventoCountResponse> {
  return apiFetch<EventoCountResponse>(`/eventos/count?documentoId=${documentoId}`);
}
