import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PokemonRef } from '../api/pokemonIndex';

export const MAX_TEAM_MEMBERS = 6;

interface TeamDraftState {
  draft: PokemonRef[];
  isFull: boolean;
  has: (id: number) => boolean;
  add: (pokemon: PokemonRef) => void;
  remove: (id: number) => void;
  clear: () => void;
}

const TeamDraftContext = createContext<TeamDraftState | undefined>(undefined);

/**
 * Borrador del equipo en armado, compartido entre la Pokédex y Equipos
 * (ver ADR-0012). Sólo en memoria: se pierde al recargar.
 */
export function TeamDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PokemonRef[]>([]);

  const value: TeamDraftState = {
    draft,
    isFull: draft.length >= MAX_TEAM_MEMBERS,
    has: (id) => draft.some((p) => p.id === id),
    add: (pokemon) =>
      setDraft((current) =>
        current.length >= MAX_TEAM_MEMBERS || current.some((p) => p.id === pokemon.id)
          ? current
          : [...current, pokemon],
      ),
    remove: (id) => setDraft((current) => current.filter((p) => p.id !== id)),
    clear: () => setDraft([]),
  };

  return <TeamDraftContext.Provider value={value}>{children}</TeamDraftContext.Provider>;
}

export function useTeamDraft(): TeamDraftState {
  const ctx = useContext(TeamDraftContext);
  if (!ctx) throw new Error('useTeamDraft debe usarse dentro de <TeamDraftProvider>');
  return ctx;
}
