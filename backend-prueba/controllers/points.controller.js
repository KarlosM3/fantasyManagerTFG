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


// Calcular la clasificación de la liga por puntos
exports.getLeagueStandingsByPoints = async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Obtener la liga para conocer la jornada de creación
    const League = require('../models/league.model');
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }

    const creationMatchday = league.creationMatchday || 1;
    console.log(`Liga ${league.name} creada en jornada ${creationMatchday}`);

    // Obtener todos los equipos de la liga
    const teams = await Team.find({ league: leagueId }).populate('user', 'username name');

    // Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;

    // Obtener la jornada actual
    const currentMatchday = getCurrentMatchday(allPlayers);
    console.log(`Jornada actual: ${currentMatchday}`);

    // Calcular puntos para cada equipo solo desde creationMatchday
    // Calcular puntos para cada equipo solo desde creationMatchday
    const standings = await Promise.all(teams.map(async (team) => {
      const playerIds = team.playersData.map(player => player.id);

      let totalPoints = 0;
      let matchdaysPlayed = 0;

      for (let matchday = creationMatchday; matchday <= currentMatchday; matchday++) {
        // Pasar el equipo completo
        const matchdayPoints = calculateTeamPointsForMatchday(team, playerIds, allPlayers, matchday, creationMatchday);
        if (matchdayPoints > 0) {
          totalPoints += matchdayPoints;
          matchdaysPlayed++;
        }
      }

      return {
        team_id: team._id,
        user_id: team.user._id,
        name: team.user.username || team.user.name || 'Usuario',
        total_points: totalPoints,
        matchdays_played: matchdaysPlayed,
        avg_points: matchdaysPlayed > 0 ? (totalPoints / matchdaysPlayed).toFixed(1) : '0'
      };
    }));


    standings.sort((a, b) => b.total_points - a.total_points);
    console.log(`Clasificación generada con ${standings.length} equipos`);

    res.status(200).json({ success: true, data: standings });
  } catch (error) {
    console.error('Error al obtener clasificación por puntos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};




// Función auxiliar para obtener la jornada actual
function getCurrentMatchday(players) {
  let maxMatchday = 0;
  
  players.forEach(player => {
    if (player.weekPoints && player.weekPoints.length > 0) {
      player.weekPoints.forEach(wp => {
        if (wp.weekNumber > maxMatchday) {
          maxMatchday = wp.weekNumber;
        }
      });
    }
  });
  
  return maxMatchday;
}

// Función auxiliar para calcular puntos de un equipo en una jornada
function calculateTeamPointsForMatchday(team, playerIds, allPlayers, matchday, creationMatchday) {
  // Verificar que la jornada sea posterior a la creación de la liga
  if (matchday < creationMatchday) {
    return 0; // No contar jornadas anteriores a la creación de la liga
  }
  
  // Verificar si el equipo tiene presupuesto negativo al inicio de la jornada
  if (team.budget < 0) {
    console.log(`Equipo ${team.user.username || 'desconocido'}: No puntúa en jornada ${matchday} por presupuesto negativo`);
    return 0; // No puntuar si el equipo está en números rojos
  }
  
  // Verificar si hay alineación guardada (startingEleven)
  const startingEleven = team.startingEleven || [];
  
  // Si no hay alineación, no puntúa
  if (startingEleven.length === 0) {
    console.log(`Equipo ${team.user.name || 'desconocido'}: No puntúa en jornada ${matchday} por falta de alineación`);
    return 0;
  }
  
  // Filtrar jugadores del equipo que están en la alineación
  const teamPlayers = allPlayers.filter(player => 
    playerIds.includes(player.id) && startingEleven.some(p => p.id === player.id)
  );
  
  // Verificar si hay datos válidos para esta jornada
  let hasValidData = false;
  let totalPoints = 0;
  
  // Contar posiciones vacías (placeholders)
  const placeholders = startingEleven.filter(player => 
    player.id && player.id.startsWith('placeholder')
  );
  const emptyPositions = placeholders.length;
  
  // Aplicar penalización por posiciones vacías
  // Si todas las posiciones están vacías, no se aplica penalización
  if (emptyPositions > 0 && emptyPositions < 11) {
    totalPoints -= emptyPositions * 4; // -4 puntos por cada posición vacía
    console.log(`Equipo ${team.user.username || 'desconocido'}: Penalización de ${emptyPositions * 4} puntos por ${emptyPositions} posiciones vacías`);
  } else if (emptyPositions === 11) {
    console.log(`Equipo ${team.user.username || 'desconocido'}: No puntúa en jornada ${matchday} por tener todas las posiciones vacías`);
    return 0; // No puntuar si todas las posiciones están vacías
  }
  
  // Obtener el ID del capitán
  const captainId = team.captain;
  
  // Calcular puntos para cada jugador alineado
  teamPlayers.forEach(player => {
    const matchdayData = player.weekPoints?.find(wp => wp.weekNumber === matchday);
    if (matchdayData) {
      hasValidData = true;
      
      // Calcular puntos base del jugador
      let playerPoints = matchdayData.points;
      
      // Aplicar puntos dobles si es el capitán
      if (captainId && player.id === captainId) {
        playerPoints *= 2; // Duplicar puntos del capitán
        console.log(`Capitán ${player.nickname || player.id}: ${playerPoints} puntos (x2) en jornada ${matchday}`);
      } else {
        console.log(`Jugador ${player.nickname || player.id}: ${playerPoints} puntos en jornada ${matchday}`);
      }
      
      totalPoints += playerPoints;
    }
  });
  
  // Solo devolver puntos si hay datos válidos para esta jornada
  if (hasValidData) {
    console.log(`Equipo ${team.user.username || 'desconocido'}: Total ${totalPoints} puntos en jornada ${matchday}`);
    return totalPoints;
  } else {
    return 0;
  }
}




