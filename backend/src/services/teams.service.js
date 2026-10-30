import { sequelize, Team, TeamMember } from '../models/index.js';
import { assertSpeciesExists } from './pokeapi.service.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Reglas de negocio del módulo Teams (ver docs/adr/).
 *
 * Todas las operaciones reciben el `userId` del usuario autenticado y filtran
 * por él en la propia query: un equipo ajeno es indistinguible de uno
 * inexistente (404).
 */

const MIN_MEMBERS = 1;
const MAX_MEMBERS = 6;
const MAX_NAME_LENGTH = 50;

const withMembers = {
  include: [{ model: TeamMember, as: 'members' }],
  order: [
    ['created_at', 'DESC'],
    ['id', 'DESC'],
    [{ model: TeamMember, as: 'members' }, 'id', 'ASC'],
  ],
};

function isValidPokemonRef(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  return Number.isInteger(value) && value > 0;
}

/** Valida la forma del cuerpo (400) y devuelve los datos normalizados. */
function parseTeamInput(body = {}) {
  const { name, pokemon } = body;

  if (typeof name !== 'string' || !name.trim()) {
    throw HttpError.badRequest('El campo "name" es obligatorio y debe ser un texto no vacío');
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw HttpError.badRequest(`El campo "name" admite máximo ${MAX_NAME_LENGTH} caracteres`);
  }
  if (!Array.isArray(pokemon)) {
    throw HttpError.badRequest('El campo "pokemon" debe ser un arreglo de nombres o ids');
  }
  if (!pokemon.every(isValidPokemonRef)) {
    throw HttpError.badRequest('Cada pokémon debe ser un nombre o un id entero positivo');
  }

  return { name: name.trim(), pokemon };
}

/** Regla de cardinalidad: entre 1 y 6 miembros (422). Sin I/O. */
function assertTeamSize(pokemon) {
  if (pokemon.length < MIN_MEMBERS || pokemon.length > MAX_MEMBERS) {
    throw HttpError.unprocessable(
      `Un equipo debe tener entre ${MIN_MEMBERS} y ${MAX_MEMBERS} pokémon (recibidos: ${pokemon.length})`,
    );
  }
}

/** Sin pokémon repetidos, comparando por id canónico de la PokeAPI (409). */
function assertNoDuplicates(species) {
  const seen = new Set();
  for (const { id, name } of species) {
    if (seen.has(id)) {
      throw HttpError.conflict(`"${name}" está repetido en el equipo`);
    }
    seen.add(id);
  }
}

/** Lista los equipos del usuario con sus miembros. */
export async function listTeams(userId) {
  return Team.findAll({ where: { userId }, ...withMembers });
}

/** Crea un equipo validando forma, cardinalidad, especies y duplicados. */
export async function createTeam(userId, body) {
  const { name, pokemon } = parseTeamInput(body);
  assertTeamSize(pokemon);

  // Reutiliza el servicio de PokeAPI (caché + 422 si no existe).
  const species = await Promise.all(pokemon.map((ref) => assertSpeciesExists(ref)));
  assertNoDuplicates(species);

  // Sólo escrituras locales dentro de la transacción (nada de red).
  const team = await sequelize.transaction(async (transaction) => {
    const created = await Team.create({ name, userId }, { transaction });
    await TeamMember.bulkCreate(
      species.map((s) => ({ teamId: created.id, pokemonId: s.id, pokemonName: s.name })),
      { transaction },
    );
    return created;
  });

  return Team.findByPk(team.id, withMembers);
}

/** Elimina un equipo del usuario; 404 si no existe o es ajeno. */
export async function deleteTeam(userId, teamId) {
  // SQLite convierte '1.0' en 1 por afinidad de tipos; sólo aceptamos dígitos.
  if (!/^\d+$/.test(String(teamId))) {
    throw HttpError.notFound('Equipo no encontrado');
  }
  const deleted = await Team.destroy({ where: { id: teamId, userId } });
  if (!deleted) {
    throw HttpError.notFound('Equipo no encontrado');
  }
}
