import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, UNAUTHORIZED_EVENT } from '../api/client';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  /** `true` mientras se valida el token guardado (evita mostrar la app a medias). */
  checking: boolean;
  /** Mensaje de error de la comprobación de sesión (p. ej. backend caído). */
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Vuelve a comprobar la sesión (botón "Reintentar"). */
  refreshSession: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState<boolean>(() => getToken() !== null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Valida el token guardado al arrancar (ver H-31 y H-32 en docs/FINDINGS.md).
  // - Si el backend responde 401: el token expiró o fue revocado → se cierra la
  //   sesión y se vuelve al login.
  // - Si el backend no responde: no se puede saber si el token es válido → se
  //   conserva la sesión y se avisa, con opción de reintentar.
  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setSessionError(null);
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
      })
      .catch((err) => {
        if (cancelled) return;
        // El cliente ya limpia el token y emite el evento en un 401.
        if (getToken() === null) {
          setTokenState(null);
          setUser(null);
          return;
        }
        setSessionError(
          err instanceof Error ? err.message : 'No se pudo comprobar la sesión',
        );
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempts]);

  // Si el backend responde 401 con la app abierta (token expirado o revocado),
  // se cierra la sesión y se vuelve al login (ver H-31).
  useEffect(() => {
    function onUnauthorized() {
      setTokenState(null);
      setUser(null);
      setSessionError(null);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setSessionError(null);
  }

  function refreshSession() {
    setAttempts((n) => n + 1);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, checking, sessionError, login, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
