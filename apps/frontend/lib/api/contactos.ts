import type {
  Contacto,
  ContactoListResponse,
  ContactoDetailResponse,
} from '@lexscribe/shared-types';
import type {
  CreateContactoInput,
  UpdateContactoInput,
  QueryContactoInput,
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

  // Si no hay token en memoria o el server devuelve 401, intenta refrescar
  // usando la cookie refresh_token y reintenta UNA vez.
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

export function listContactos(
  query: Partial<QueryContactoInput> = {},
): Promise<ContactoListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.tipologia) params.set('tipologia', query.tipologia);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  return apiFetch<ContactoListResponse>(`/contactos?${params.toString()}`);
}

export function getContacto(id: string): Promise<ContactoDetailResponse> {
  return apiFetch<ContactoDetailResponse>(`/contactos/${id}`);
}

export function createContacto(data: CreateContactoInput): Promise<Contacto> {
  return apiFetch<Contacto>('/contactos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateContacto(
  id: string,
  data: UpdateContactoInput,
): Promise<Contacto> {
  return apiFetch<Contacto>(`/contactos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteContacto(id: string): Promise<void> {
  return apiFetch<void>(`/contactos/${id}`, { method: 'DELETE' });
}
