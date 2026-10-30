import * as teamsService from '../services/teams.service.js';
import { asyncHandler } from '../utils/async-handler.js';

/** GET /api/teams — lista los equipos del usuario autenticado. */
export const listTeams = asyncHandler(async (req, res) => {
  const teams = await teamsService.listTeams(req.user.id);
  res.json({ data: teams });
});

/** POST /api/teams — crea un equipo (`name` + arreglo `pokemon`). */
export const createTeam = asyncHandler(async (req, res) => {
  const team = await teamsService.createTeam(req.user.id, req.body);
  res.status(201).json(team);
});

/** DELETE /api/teams/:id — elimina un equipo del usuario. */
export const deleteTeam = asyncHandler(async (req, res) => {
  await teamsService.deleteTeam(req.user.id, req.params.id);
  res.status(204).send();
});
