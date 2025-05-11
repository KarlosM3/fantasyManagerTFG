const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Sincronizar puntos desde API externa
router.post('/sync/:matchday', authMiddleware, pointsController.syncPointsFromExternalAPI);

// Obtener puntos del equipo por jornada
router.get('/team/:teamId/matchday/:matchday', authMiddleware, pointsController.getTeamPointsByMatchday);

// Obtener historial de puntos por jornada
router.get('/team/:teamId/history', authMiddleware, pointsController.getTeamPointsHistory);

// Obtener clasificación de la liga por puntos
router.get('/league/:leagueId/standings', authMiddleware, pointsController.getLeagueStandingsByPoints);

module.exports = router;
