// points.controller.js
const axios = require('axios');
const Team = require('../models/team.model');

// Obtener puntos de todos los jugadores de un equipo para una jornada
// points.controller.js
exports.getTeamPointsForMatchday = async (req, res) => {
  try {
    const { leagueId, matchday } = req.params;
    const matchdayNum = parseInt(matchday, 10);
    
    console.log(`Obteniendo puntos para liga ${leagueId}, jornada ${matchdayNum}`);
    
    // 1. Obtener el equipo del usuario en esa liga
    const team = await Team.findOne({ 
      league: leagueId, 
      user: req.user.id 
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    // 2. Acceder a playersData en lugar de players
    const playerIds = team.playersData.map(player => player.id);
    
    console.log(`Equipo encontrado: ${team._id}, jugadores: ${playerIds.join(', ')}`);
    
    // 3. Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    console.log(`Obtenidos ${allPlayers.length} jugadores de la API externa`);
    
    // 4. Filtrar solo los jugadores del equipo
    const teamPlayers = allPlayers.filter(player => 
      playerIds.includes(player.id)
    );
    
    console.log(`Filtrados ${teamPlayers.length} jugadores que pertenecen al equipo`);
    
    // 5. Para cada jugador, buscar los puntos de la jornada específica
    const playersWithPoints = teamPlayers.map(player => {
      // Buscar la jornada específica en weekPoints
      const matchdayData = player.weekPoints?.find(wp => wp.weekNumber === matchdayNum);
      
      return {
        ...player,
        points: matchdayData ? matchdayData.points : 0
      };
    });
    
    // 6. Devolver los datos
    res.status(200).json({
      success: true,
      data: {
        team: {
          id: team._id,
          formation: team.formation,
          players: playersWithPoints
        },
        matchday: matchdayNum
      }
    });
  } catch (error) {
    console.error('Error al obtener puntos del equipo:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
