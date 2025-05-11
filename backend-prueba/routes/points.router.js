// points.router.js
const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Al inicio de points.router.js
router.use((req, res, next) => {
  console.log(`Recibida solicitud a: ${req.method} ${req.originalUrl}`);
  next();
});

// Sincronizar puntos desde API externa
router.post('/sync/:matchday', authMiddleware, pointsController.syncPointsFromExternalAPI);

// Obtener puntos de un equipo por jornada
router.get('/team/:teamId/matchday/:matchday', authMiddleware, pointsController.getTeamPointsByMatchday);

// Obtener historial de puntos por jornada
router.get('/team/:teamId/history', authMiddleware, pointsController.getTeamPointsHistory);

// Obtener clasificación de la liga por puntos
router.get('/league/:leagueId/standings', authMiddleware, pointsController.getLeagueStandingsByPoints);

module.exports = router;
