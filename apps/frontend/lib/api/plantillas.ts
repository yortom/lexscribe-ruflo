import type { Plantilla, PlantillaListResponse } from '@lexscribe/shared-types';
import type {
  CreatePlantillaInput,
  UpdatePlantillaInput,
  QueryPlantillaInput,
  DeclararVariableInput,
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

/**
 * FormData fetch variant — does NOT set Content-Type so the browser sets multipart boundary.
 * Used for uploadPlantilla (F-021 .docx/.txt upload).
 */
async function apiFetchFormData<T>(path: string, body: FormData): Promise<T> {
  let token = session.get();
  const doFetch = (t: string | null) =>
    fetch(`${API}${path}`, {
      method: 'POST',
      body,
      headers: {
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed?.accessToken) {
      session.set(refreshed.accessToken);
      token = refreshed.accessToken;
      res = await doFetch(token);
    }
  }

  if (!res.ok) {
    const body2 = await res.json().catch(() => ({}));
    throw new ApiError(body2.code ?? 'UNKNOWN', body2.message ?? 'API error', res.status);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export function listPlantillas(
  query: Partial<QueryPlantillaInput> = {},
): Promise<PlantillaListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  return apiFetch<PlantillaListResponse>(`/plantillas?${params.toString()}`);
}

export function getPlantilla(id: string): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}`);
}

export function getPlantillaVersions(id: string): Promise<Plantilla[]> {
  return apiFetch<Plantilla[]>(`/plantillas/${id}/versions`);
}

export function createPlantilla(data: CreatePlantillaInput): Promise<Plantilla> {
  return apiFetch<Plantilla>('/plantillas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Upload a .docx or .txt file as a new plantilla (F-021, F-022).
 * Uses FormData so the browser sets the multipart/form-data Content-Type with boundary.
 */
export function uploadPlantilla(file: File, nombre: string): Promise<Plantilla> {
  const form = new FormData();
  form.append('file', file);
  form.append('nombre', nombre);
  return apiFetchFormData<Plantilla>('/plantillas/upload', form);
}

export function updatePlantilla(id: string, data: UpdatePlantillaInput): Promise<Plantilla> {
  return apiFetch<Plantilla>(`/plantillas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Declare a new dynamic-schema field from the editor (PLAN-04, FL-13). */
export function declararVariable(id: string, data: DeclararVariableInput): Promise<void> {
  return apiFetch<void>(`/plantillas/${id}/declarar-variable`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deletePlantilla(id: string): Promise<void> {
  return apiFetch<void>(`/plantillas/${id}`, { method: 'DELETE' });
}
