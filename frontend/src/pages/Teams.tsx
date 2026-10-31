import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface PokemonDetail {
  id: number;
  name: string;
  sprite: string | null;
}

interface TeamMember {
  id: number;
  pokemonId: number;
  pokemonName: string;
}

interface Team {
  id: number;
  name: string;
  members: TeamMember[];
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; pokemon: PokemonDetail }
  | { status: 'not-found'; term: string }
  | { status: 'error'; message: string };

const MAX_MEMBERS = 6;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Pantalla de Equipos: busca pokémon por nombre exacto (con debounce, ver
 * ADR-0009), arma un equipo de hasta 6 y lo guarda en /api/teams.
 */
export function Teams() {
  const { logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);
  const [search, setSearch] = useState<SearchState>({ status: 'idle' });
  // null = buscado y no existe (también se cachea para no repetir la petición).
  const searchCache = useRef(new Map<string, PokemonDetail | null>());

  const [teamName, setTeamName] = useState('');
  const [draft, setDraft] = useState<PokemonDetail[]>([]);

  async function loadTeams() {
    const res = await api.get<{ data: Team[] }>('/teams');
    setTeams(res.data);
  }

  useEffect(() => {
    loadTeams().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'));
  }, []);

  useEffect(() => {
    const query = debouncedTerm.trim().toLowerCase();
    if (query.length < MIN_SEARCH_LENGTH) {
      setSearch({ status: 'idle' });
      return;
    }

    const cached = searchCache.current.get(query);
    if (cached !== undefined) {
      setSearch(cached ? { status: 'found', pokemon: cached } : { status: 'not-found', term: query });
      return;
    }

    // Cancela la búsqueda anterior si el término cambia antes de que responda.
    const controller = new AbortController();
    setSearch({ status: 'loading' });
    api
      .get<PokemonDetail>(`/pokemon/${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((pokemon) => {
        searchCache.current.set(query, pokemon);
        setSearch({ status: 'found', pokemon });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) {
          searchCache.current.set(query, null);
          setSearch({ status: 'not-found', term: query });
          return;
        }
        setSearch({ status: 'error', message: err instanceof Error ? err.message : 'Error al buscar' });
      });

    return () => controller.abort();
  }, [debouncedTerm]);

  const draftIsFull = draft.length >= MAX_MEMBERS;

  function addToDraft(pokemon: PokemonDetail) {
    if (draftIsFull || draft.some((p) => p.id === pokemon.id)) return;
    setDraft([...draft, pokemon]);
    setTerm('');
  }

  function removeFromDraft(id: number) {
    setDraft(draft.filter((p) => p.id !== id));
  }

  async function createTeam() {
    try {
      setError(null);
      await api.post('/teams', { name: teamName, pokemon: draft.map((p) => p.name) });
      setTeamName('');
      setDraft([]);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el equipo');
    }
  }

  async function deleteTeam(team: Team) {
    try {
      setError(null);
      await api.del(`/teams/${team.id}`);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el equipo');
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Pokédex — Equipos</h1>
        <button onClick={logout}>Salir</button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <h2>Nuevo equipo ({draft.length}/{MAX_MEMBERS})</h2>
      <input
        placeholder="Nombre del equipo"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        maxLength={50}
      />
      <ul>
        {draft.map((p) => (
          <li key={p.id}>
            {p.name} <button onClick={() => removeFromDraft(p.id)}>quitar</button>
          </li>
        ))}
      </ul>

      <input
        placeholder="Buscar pokémon por nombre o id (ej. pikachu, 25)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        disabled={draftIsFull}
        style={{ width: '100%' }}
      />
      <small style={{ color: '#666' }}>
        {draftIsFull ? 'El equipo está completo.' : 'Escribe el nombre completo; la búsqueda es exacta.'}
      </small>
      <div style={{ minHeight: 48, marginTop: 8 }}>
        {search.status === 'loading' && <span>Buscando…</span>}
        {search.status === 'not-found' && <span>No existe un pokémon "{search.term}".</span>}
        {search.status === 'error' && <span style={{ color: 'crimson' }}>{search.message}</span>}
        {search.status === 'found' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {search.pokemon.sprite && <img src={search.pokemon.sprite} alt="" width={48} height={48} />}
            <span>
              #{search.pokemon.id} {search.pokemon.name}
            </span>
            <button
              onClick={() => addToDraft(search.pokemon)}
              disabled={draftIsFull || draft.some((p) => p.id === search.pokemon.id)}
            >
              + agregar
            </button>
          </div>
        )}
      </div>

      <button onClick={createTeam} disabled={!teamName.trim() || draft.length === 0}>
        Crear equipo
      </button>

      <h2>Mis equipos ({teams.length})</h2>
      <ul>
        {teams.map((t) => (
          <li key={t.id}>
            <strong>{t.name}</strong>: {t.members.map((m) => m.pokemonName).join(', ')}{' '}
            <button onClick={() => deleteTeam(t)}>eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
