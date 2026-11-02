import { api } from './client';

export interface PokemonRef {
  id: number;
  name: string;
}

interface PokemonPage {
  count: number;
  results: { name: string; url: string }[];
}

const PAGE_SIZE = 100; // máximo que acepta GET /api/pokemon

let indexPromise: Promise<PokemonRef[]> | null = null;

function toRefs(page: PokemonPage): PokemonRef[] {
  return page.results.map((p) => ({
    name: p.name,
    id: Number(p.url.match(/\/pokemon\/(\d+)\/?$/)?.[1]),
  }));
}

async function fetchIndex(): Promise<PokemonRef[]> {
  const first = await api.get<PokemonPage>(`/pokemon?limit=${PAGE_SIZE}&offset=0`);
  const offsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < first.count; offset += PAGE_SIZE) offsets.push(offset);

  const rest = await Promise.all(
    offsets.map((offset) => api.get<PokemonPage>(`/pokemon?limit=${PAGE_SIZE}&offset=${offset}`)),
  );
  return [first, ...rest].flatMap(toRefs);
}

/**
 * Índice { id, name } de todos los pokémon (ver ADR-0010). Se pide una sola
 * vez por carga de la página; si falla, se descarta para poder reintentar.
 */
export function loadPokemonIndex(): Promise<PokemonRef[]> {
  if (!indexPromise) {
    indexPromise = fetchIndex().catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

/** Sugerencias locales: un número busca por id; si no, primero prefijo y luego "contiene". */
export function searchPokemon(index: PokemonRef[], query: string, limit = 8): PokemonRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (/^\d+$/.test(q)) return index.filter((p) => p.id === Number(q)).slice(0, limit);

  const starts = index.filter((p) => p.name.startsWith(q));
  const contains = index.filter((p) => !p.name.startsWith(q) && p.name.includes(q));
  return [...starts, ...contains].slice(0, limit);
}
