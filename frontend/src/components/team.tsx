import type { PokemonRef } from '../api/pokemonIndex';
import { MAX_TEAM_MEMBERS, useTeamDraft } from '../context/TeamDraftContext';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { PokeballIcon } from './icons';
import { PokemonSprite, TypeBadges } from './pokemon';

/** Casilla ocupada del equipo en armado: foto, nombre, tipos y botón para quitar. */
function FilledSlot({ pokemon, compact }: { pokemon: PokemonRef; compact: boolean }) {
  const draft = useTeamDraft();
  const detail = usePokemonDetail(pokemon.name);

  return (
    <li className="slot slot-filled" data-pokemon={pokemon.name}>
      <PokemonSprite sprite={detail?.sprite} name={pokemon.name} size={compact ? 40 : 80} />
      {!compact && (
        <>
          <span className="slot-name" title={pokemon.name}>
            {pokemon.name}
          </span>
          <TypeBadges types={detail?.types ?? []} />
        </>
      )}
      <button
        className="slot-remove"
        onClick={() => draft.remove(pokemon.id)}
        aria-label={`Quitar ${pokemon.name} del equipo`}
        title={`Quitar ${pokemon.name}`}
      >
        ×
      </button>
    </li>
  );
}

/** Las 6 casillas del equipo en armado (ocupadas y libres). */
export function TeamSlots({ compact = false }: { compact?: boolean }) {
  const { draft } = useTeamDraft();
  const free = MAX_TEAM_MEMBERS - draft.length;

  return (
    <ul className={`slots ${compact ? 'slots-compact' : ''}`} aria-label="Equipo en armado">
      {draft.map((p) => (
        <FilledSlot key={p.id} pokemon={p} compact={compact} />
      ))}
      {Array.from({ length: free }, (_, i) => (
        <li key={`free-${i}`} className="slot slot-empty" aria-label="Casilla libre">
          <PokeballIcon size={compact ? 18 : 28} />
          {!compact && <span className="muted">Libre</span>}
        </li>
      ))}
    </ul>
  );
}

/** Bandeja fija abajo con el equipo en armado (Pokédex y Favoritos). */
export function TeamTray({ onOpenTeams }: { onOpenTeams: () => void }) {
  const { draft } = useTeamDraft();
  if (draft.length === 0) return null;

  return (
    <aside className="tray" aria-label="Equipo en armado">
      <div className="tray-inner">
        <div className="tray-info">
          <strong>Equipo en armado</strong>
          <span className="muted">
            {draft.length}/{MAX_TEAM_MEMBERS}
          </span>
        </div>
        <TeamSlots compact />
        <button className="btn-primary" onClick={onOpenTeams}>
          Armar equipo →
        </button>
      </div>
    </aside>
  );
}
