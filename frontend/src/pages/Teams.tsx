import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import { loadPokemonIndex, searchPokemon, type PokemonRef } from '../api/pokemonIndex';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

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

const MAX_MEMBERS = 6;
const FILTER_DEBOUNCE_MS = 150;

/**
 * Pantalla de Equipos: autocompletado local sobre el índice de pokémon
 * (ver ADR-0010), arma un equipo de hasta 6 y lo guarda en /api/teams.
 */
export function Teams() {
  const { logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState<PokemonRef[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, FILTER_DEBOUNCE_MS);
  const [highlighted, setHighlighted] = useState(0);

  const [teamName, setTeamName] = useState('');
  const [draft, setDraft] = useState<PokemonRef[]>([]);

  async function loadTeams() {
    const res = await api.get<{ data: Team[] }>('/teams');
    setTeams(res.data);
  }

  function loadIndex() {
    setIndexError(null);
    loadPokemonIndex()
      .then(setIndex)
      .catch((err) => setIndexError(err instanceof Error ? err.message : 'Error al cargar el catálogo'));
  }

  useEffect(() => {
    loadTeams().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'));
    loadIndex();
  }, []);

  const suggestions = useMemo(
    () => (index ? searchPokemon(index, debouncedTerm) : []),
    [index, debouncedTerm],
  );

  useEffect(() => setHighlighted(0), [debouncedTerm]);

  const draftIsFull = draft.length >= MAX_MEMBERS;
  const inDraft = (p: PokemonRef) => draft.some((d) => d.id === p.id);

  function addToDraft(pokemon: PokemonRef) {
    if (draftIsFull || inDraft(pokemon)) return;
    setDraft([...draft, pokemon]);
    setTerm('');
  }

  function removeFromDraft(id: number) {
    setDraft(draft.filter((p) => p.id !== id));
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setHighlighted((h) => Math.min(Math.max(h + step, 0), Math.max(suggestions.length - 1, 0)));
    } else if (e.key === 'Enter') {
      // Si el debounce aún no se aplicó, se busca con el texto actual.
      const settled = term === debouncedTerm;
      const current = settled ? suggestions : index ? searchPokemon(index, term) : [];
      const pick = settled ? current[highlighted] : current.find((p) => !inDraft(p));
      if (pick) addToDraft(pick);
    } else if (e.key === 'Escape') {
      setTerm('');
    }
  }

  const missing = [
    ...(teamName.trim() ? [] : ['nombre del equipo']),
    ...(draft.length > 0 ? [] : ['al menos 1 pokémon']),
  ];

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
            #{p.id} {p.name} <button onClick={() => removeFromDraft(p.id)}>quitar</button>
          </li>
        ))}
      </ul>

      <input
        placeholder="Buscar pokémon por nombre o número (ej. pika, 25)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={onSearchKeyDown}
        disabled={draftIsFull}
        style={{ width: '100%' }}
      />
      <small style={{ color: '#666' }}>
        {draftIsFull
          ? 'El equipo está completo.'
          : index
            ? '↑/↓ para elegir, Enter para agregar.'
            : indexError
              ? null
              : 'Cargando catálogo…'}
      </small>
      {indexError && (
        <p style={{ color: 'crimson' }}>
          {indexError} <button onClick={loadIndex}>Reintentar</button>
        </p>
      )}

      {!draftIsFull && suggestions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', border: '1px solid #ddd' }}>
          {suggestions.map((p, i) => (
            <li key={p.id} style={{ background: i === highlighted ? '#eef' : undefined }}>
              <button
                onClick={() => addToDraft(p)}
                onMouseEnter={() => setHighlighted(i)}
                disabled={inDraft(p)}
                style={{ all: 'unset', display: 'block', width: '100%', padding: '4px 8px', cursor: 'pointer' }}
              >
                #{p.id} {p.name} {inDraft(p) && <small style={{ color: '#666' }}>(ya en el equipo)</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!draftIsFull && index && debouncedTerm.trim() && suggestions.length === 0 && (
        <p style={{ color: '#666' }}>Ningún pokémon coincide con "{debouncedTerm.trim()}".</p>
      )}

      <p>
        <button onClick={createTeam} disabled={missing.length > 0}>
          Crear equipo
        </button>{' '}
        {missing.length > 0 && <small style={{ color: '#666' }}>Falta: {missing.join(' y ')}.</small>}
      </p>

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
