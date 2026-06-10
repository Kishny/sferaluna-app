/**
 * Client HTTP bas niveau pour consommer l'API Next.js de SferaLuna
 * (dossier /Users/jeyko.dev/Projects/sferaluna — backend de production,
 * NE PAS recréer : on le réutilise tel quel).
 *
 * Le backend utilise NextAuth v4 en stratégie JWT avec session basée sur
 * cookie HTTP-only (`next-auth.session-token`). Sur React Native, le moteur
 * réseau natif (NSURLSession sur iOS, OkHttp sur Android) gère et persiste
 * automatiquement les cookies pour `fetch` dès lors que l'on passe
 * `credentials: 'include'` — il ne faut donc PAS essayer de lire/écrire
 * l'en-tête `Set-Cookie` en JS (il n'est pas exposé, par sécurité).
 *
 * Toutes les routes de l'API renvoient un JSON `{ success, ... }`.
 */
import Constants from 'expo-constants';

// En dev (simulateur + web preview), on cible le backend local.
// En prod (build EAS), on utilise apiUrl depuis app.json extra.
const _configApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const _isDev = process.env.NODE_ENV === 'development' || __DEV__;

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (_isDev ? 'http://localhost:3000' : (_configApiUrl ?? 'https://www.sferaluna.com'));

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.replace(/^\//, ''), API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Appel générique à l'API SferaLuna.
 * - Envoie/relit automatiquement le cookie de session NextAuth (`credentials: 'include'`)
 * - Sérialise le body en JSON
 * - Lève une `ApiError` typée en cas d'échec, avec le code renvoyé par le backend
 *   (ex: `UNAUTHORIZED`, `USER_NOT_FOUND`, `VALIDATION_ERROR`…)
 */
export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, headers } = options;

  const res = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(
      data?.error ?? `Erreur API (${res.status})`,
      res.status,
      data?.code,
      data
    );
  }

  return data as T;
}

export const http = {
  get: <T = unknown>(path: string, query?: RequestOptions['query']) =>
    apiFetch<T>(path, { method: 'GET', query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
