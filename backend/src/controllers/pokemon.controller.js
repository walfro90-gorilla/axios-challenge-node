import * as pokeapi from '../services/pokeapi.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';

/**
 * GET /api/pokemon?limit&offset[&details=true] — listado paginado (proxy de PokeAPI).
 * Con `details=true` cada resultado trae { id, name, sprite, types } (ver ADR-0011).
 */
export const listHandler = asyncHandler(async (req, res) => {
  const data = await pokeapi.listPokemon({
    limit: req.query.limit,
    offset: req.query.offset,
  });
  if (req.query.details !== 'true') {
    return res.json(data);
  }

  const details = await Promise.all(data.results.map((p) => pokeapi.getPokemon(p.name)));
  res.json({ count: data.count, results: details.filter(Boolean) });
});

/** GET /api/pokemon/:name — detalle simplificado de un pokémon. */
export const detailHandler = asyncHandler(async (req, res) => {
  // Un nombre que no es slug no existe; no se consulta la PokeAPI (respondería 403 → 502, ADR-0016).
  if (!/^[a-z0-9-]+$/i.test(req.params.name.trim())) {
    throw HttpError.notFound(`Pokémon "${req.params.name}" no encontrado`);
  }
  const pokemon = await pokeapi.getPokemon(req.params.name);
  if (!pokemon) {
    throw HttpError.notFound(`Pokémon "${req.params.name}" no encontrado`);
  }
  res.json(pokemon);
});
