// points.router.js
const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Obtener puntos de un equipo por jornada
router.get('/league/:leagueId/matchday/:matchday', authMiddleware, pointsController.getTeamPointsForMatchday);

// Añadir esta nueva ruta
router.get('/league/:leagueId/standings', authMiddleware, pointsController.getLeagueStandingsByPoints);

module.exports = router;
