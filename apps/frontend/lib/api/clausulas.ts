import type { Clausula, ClausulaListResponse } from '@lexscribe/shared-types';
import type {
  CreateClausulaInput,
  UpdateClausulaInput,
  QueryClausulaInput,
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

export function listClausulas(
  query: Partial<QueryClausulaInput> = {},
): Promise<ClausulaListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.label) params.set('label', query.label);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  return apiFetch<ClausulaListResponse>(`/clausulas?${params.toString()}`);
}

export function getClausula(id: string): Promise<Clausula> {
  return apiFetch<Clausula>(`/clausulas/${id}`);
}

export function createClausula(data: CreateClausulaInput): Promise<Clausula> {
  return apiFetch<Clausula>('/clausulas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateClausula(id: string, data: UpdateClausulaInput): Promise<Clausula> {
  return apiFetch<Clausula>(`/clausulas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteClausula(id: string): Promise<void> {
  return apiFetch<void>(`/clausulas/${id}`, { method: 'DELETE' });
}
