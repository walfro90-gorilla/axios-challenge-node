import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

export interface Favorite {
  id: number;
  pokemonId: number;
  pokemonName: string;
  nickname: string | null;
}

interface PokemonLike {
  id: number;
  name: string;
}

/**
 * Favoritos del usuario con acciones optimistas (se revierten si el backend
 * falla). Usa la API existente de /api/favorites, sin modificar ese módulo.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await api.get<{ data: Favorite[] }>('/favorites');
      setFavorites(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar favoritos');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const byPokemonId = useMemo(
    () => new Map((favorites ?? []).map((f) => [f.pokemonId, f])),
    [favorites],
  );

  async function withPending(pokemonId: number, action: () => Promise<void>) {
    setPendingIds((ids) => new Set(ids).add(pokemonId));
    setError(null);
    try {
      await action();
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(pokemonId);
        return next;
      });
    }
  }

  async function add(pokemon: PokemonLike, nickname: string | null = null) {
    await withPending(pokemon.id, async () => {
      const temp: Favorite = {
        id: -Date.now(),
        pokemonId: pokemon.id,
        pokemonName: pokemon.name,
        nickname,
      };
      setFavorites((list) => [temp, ...(list ?? [])]);
      try {
        const created = await api.post<Favorite>('/favorites', { pokemon: pokemon.name, nickname });
        setFavorites((list) => (list ?? []).map((f) => (f.id === temp.id ? created : f)));
      } catch (err) {
        setFavorites((list) => (list ?? []).filter((f) => f.id !== temp.id));
        setError(err instanceof Error ? err.message : 'Error al agregar a favoritos');
        await reload();
      }
    });
  }

  async function remove(favorite: Favorite) {
    await withPending(favorite.pokemonId, async () => {
      setFavorites((list) => (list ?? []).filter((f) => f.id !== favorite.id));
      try {
        await api.del(`/favorites/${favorite.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al quitar de favoritos');
        await reload();
      }
    });
  }

  async function rename(favorite: Favorite, nickname: string | null) {
    await withPending(favorite.pokemonId, async () => {
      try {
        const updated = await api.patch<Favorite>(`/favorites/${favorite.id}`, { nickname });
        setFavorites((list) => (list ?? []).map((f) => (f.id === favorite.id ? updated : f)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar el apodo');
      }
    });
  }

  function toggle(pokemon: PokemonLike) {
    const existing = byPokemonId.get(pokemon.id);
    return existing ? remove(existing) : add(pokemon);
  }

  return { favorites, byPokemonId, pendingIds, error, add, remove, rename, toggle };
}
