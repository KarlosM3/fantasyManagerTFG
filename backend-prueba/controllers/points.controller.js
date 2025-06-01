// points.controller.js
const axios = require('axios');
const Team = require('../models/team.model');

// Obtener puntos de todos los jugadores de un equipo para una jornada

// Definir la función auxiliar para obtener la jornada actual
function getCurrentMatchday(players) {
  // Basándome en los datos de Oblak (hasta jornada 36), Giménez y Koke
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
  
  // Los datos van hasta jornada 36, pero según el calendario oficial estamos en jornada 38
  return Math.max(maxMatchday, 38); // Usar 36 como jornada actual basada en los datos reales
}

// Luego exporta el controlador que usa esa función
exports.getCurrentMatchday = async (req, res) => {
  try {
    // Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    // Usar la función auxiliar
    const currentMatchday = getCurrentMatchday(allPlayers);
    
    res.status(200).json({
      success: true,
      data: {
        matchday: currentMatchday
      }
    });
  } catch (error) {
    console.error('Error al obtener la jornada actual:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


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
    
    // 2. Obtener los IDs de jugadores en la alineación (startingEleven)
    const startingElevenIds = team.startingEleven?.map(player => player.id) || [];
    
    // Si no hay alineación, usar todos los jugadores del equipo
    const playerIds = startingElevenIds.length > 0 
      ? startingElevenIds 
      : team.playersData.map(player => player.id);
    
    console.log(`Equipo encontrado: ${team._id}, jugadores alineados: ${startingElevenIds.join(', ')}`);
    
    // 3. Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    console.log(`Obtenidos ${allPlayers.length} jugadores de la API externa`);
    
    // 4. Filtrar solo los jugadores alineados
    const teamPlayers = allPlayers.filter(player => 
      playerIds.includes(player.id) && !player.id.startsWith('placeholder')
    );
    
    console.log(`Filtrados ${teamPlayers.length} jugadores que pertenecen a la alineación`);
    
    // Obtener el ID del capitán
    const captainId = team.captain;
    
    // 5. Para cada jugador, buscar los puntos de la jornada específica
    const playersWithPoints = teamPlayers.map(player => {
      // Buscar la jornada específica en weekPoints
      const matchdayData = player.weekPoints?.find(wp => wp.weekNumber === matchdayNum);
      const points = matchdayData ? matchdayData.points : 0;
      
      // Marcar si es capitán y calcular puntos con bonificación
      const isCaptain = captainId === player.id;
      const effectivePoints = isCaptain ? points * 2 : points; // Puntos efectivos para el cálculo total
      
      return {
        ...player,
        points: points,
        effectivePoints: effectivePoints,
        isCaptain: isCaptain
      };
    });
    
    // Contar posiciones vacías (placeholders)
    const placeholders = team.startingEleven?.filter(player => 
      player.id && player.id.startsWith('placeholder')
    ) || [];
    const emptyPositions = placeholders.length;
    
    // Aplicar penalización por posiciones vacías
    let penaltyPoints = 0;
    if (emptyPositions > 0 && emptyPositions < 11) {
      penaltyPoints = emptyPositions * -4; // -4 puntos por cada posición vacía
      console.log(`Penalización de ${penaltyPoints} puntos por ${emptyPositions} posiciones vacías`);
    }
    
    // Calcular puntos totales considerando el capitán y las penalizaciones
    const totalPoints = playersWithPoints.reduce((sum, player) => sum + player.effectivePoints, 0) + penaltyPoints;
    
    // 6. Devolver los datos
    res.status(200).json({
      success: true,
      data: {
        team: {
          id: team._id,
          formation: team.formation,
          players: playersWithPoints,
          captainId: captainId,
          totalPoints: totalPoints,
          emptyPositions: emptyPositions,
          penaltyPoints: penaltyPoints
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

    // Obtener la liga
    const League = require('../models/league.model');
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }

    // Obtener todos los equipos de la liga
    const teams = await Team.find({ league: leagueId }).populate('user', 'username name');

    // Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;

    // Obtener la jornada actual basada en los datos reales
    const currentMatchday = getCurrentMatchday(allPlayers);
    console.log(`Jornada actual: ${currentMatchday}`);

    // Calcular puntos para cada equipo DESDE SU JORNADA DE INICIO INDIVIDUAL
    const standings = teams.map((team) => {
      const playerIds = team.playersData.map(player => player.id);
      let totalPoints = 0;
      let matchdaysPlayed = 0;

      // CORRECCIÓN: Usar joinedMatchday del equipo individual
      const teamStartingMatchday = team.joinedMatchday || league.creationMatchday || 1;
      
      console.log(`Equipo ${team.user?.username || team.user?.name || 'desconocido'}: empezó en jornada ${teamStartingMatchday}`);

      // Calcular puntos solo desde la jornada de inicio del equipo
      for (let matchday = teamStartingMatchday; matchday <= currentMatchday; matchday++) {
        const matchdayPoints = calculateTeamPointsForMatchday(team, playerIds, allPlayers, matchday, teamStartingMatchday);
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
        avg_points: matchdaysPlayed > 0 ? (totalPoints / matchdaysPlayed).toFixed(1) : '0',
        starting_matchday: teamStartingMatchday // Para debugging
      };
    });

    standings.sort((a, b) => b.total_points - a.total_points);

    console.log(`Clasificación generada con ${standings.length} equipos`);
    res.status(200).json({ success: true, data: standings });
  } catch (error) {
    console.error('Error al obtener clasificación por puntos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};




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


// Verificar si la jornada ha comenzado
exports.hasMatchdayStarted = async (req, res) => {
  try {
    const matchday = parseInt(req.params.matchday, 10);
    
    // Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    // Verificar si al menos un jugador tiene puntos para esta jornada
    const hasStarted = allPlayers.some(player => 
      player.weekPoints && player.weekPoints.some(wp => wp.weekNumber === matchday && wp.points !== 0)
    );
    
    res.status(200).json({
      success: true,
      data: {
        matchday: matchday,
        hasStarted: hasStarted
      }
    });
  } catch (error) {
    console.error('Error al verificar si la jornada ha comenzado:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Verificar si la jornada ha terminado
exports.hasMatchdayEnded = async (req, res) => {
  try {
    const matchday = parseInt(req.params.matchday, 10);
    
    // Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    // Filtrar jugadores activos (status = 'ok')
    const activePlayers = allPlayers.filter(player => player.playerStatus === 'ok');
    
    // Contar jugadores que tienen puntos registrados para esta jornada
    const playersWithPointsInCurrentMatchday = activePlayers.filter(player => 
      player.weekPoints && player.weekPoints.some(wp => wp.weekNumber === matchday)
    ).length;
    
    // Si un alto porcentaje de jugadores activos ya tiene puntos para esta jornada,
    // podemos asumir que la jornada ha terminado
    const completionThreshold = 0.71; // 73% de jugadores con puntos
    const hasEnded = playersWithPointsInCurrentMatchday / activePlayers.length > completionThreshold;
    
    res.status(200).json({
      success: true,
      data: {
        matchday: matchday,
        hasEnded: hasEnded,
        playersWithPoints: playersWithPointsInCurrentMatchday,
        totalActivePlayers: activePlayers.length,
        completionPercentage: (playersWithPointsInCurrentMatchday / activePlayers.length) * 100
      }
    });
  } catch (error) {
    console.error('Error al verificar si la jornada ha terminado:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Obtener puntos de un equipo específico para una jornada
exports.getUserTeamPointsForMatchday = async (req, res) => {
  try {
    const { leagueId, userId, matchday } = req.params;
    const matchdayNum = parseInt(matchday, 10);
    
    console.log(`Obteniendo puntos para liga ${leagueId}, usuario ${userId}, jornada ${matchdayNum}`);
    
    // 1. Obtener el equipo del usuario especificado en esa liga
    const team = await Team.findOne({ 
      league: leagueId, 
      user: userId 
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }
    
    // 2. Obtener los IDs de jugadores en la alineación (startingEleven)
    const startingElevenIds = team.startingEleven?.map(player => player.id) || [];
    
    // Si no hay alineación, usar todos los jugadores del equipo
    const playerIds = startingElevenIds.length > 0 
      ? startingElevenIds 
      : team.playersData.map(player => player.id);
    
    // 3. Obtener datos de jugadores desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    // 4. Filtrar solo los jugadores alineados
    const teamPlayers = allPlayers.filter(player => 
      playerIds.includes(player.id) && !player.id.startsWith('placeholder')
    );
    
    // Obtener el ID del capitán
    const captainId = team.captain;
    
    // 5. Para cada jugador, buscar los puntos de la jornada específica
    const playersWithPoints = teamPlayers.map(player => {
      // Buscar la jornada específica en weekPoints
      const matchdayData = player.weekPoints?.find(wp => wp.weekNumber === matchdayNum);
      const points = matchdayData ? matchdayData.points : 0;
      
      // Marcar si es capitán y calcular puntos con bonificación
      const isCaptain = captainId === player.id;
      const effectivePoints = isCaptain ? points * 2 : points;
      
      return {
        ...player,
        points: points,
        effectivePoints: effectivePoints,
        isCaptain: isCaptain
      };
    });
    
    // Contar posiciones vacías (placeholders)
    const placeholders = team.startingEleven?.filter(player => 
      player.id && player.id.startsWith('placeholder')
    ) || [];
    const emptyPositions = placeholders.length;
    
    // Aplicar penalización por posiciones vacías
    let penaltyPoints = 0;
    if (emptyPositions > 0 && emptyPositions < 11) {
      penaltyPoints = emptyPositions * -4; // -4 puntos por cada posición vacía
    }
    
    // Calcular puntos totales considerando el capitán y las penalizaciones
    const totalPoints = playersWithPoints.reduce((sum, player) => sum + player.effectivePoints, 0) + penaltyPoints;
    
    // Obtener información del usuario
    const User = require('../models/user.model');
    const userInfo = await User.findById(userId, 'username name');
    
    // 6. Devolver los datos
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: userId,
          name: userInfo.username || userInfo.name || 'Usuario'
        },
        team: {
          id: team._id,
          formation: team.formation,
          players: playersWithPoints,
          captainId: captainId,
          totalPoints: totalPoints,
          emptyPositions: emptyPositions,
          penaltyPoints: penaltyPoints
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
