import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import { loadPokemonIndex, searchPokemon, type PokemonRef } from '../api/pokemonIndex';
import { useAuth } from '../context/AuthContext';
import { MAX_TEAM_MEMBERS, useTeamDraft } from '../context/TeamDraftContext';
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

const FILTER_DEBOUNCE_MS = 150;

/**
 * Pantalla de Equipos: autocompletado local sobre el índice de pokémon
 * (ver ADR-0010), arma un equipo de hasta 6 y lo guarda en /api/teams.
 * El borrador se comparte con la Pokédex (ADR-0012).
 */
export function Teams() {
  const { logout } = useAuth();
  const draft = useTeamDraft();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState<PokemonRef[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, FILTER_DEBOUNCE_MS);
  const [highlighted, setHighlighted] = useState(0);

  const [teamName, setTeamName] = useState('');

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

  function addToDraft(pokemon: PokemonRef) {
    if (draft.isFull || draft.has(pokemon.id)) return;
    draft.add(pokemon);
    setTerm('');
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
      const pick = settled ? current[highlighted] : current.find((p) => !draft.has(p.id));
      if (pick) addToDraft(pick);
    } else if (e.key === 'Escape') {
      setTerm('');
    }
  }

  const missing = [
    ...(teamName.trim() ? [] : ['nombre del equipo']),
    ...(draft.draft.length > 0 ? [] : ['al menos 1 pokémon']),
  ];

  async function createTeam() {
    try {
      setError(null);
      await api.post('/teams', { name: teamName, pokemon: draft.draft.map((p) => p.name) });
      setTeamName('');
      draft.clear();
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
    <div className="page">
      <div className="page-header">
        <h1>Pokédex — Equipos</h1>
        <button onClick={logout}>Salir</button>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>
          Nuevo equipo ({draft.draft.length}/{MAX_TEAM_MEMBERS})
        </h2>
        <input
          placeholder="Nombre del equipo"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={50}
        />
        <ul className="chips">
          {draft.draft.map((p) => (
            <li key={p.id} className="chip">
              #{p.id} {p.name}
              <button onClick={() => draft.remove(p.id)} aria-label={`Quitar ${p.name}`} title="Quitar">
                ×
              </button>
            </li>
          ))}
        </ul>

        <input
          className="full-width"
          placeholder="Buscar pokémon por nombre o número (ej. pika, 25)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={onSearchKeyDown}
          disabled={draft.isFull}
        />
        <small className="muted">
          {draft.isFull
            ? 'El equipo está completo.'
            : index
              ? '↑/↓ para elegir, Enter para agregar. También puedes agregar desde la Pokédex.'
              : indexError
                ? null
                : 'Cargando catálogo…'}
        </small>
        {indexError && (
          <p className="error">
            {indexError} <button onClick={loadIndex}>Reintentar</button>
          </p>
        )}

        {!draft.isFull && suggestions.length > 0 && (
          <ul className="suggestions card" role="listbox">
            {suggestions.map((p, i) => (
              <li key={p.id} style={{ margin: 0 }}>
                <button
                  className="suggestion"
                  role="option"
                  aria-selected={i === highlighted}
                  onClick={() => addToDraft(p)}
                  onMouseEnter={() => setHighlighted(i)}
                  disabled={draft.has(p.id)}
                >
                  #{p.id} {p.name} {draft.has(p.id) && <small className="muted">(ya en el equipo)</small>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!draft.isFull && index && debouncedTerm.trim() && suggestions.length === 0 && (
          <p className="muted">Ningún pokémon coincide con "{debouncedTerm.trim()}".</p>
        )}

        <div className="form-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={createTeam} disabled={missing.length > 0}>
            Crear equipo
          </button>
          {missing.length > 0 && <small className="muted">Falta: {missing.join(' y ')}.</small>}
        </div>
      </section>

      <h2>Mis equipos ({teams.length})</h2>
      {teams.length === 0 && <p className="muted">Todavía no tienes equipos.</p>}
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.id} className="card team-card">
            <div>
              <strong>{t.name}</strong>
              <div className="muted team-members">{t.members.map((m) => m.pokemonName).join(', ')}</div>
            </div>
            <button onClick={() => deleteTeam(t)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
