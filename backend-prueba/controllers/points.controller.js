const axios = require('axios');
const PlayerScore = require('../models/playerScore.model');
const TeamPoints = require('../models/teamPoints.model');
const Team = require('../models/team.model');

// Sincronizar puntos desde la API externa
exports.syncPointsFromExternalAPI = async (req, res) => {
  try {
    const { matchday } = req.params;
    
    // Obtener datos de la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const externalPlayers = response.data;
    
    let updatedCount = 0;
    
    // Para cada jugador en la API externa
    for (const externalPlayer of externalPlayers) {
      // Buscar la jornada específica en weekPoints
      const matchdayData = externalPlayer.weekPoints?.find(wp => wp.weekNumber == matchday);
      
      if (matchdayData) {
        // Guardar o actualizar los puntos (usando el ID externo directamente)
        await PlayerScore.findOneAndUpdate(
          { player: externalPlayer.id, matchday: matchday },
          { 
            points: matchdayData.points,
            stats: {
              totalPoints: externalPlayer.points,
              averagePoints: externalPlayer.averagePoints
            }
          },
          { upsert: true, new: true }
        );
        
        updatedCount++;
      }
    }
    
    // Actualizar los puntos de todos los equipos para esta jornada
    await updateTeamPointsForMatchday(matchday);
    
    res.status(200).json({
      success: true,
      message: `Puntos sincronizados correctamente. ${updatedCount} jugadores actualizados.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error al sincronizar puntos: ${error.message}`
    });
  }
};

// Función para calcular los puntos de un equipo
async function calculateTeamPoints(teamId, matchday) {
  // Obtener el equipo con sus jugadores
  const team = await Team.findById(teamId);
  if (!team || !team.players || team.players.length === 0) return 0;
  
  // Verificar si el equipo tiene 11 jugadores en startingEleven
  const hasCompleteTeam = team.startingEleven && team.startingEleven.length === 11;
  if (!hasCompleteTeam) return 0; // No dar puntos si no tiene equipo completo
  
  // Obtener los IDs de los jugadores externos
  const externalPlayerIds = team.players.map(player => player.toString());
  
  // Obtener los puntos de estos jugadores para la jornada específica
  const playerScores = await PlayerScore.find({
    player: { $in: externalPlayerIds },
    matchday: matchday
  });
  
  // Sumar los puntos
  return playerScores.reduce((sum, score) => sum + score.points, 0);
}

// Función auxiliar para actualizar puntos de equipos
async function updateTeamPointsForMatchday(matchday) {
  // Obtener todos los equipos
  const teams = await Team.find();
  
  for (const team of teams) {
    // Calcular puntos del equipo
    const totalPoints = await calculateTeamPoints(team._id, matchday);
    
    // Guardar o actualizar los puntos del equipo
    await TeamPoints.findOneAndUpdate(
      { team: team._id, matchday: matchday },
      { points: totalPoints },
      { upsert: true, new: true }
    );
    
    // Si el equipo tiene 11 jugadores, incrementar el contador de jornadas jugadas
    if (team.startingEleven && team.startingEleven.length === 11 && totalPoints > 0) {
      await Team.findByIdAndUpdate(
        team._id,
        { $inc: { matchdaysPlayed: 1 } },
        { new: true }
      );
    }
  }
}

// Obtener puntos de un equipo por jornada
exports.getTeamPointsByMatchday = async (req, res) => {
  try {
    const { teamId, matchday } = req.params;
    
    // Obtener el equipo
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    // Obtener los jugadores del equipo
    const playerIds = team.players;
    
    // Obtener puntos de los jugadores para esta jornada (una sola consulta)
    const playerScores = await PlayerScore.find({ 
      player: { $in: playerIds }, 
      matchday: parseInt(matchday) 
    });
    
    // Obtener datos de todos los jugadores desde la API externa (una sola vez)
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const externalPlayers = response.data;
    
    // Mapear los resultados
    const formattedScores = playerIds.map(playerId => {
      // Buscar puntos en los resultados de la consulta
      const score = playerScores.find(s => s.player.toString() === playerId.toString());
      
      // Buscar datos del jugador en los resultados de la API
      const externalPlayer = externalPlayers.find(p => p.id === playerId.toString());
      
      if (!externalPlayer) return null;
      
      return {
        id: externalPlayer.id,
        name: externalPlayer.name,
        nickname: externalPlayer.nickname || externalPlayer.name,
        position: externalPlayer.position,
        positionId: externalPlayer.positionId,
        marketValue: externalPlayer.marketValue,
        images: externalPlayer.images,
        team: externalPlayer.team,
        points: score ? score.points : 0
      };
    }).filter(score => score !== null);
    
    res.status(200).json({
      success: true,
      data: formattedScores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener historial de puntos por jornada
// Obtener historial de puntos por jornada
exports.getTeamPointsHistory = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    console.log(`Buscando equipo con ID: ${teamId}`);
    const team = await Team.findById(teamId);
    console.log(`Equipo encontrado: ${team ? 'Sí' : 'No'}`);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: `Equipo con ID ${teamId} no encontrado`
      });
    }
    
    // Obtener historial de puntos del equipo
    const pointsHistory = await TeamPoints.find({ team: teamId })
      .sort({ matchday: 1 });
    
    console.log(`Puntos encontrados: ${pointsHistory.length}`);
    
    // Formatear la respuesta
    const formattedHistory = pointsHistory.map(entry => ({
      matchday: entry.matchday,
      total_points: entry.points,
      date: entry.createdAt || new Date()
    }));
    
    // Enviar respuesta
    res.status(200).json({
      success: true,
      data: formattedHistory
    });
  } catch (error) {
    console.error(`Error en getTeamPointsHistory: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// Obtener clasificación de la liga por puntos
exports.getLeagueStandingsByPoints = async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    // Obtener todos los equipos de la liga
    const teams = await Team.find({ league: leagueId }).populate('user');
    
    // Calcular puntos totales para cada equipo
    const standings = [];
    
    for (const team of teams) {
      // Obtener todos los puntos del equipo
      const teamPoints = await TeamPoints.find({ team: team._id });
      
      // Calcular puntos totales y jornadas jugadas
      const totalPoints = teamPoints.reduce((sum, entry) => sum + entry.points, 0);
      const matchdaysPlayed = team.matchdaysPlayed || 0;
      
      standings.push({
        id: team._id,
        name: team.user.name || `Equipo sin nombre`,
        user_id: team.user._id,
        username: team.user.name,
        total_points: totalPoints,
        matchdays_played: matchdaysPlayed
      });
    }
    
    // Ordenar por puntos (de mayor a menor)
    standings.sort((a, b) => b.total_points - a.total_points);
    
    res.status(200).json({
      success: true,
      data: standings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};