import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { primeDetails, type PokemonDetail } from '../api/pokemonDetails';
import { FavoriteToggle, PokemonCard, TeamToggle } from '../components/pokemon';
import { useAuth } from '../context/AuthContext';
import { useTeamDraft } from '../context/TeamDraftContext';
import { useFavorites } from '../hooks/useFavorites';

interface PokedexPage {
  count: number;
  results: PokemonDetail[];
}

const PAGE_SIZE = 20;

// A nivel de módulo para conservar página y caché al cambiar de pestaña.
// Se cachea la promesa: pedidos simultáneos de la misma página comparten una petición.
const pageCache = new Map<number, Promise<PokedexPage>>();
let lastPage = 0;

function loadPage(page: number): Promise<PokedexPage> {
  let pending = pageCache.get(page);
  if (!pending) {
    pending = api.get<PokedexPage>(
      `/pokemon?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&details=true`,
    );
    pageCache.set(page, pending);
    pending.then(
      (res) => primeDetails(res.results),
      () => pageCache.delete(page), // permite reintentar si falla
    );
  }
  return pending;
}

/**
 * Catálogo paginado con foto y tipos (ver ADR-0011, 0012 y 0015).
 * ♥ conmuta favorito; la pokéball conmuta el pokémon en el equipo en armado.
 */
export function Pokedex() {
  const { logout } = useAuth();
  const draft = useTeamDraft();
  const favorites = useFavorites();
  const [page, setPage] = useState(lastPage);
  const [data, setData] = useState<PokedexPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lastPage = page;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPage(page)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar la Pokédex');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = data ? Math.max(Math.ceil(data.count / PAGE_SIZE), 1) : 1;

  function goTo(target: number) {
    setPage(Math.min(Math.max(target, 0), totalPages - 1));
    window.scrollTo({ top: 0 });
  }

  const pager = (
    <nav className="pager" aria-label="Paginación">
      <button onClick={() => goTo(0)} disabled={loading || page === 0} aria-label="Primera página">
        «
      </button>
      <button
        onClick={() => goTo(page - 1)}
        disabled={loading || page === 0}
        aria-label="Página anterior"
      >
        ‹
      </button>
      <span className="pager-status">
        {data ? `Página ${page + 1} de ${totalPages}` : 'Cargando…'}
      </span>
      <button
        onClick={() => goTo(page + 1)}
        disabled={loading || page >= totalPages - 1}
        aria-label="Página siguiente"
      >
        ›
      </button>
      <button
        onClick={() => goTo(totalPages - 1)}
        disabled={loading || page >= totalPages - 1}
        aria-label="Última página"
      >
        »
      </button>
    </nav>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Pokédex</h1>
          <p className="muted lead">
            {data ? `${data.count} pokémon. ` : ''}Toca ♥ para favoritos y la pokéball para tu
            equipo.
          </p>
        </div>
        <button onClick={logout}>Salir</button>
      </div>

      {(error || favorites.error) && <p className="error">{error ?? favorites.error}</p>}
      {pager}

      <ul className="grid" aria-busy={loading} style={{ opacity: loading ? 0.5 : 1 }}>
        {data?.results.map((p) => {
          const isFavorite = favorites.byPokemonId.has(p.id);
          const inTeam = draft.has(p.id);
          return (
            <PokemonCard
              key={p.id}
              {...p}
              actions={
                <>
                  <FavoriteToggle
                    pressed={isFavorite}
                    onClick={() => favorites.toggle(p)}
                    disabled={favorites.favorites === null || favorites.pendingIds.has(p.id)}
                    label={
                      isFavorite ? `Quitar ${p.name} de favoritos` : `Agregar ${p.name} a favoritos`
                    }
                  />
                  <TeamToggle
                    pressed={inTeam}
                    onClick={() => draft.toggle({ id: p.id, name: p.name })}
                    disabled={!inTeam && draft.isFull}
                    label={
                      inTeam
                        ? `Quitar ${p.name} del equipo`
                        : draft.isFull
                          ? 'El equipo está completo'
                          : `Agregar ${p.name} al equipo`
                    }
                  />
                </>
              }
            />
          );
        })}
      </ul>

      {data && pager}
    </div>
  );
}
