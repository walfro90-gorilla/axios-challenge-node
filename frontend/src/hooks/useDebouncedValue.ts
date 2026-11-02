import { useEffect, useState } from 'react';

/**
 * Devuelve `value` sólo cuando deja de cambiar durante `delayMs`.
 * Útil para no disparar una petición en cada tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
