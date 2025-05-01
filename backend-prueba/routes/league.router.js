const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/league.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Ajusta si tu middleware tiene otro nombre

// Proteger las rutas con autenticación
router.use(authMiddleware);

// Crear liga
router.post('/', leagueController.createLeague);

// Obtener ligas del usuario autenticado
router.get('/mine', leagueController.getUserLeagues);

// Obtener equipo random
router.post('/:leagueId/assign-random-team', leagueController.assignRandomTeam);

module.exports = router;
