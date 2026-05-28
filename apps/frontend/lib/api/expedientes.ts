import type {
  Expediente,
  ExpedienteListResponse,
  ExpedienteDetailResponse,
} from '@lexscribe/shared-types';
import type {
  CreateExpedienteInput,
  UpdateExpedienteInput,
  QueryExpedienteInput,
  LinkContactoInput,
} from '@lexscribe/shared-validation';
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

export function listExpedientes(
  query: Partial<QueryExpedienteInput> = {},
): Promise<ExpedienteListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.contactoId) params.set('contactoId', query.contactoId);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  return apiFetch<ExpedienteListResponse>(`/expedientes?${params.toString()}`);
}

export function getExpediente(id: string): Promise<ExpedienteDetailResponse> {
  return apiFetch<ExpedienteDetailResponse>(`/expedientes/${id}`);
}

export function createExpediente(data: CreateExpedienteInput): Promise<Expediente> {
  return apiFetch<Expediente>('/expedientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateExpediente(id: string, data: UpdateExpedienteInput): Promise<Expediente> {
  return apiFetch<Expediente>(`/expedientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteExpediente(id: string): Promise<void> {
  return apiFetch<void>(`/expedientes/${id}`, { method: 'DELETE' });
}

export function linkContacto(
  expedienteId: string,
  dto: LinkContactoInput,
): Promise<Expediente> {
  return apiFetch<Expediente>(`/expedientes/${expedienteId}/contactos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function unlinkContacto(
  expedienteId: string,
  contactoId: string,
  rol: string,
): Promise<void> {
  // rol puede contener espacios → URL-encode (backend hace decodeURIComponent)
  const path = `/expedientes/${expedienteId}/contactos/${contactoId}/${encodeURIComponent(rol)}`;
  return apiFetch<void>(path, { method: 'DELETE' });
}
