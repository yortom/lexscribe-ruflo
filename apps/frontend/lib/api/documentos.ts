import type { Documento, DocumentoListResponse, DownloadUrlResponse } from '@lexscribe/shared-types';
import type { GenerateDocumentoInput } from '@lexscribe/shared-validation';
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
 * FormData fetch — does NOT set Content-Type so browser sets multipart boundary.
 * Used for uploadDocumento (DOC-06).
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

/**
 * Generar documento .docx desde plantilla + expediente (DOC-01/02/03/04).
 * POST /documentos/generar/:expedienteId
 */
export function generarDocumento(
  expedienteId: string,
  dto: GenerateDocumentoInput,
): Promise<Documento> {
  return apiFetch<Documento>(`/documentos/generar/${expedienteId}`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Subir documento preexistente (.docx/.pdf/.txt) a un expediente (DOC-06).
 * POST /documentos/upload/:expedienteId — multipart FormData.
 */
export function uploadDocumento(
  expedienteId: string,
  file: File,
  nombre: string,
): Promise<Documento> {
  const form = new FormData();
  form.append('file', file);
  form.append('nombre', nombre);
  return apiFetchFormData<Documento>(`/documentos/upload/${expedienteId}`, form);
}

/**
 * Obtener URL presignada para descarga (DOC-05).
 * GET /documentos/:id/download
 */
export function downloadDocumento(id: string): Promise<DownloadUrlResponse> {
  return apiFetch<DownloadUrlResponse>(`/documentos/${id}/download`);
}

/**
 * Listar documentos de un expediente con paginación.
 * GET /documentos?expedienteId=&page=&limit=
 */
export function listDocumentos(
  expedienteId: string,
  page = 1,
  limit = 20,
): Promise<DocumentoListResponse> {
  return apiFetch<DocumentoListResponse>(
    `/documentos?expedienteId=${expedienteId}&page=${page}&limit=${limit}`,
  );
}

/**
 * Soft-delete de documento (CAL-05 / FL-9).
 * DELETE /documentos/:id?eventosAction=conservar|eliminar
 * eventosAction='eliminar' also soft-deletes associated events.
 */
export function deleteDocumento(
  id: string,
  eventosAction: 'conservar' | 'eliminar' = 'conservar',
): Promise<void> {
  return apiFetch<void>(`/documentos/${id}?eventosAction=${eventosAction}`, { method: 'DELETE' });
}
