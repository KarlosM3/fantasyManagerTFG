const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/league.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Ajusta si tu middleware tiene otro nombre
const marketController = require('../controllers/market.controller');

// Proteger las rutas con autenticación
router.use(authMiddleware);

// Crear liga
router.post('/', leagueController.createLeague);

// Obtener todos los equipos del usuario en todas las ligas
router.get('/my-teams', leagueController.getUserTeams);

// Obtener ligas del usuario autenticado
router.get('/mine', leagueController.getUserLeagues);

// Obtener equipo random
router.post('/:leagueId/assign-random-team', leagueController.assignRandomTeam);

// Obtener jugadores de una liga
router.get('/:leagueId/classification', leagueController.getLeagueClassification);

//Invitar a un usuario a una liga
router.get('/:leagueId/invite-link', leagueController.generateInviteLink);

// Generar código de invitación para una liga
router.post('/:leagueId/generate-invite-code', authMiddleware, leagueController.generateInviteCode);

// Unirse a una liga
router.post('/join', leagueController.joinLeagueByCode);

// Obtener codigo de invitación de una liga
router.get('/by-invite-code/:inviteCode', leagueController.getLeagueByInviteCode);

// Obtener mi equipo en una liga específica
router.get('/:leagueId/my-team', leagueController.getMyTeam);

//Insertar el capitan del equipo
router.put('/:leagueId/my-team/captain', leagueController.updateTeamCaptain);

//Insertar la formacion del equipo
router.put('/:leagueId/my-team/formation', leagueController.updateTeamFormation);

// Guardar cambios del equipo (formación, jugadores, capitán, etc.)
router.post('/:leagueId/my-team/save-changes', leagueController.saveTeamChanges);

//Guardar los jugadores en venta al mercado
router.post("/:leagueId/market/sell", authMiddleware, marketController.listPlayerForSale);

// Obtener una liga por ID
router.get('/:leagueId', leagueController.getLeagueById);



module.exports = router;
