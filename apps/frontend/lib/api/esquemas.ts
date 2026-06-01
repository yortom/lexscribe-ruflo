/**
 * Esquemas API client — dynamic schema (parametros) per tipoObjeto.
 * Used by the plantillas editor to know which {{...}} fields are ALREADY declared
 * (so the "Declarar variables" modal only offers genuinely new fields). PLAN-04 / FL-13.
 */
import { session } from '../auth/session';
import { refresh } from './auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export type TipoDato = 'texto' | 'numero' | 'fecha' | 'booleano';

export interface EsquemaParametro {
  nombre: string;
  tipoDato: TipoDato;
  obligatorio: boolean;
}

export interface Esquema {
  tipoObjeto: 'expediente' | 'contacto';
  parametros: EsquemaParametro[];
}

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

/**
 * GET the esquema for a tipoObjeto. Returns empty parametros when the esquema does
 * not exist yet (backend 404 NotFoundError) — i.e. nothing declared so far.
 */
export async function getEsquema(
  tipoObjeto: 'expediente' | 'contacto',
): Promise<Esquema> {
  let token = session.get();
  let res = await rawFetch(`/esquemas/${tipoObjeto}`, undefined, token);

  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed?.accessToken) {
      session.set(refreshed.accessToken);
      token = refreshed.accessToken;
      res = await rawFetch(`/esquemas/${tipoObjeto}`, undefined, token);
    }
  }

  // No esquema declared yet → treat as empty (not an error for the editor).
  if (res.status === 404) {
    return { tipoObjeto, parametros: [] };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.code ?? 'UNKNOWN', body.message ?? 'API error', res.status);
  }

  return res.json() as Promise<Esquema>;
}
