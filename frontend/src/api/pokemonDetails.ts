import { api } from './client';

export interface PokemonDetail {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
}

// Caché de promesas por nombre: como máximo una petición por pokémon (ver ADR-0015).
const pending = new Map<string, Promise<PokemonDetail>>();
const resolved = new Map<string, PokemonDetail>();

const key = (name: string) => name.trim().toLowerCase();

/** Guarda detalles ya conocidos (p. ej. una página de la Pokédex) para no volver a pedirlos. */
export function primeDetails(list: PokemonDetail[]): void {
  for (const p of list) {
    resolved.set(key(p.name), p);
    pending.set(key(p.name), Promise.resolve(p));
  }
}

/** Devuelve el detalle si ya está en caché, sin pedirlo. */
export function peekDetail(name: string): PokemonDetail | null {
  return resolved.get(key(name)) ?? null;
}

export function getPokemonDetail(name: string): Promise<PokemonDetail> {
  const k = key(name);
  let request = pending.get(k);
  if (!request) {
    request = api.get<PokemonDetail>(`/pokemon/${encodeURIComponent(k)}`);
    pending.set(k, request);
    request.then(
      (detail) => resolved.set(k, detail),
      () => pending.delete(k), // permite reintentar si falla
    );
  }
  return request;
}
