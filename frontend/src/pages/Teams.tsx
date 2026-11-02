import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import { getPokemonDetail } from '../api/pokemonDetails';
import { loadPokemonIndex, searchPokemon, type PokemonRef } from '../api/pokemonIndex';
import { PokemonSprite, TypeBadges } from '../components/pokemon';
import { TeamSlots } from '../components/team';
import { useAuth } from '../context/AuthContext';
import { MAX_TEAM_MEMBERS, useTeamDraft } from '../context/TeamDraftContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface TeamMember {
  id: number;
  pokemonId: number;
  pokemonName: string;
  sprite: string | null;
  types: string[];
}

interface Team {
  id: number;
  name: string;
  members: TeamMember[];
}

const FILTER_DEBOUNCE_MS = 150;

/**
 * Completa foto y tipos de los miembros guardados antes del ADR-0014
 * (sin `sprite`), pidiendo el detalle una vez por pokémon.
 */
function useCompleteMembers(members: TeamMember[]): TeamMember[] {
  const [completed, setCompleted] = useState(members);

  useEffect(() => {
    setCompleted(members);
    const missing = members.filter((m) => !m.sprite && m.types.length === 0);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      members.map((m) =>
        missing.includes(m)
          ? getPokemonDetail(m.pokemonName)
              .then((d) => ({ ...m, sprite: d.sprite, types: d.types }))
              .catch(() => m)
          : m,
      ),
    ).then((list) => !cancelled && setCompleted(list));
    return () => {
      cancelled = true;
    };
  }, [members]);

  return completed;
}

function TeamCard({
  team,
  confirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  team: Team;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const members = useCompleteMembers(team.members);
  const coverage = [...new Set(members.flatMap((m) => m.types))];

  return (
    <li className="card team-card" data-team={team.name}>
      <div className="team-card-header">
        <div>
          <strong className="team-name">{team.name}</strong>
          <span className="muted">
            {' '}
            · {members.length}/{MAX_TEAM_MEMBERS}
          </span>
        </div>
        {confirming ? (
          <div className="form-row">
            <span className="muted">¿Eliminar este equipo?</span>
            <button onClick={onCancelDelete}>Cancelar</button>
            <button className="btn-danger" onClick={onDelete}>
              Sí, eliminar
            </button>
          </div>
        ) : (
          <button onClick={onAskDelete} aria-label={`Eliminar ${team.name}`}>
            Eliminar
          </button>
        )}
      </div>
      <ul className="team-members">
        {members.map((m) => (
          <li key={m.id} className="team-member" title={m.pokemonName}>
            <PokemonSprite sprite={m.sprite} name={m.pokemonName} size={72} />
            <span className="team-member-name">{m.pokemonName}</span>
          </li>
        ))}
      </ul>
      {coverage.length > 0 && (
        <div className="team-coverage">
          <span className="muted">Tipos:</span>
          <TypeBadges types={coverage} />
        </div>
      )}
    </li>
  );
}

/**
 * Pantalla de Equipos: arma un equipo de hasta 6 con autocompletado local
 * (ADR-0010) o desde la Pokédex/Favoritos (borrador compartido, ADR-0012),
 * y lista los equipos guardados con foto y tipos (ADR-0014/0015).
 */
export function Teams({ onExplore }: { onExplore: () => void }) {
  const { logout } = useAuth();
  const draft = useTeamDraft();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const [index, setIndex] = useState<PokemonRef[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, FILTER_DEBOUNCE_MS);
  const [highlighted, setHighlighted] = useState(0);

  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadTeams() {
    const res = await api.get<{ data: Team[] }>('/teams');
    setTeams(res.data);
  }

  function loadIndex() {
    setIndexError(null);
    loadPokemonIndex()
      .then(setIndex)
      .catch((err) =>
        setIndexError(err instanceof Error ? err.message : 'Error al cargar el catálogo'),
      );
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
      setCreating(true);
      await api.post('/teams', { name: teamName, pokemon: draft.draft.map((p) => p.name) });
      setTeamName('');
      draft.clear();
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el equipo');
    } finally {
      setCreating(false);
    }
  }

  async function deleteTeam(team: Team) {
    try {
      setError(null);
      setConfirmingId(null);
      await api.del(`/teams/${team.id}`);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el equipo');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Equipos</h1>
          <p className="muted lead">Arma equipos de hasta {MAX_TEAM_MEMBERS} pokémon.</p>
        </div>
        <button onClick={logout}>Salir</button>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="section-title">
          <h2>Nuevo equipo</h2>
          <span className="muted">
            {draft.draft.length}/{MAX_TEAM_MEMBERS}
          </span>
        </div>
        <input
          className="full-width"
          placeholder="Nombre del equipo"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={50}
          aria-label="Nombre del equipo"
        />

        <TeamSlots />

        <input
          className="full-width"
          placeholder="Buscar pokémon por nombre o número (ej. pika, 25)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={onSearchKeyDown}
          disabled={draft.isFull}
          aria-label="Buscar pokémon"
        />
        <small className="muted">
          {draft.isFull ? (
            'El equipo está completo.'
          ) : index ? (
            <>
              ↑/↓ para elegir, Enter para agregar. También puedes usar la pokéball desde la{' '}
              <button className="link" onClick={onExplore}>
                Pokédex
              </button>
              .
            </>
          ) : indexError ? null : (
            'Cargando catálogo…'
          )}
        </small>
        {indexError && (
          <p className="error">
            {indexError} <button onClick={loadIndex}>Reintentar</button>
          </p>
        )}

        {!draft.isFull && suggestions.length > 0 && (
          <ul className="suggestions card" role="listbox" aria-label="Sugerencias">
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
                  <span className="muted">#{p.id}</span>{' '}
                  <span className="capitalize">{p.name}</span>{' '}
                  {draft.has(p.id) && <small className="muted">(ya en el equipo)</small>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!draft.isFull && index && debouncedTerm.trim() && suggestions.length === 0 && (
          <p className="muted">Ningún pokémon coincide con "{debouncedTerm.trim()}".</p>
        )}

        <div className="form-row" style={{ marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={createTeam}
            disabled={missing.length > 0 || creating}
          >
            {creating ? 'Creando…' : 'Crear equipo'}
          </button>
          {missing.length > 0 && <small className="muted">Falta: {missing.join(' y ')}.</small>}
          {draft.draft.length > 0 && (
            <button className="link" onClick={draft.clear}>
              Vaciar
            </button>
          )}
        </div>
      </section>

      <div className="section-title">
        <h2>Mis equipos</h2>
        {teams && <span className="muted">{teams.length}</span>}
      </div>
      {teams && teams.length === 0 && (
        <p className="muted">Todavía no tienes equipos. ¡Arma el primero arriba!</p>
      )}
      <ul className="team-list">
        {teams?.map((t) => (
          <TeamCard
            key={t.id}
            team={t}
            confirming={confirmingId === t.id}
            onAskDelete={() => setConfirmingId(t.id)}
            onCancelDelete={() => setConfirmingId(null)}
            onDelete={() => deleteTeam(t)}
          />
        ))}
      </ul>
    </div>
  );
}
