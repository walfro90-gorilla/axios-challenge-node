import { Router } from 'express';
import { listTeams, createTeam, deleteTeam } from '../controllers/teams.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de equipos requieren autenticación.
router.use(authenticate);

router.get('/', listTeams);
router.post('/', createTeam);
router.delete('/:id', deleteTeam);

export default router;
