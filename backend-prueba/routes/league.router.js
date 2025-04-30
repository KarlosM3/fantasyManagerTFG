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

module.exports = router;
