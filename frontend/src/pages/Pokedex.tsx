import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MAX_TEAM_MEMBERS, useTeamDraft } from '../context/TeamDraftContext';

interface PokemonCard {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
}

interface PokedexPage {
  count: number;
  results: PokemonCard[];
}

interface Favorite {
  pokemonId: number;
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
    pending.catch(() => pageCache.delete(page)); // permite reintentar si falla
  }
  return pending;
}

/**
 * Catálogo paginado con foto y tipos (ver ADR-0011 y ADR-0012). Permite
 * marcar favoritos y agregar pokémon al equipo en armado.
 */
export function Pokedex({ onGoToTeams }: { onGoToTeams: () => void }) {
  const { logout } = useAuth();
  const draft = useTeamDraft();
  const [page, setPage] = useState(lastPage);
  const [data, setData] = useState<PokedexPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .get<{ data: Favorite[] }>('/favorites')
      .then((res) => setFavoriteIds(new Set(res.data.map((f) => f.pokemonId))))
      .catch(() => {});
  }, []);

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

  async function addFavorite(pokemon: PokemonCard) {
    try {
      setError(null);
      await api.post('/favorites', { pokemon: pokemon.name });
      setFavoriteIds((ids) => new Set(ids).add(pokemon.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar a favoritos');
    }
  }

  const pager = (
    <div className="pager">
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
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Pokédex</h1>
        <button onClick={logout}>Salir</button>
      </div>

      <div className="card form-row" style={{ justifyContent: 'space-between' }}>
        <span>
          Equipo en armado:{' '}
          <strong>
            {draft.draft.length}/{MAX_TEAM_MEMBERS}
          </strong>
          {draft.draft.length > 0 && (
            <span className="muted"> · {draft.draft.map((p) => p.name).join(', ')}</span>
          )}
        </span>
        <button onClick={onGoToTeams} disabled={draft.draft.length === 0}>
          Ir a Equipos →
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {pager}

      <ul className="grid" aria-busy={loading} style={{ opacity: loading ? 0.5 : 1 }}>
        {data?.results.map((p) => (
          <li key={p.id} className="card poke-card">
            {p.sprite ? (
              <img
                className="poke-sprite"
                src={p.sprite}
                alt={p.name}
                loading="lazy"
                width={96}
                height={96}
              />
            ) : (
              <div className="poke-sprite poke-sprite-empty" aria-label="Sin imagen">
                ?
              </div>
            )}
            <span className="poke-number">#{String(p.id).padStart(4, '0')}</span>
            <span className="poke-name">{p.name}</span>
            <div className="types">
              {p.types.map((t) => (
                <span key={t} className={`type-badge type-${t}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="poke-actions">
              {favoriteIds.has(p.id) ? (
                <span className="badge-ok">★ favorito</span>
              ) : (
                <button className="btn-sm" onClick={() => addFavorite(p)}>
                  + favorito
                </button>
              )}
              <button
                className="btn-sm"
                onClick={() => draft.add({ id: p.id, name: p.name })}
                disabled={draft.isFull || draft.has(p.id)}
                title={
                  draft.has(p.id)
                    ? 'Ya está en el equipo'
                    : draft.isFull
                      ? 'El equipo está completo'
                      : undefined
                }
              >
                {draft.has(p.id) ? '✓ en equipo' : '+ equipo'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {data && pager}
    </div>
  );
}
