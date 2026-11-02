/**
 * Cliente HTTP mínimo para hablar con el backend.
 * Adjunta el token JWT (si existe) en el header Authorization.
 */
const TOKEN_KEY = 'axios_challenge_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Evento emitido cuando el backend responde 401: el token expiró o fue
 * revocado mientras la app estaba abierta (ver H-31). `AuthContext` lo escucha
 * y vuelve al login.
 */
export const UNAUTHORIZED_EVENT = 'axios:unauthorized';

/**
 * Traduce un fallo de red (backend caído, sin señal, CORS) a un mensaje
 * entendible. `fetch` rechaza con un `TypeError` genérico ("Failed to fetch"),
 * que no le dice nada al usuario (ver H-32).
 */
function networkErrorMessage(err: unknown): string {
  if (err instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Revisa que el backend esté corriendo.';
  }
  return err instanceof Error ? err.message : 'Error de red';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    throw new Error(networkErrorMessage(err));
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new Error(body.error || `Error HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
