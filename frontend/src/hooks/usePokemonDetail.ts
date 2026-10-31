import { useEffect, useState } from 'react';
import { getPokemonDetail, peekDetail, type PokemonDetail } from '../api/pokemonDetails';

/**
 * Detalle (foto y tipos) de un pokémon por nombre, desde la caché compartida.
 * Con `skip` no hace la petición (cuando los datos ya vienen de otra fuente).
 */
export function usePokemonDetail(name: string, skip = false): PokemonDetail | null {
  const [detail, setDetail] = useState<PokemonDetail | null>(() => peekDetail(name));

  useEffect(() => {
    if (skip) return;
    const cached = peekDetail(name);
    if (cached) {
      setDetail(cached);
      return;
    }
    let cancelled = false;
    getPokemonDetail(name)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name, skip]);

  return detail;
}
