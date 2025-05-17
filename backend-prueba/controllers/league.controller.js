const League = require('../models/league.model');
const User = require('../models/user.model');
const Team = require('../models/team.model');
const axios = require('axios');

// Crear una nueva liga y asociarla al usuario
exports.createLeague = async (req, res) => {
  try {
    const { name, privacy, maxParticipants, initialBudget } = req.body;
    const userId = req.user.id || req.user._id;

    // Obtener la jornada actual desde la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v4/players');
    const allPlayers = response.data;
    
    // Determinar la jornada actual
    let currentMatchday = 1;
    allPlayers.forEach(player => {
      if (player.weekPoints && player.weekPoints.length > 0) {
        player.weekPoints.forEach(wp => {
          if (wp.weekNumber > currentMatchday) {
            currentMatchday = wp.weekNumber;
          }
        });
      }
    });
    
    console.log(`Creando liga en jornada actual: ${currentMatchday}`);

    // 1. Crear la liga con la jornada actual
    const newLeague = new League({
      name,
      privacy: privacy || 'private',
      maxParticipants: maxParticipants || 10,
      initialBudget: initialBudget || 100000000,
      createdBy: userId,
      creationMatchday: currentMatchday, // Establecer la jornada de creación
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await newLeague.save();

    // Añadir la liga al usuario
    await User.findByIdAndUpdate(
      userId,
      { $push: { leagues: newLeague._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      leagueId: newLeague._id,
      message: 'Liga creada con éxito',
      creationMatchday: currentMatchday
    });
  } catch (error) {
    console.error('Error al crear la liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la liga',
      error: error.message
    });
  }
};


// Obtener las ligas de un usuario
exports.getUserLeagues = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('leagues');
    res.status(200).json(user.leagues);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener las ligas', error: error.message });
  }
};

// Asignar equipo aleatorio al usuario en una liga usando la API externa de jugadores
exports.assignRandomTeam = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.id || req.user._id;

    // Verificar si ya tiene equipo
    const existingTeam = await Team.findOne({ league: leagueId, user: userId });
    if (existingTeam && existingTeam.playersData && existingTeam.playersData.length > 0) {
      return res.status(200).json(existingTeam.playersData);
    }

    // Obtener todos los equipos existentes en esta liga
    const existingTeams = await Team.find({ league: leagueId });
    
    // Crear un conjunto de IDs de jugadores ya utilizados
    const usedPlayerIds = new Set();
    existingTeams.forEach(team => {
      (team.playersData || []).forEach(player => {
        usedPlayerIds.add(player.id);
      });
    });

    // Estructura y presupuesto
    const teamStructure = { GK: 2, DEF: 4, MID: 6, FWD: 3 };
    const maxPlayersPerTeam = 3;
    const league = await League.findById(leagueId);
    const targetTeamValue = 100000000; // Valor máximo de 100M para el equipo
    const transferBudget = league.initialBudget || 100000000; // Presupuesto para fichajes

    // Obtener todos los jugadores de la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v3/players');
    const allPlayers = response.data;

    // Filtrar jugadores ya utilizados
    const availablePlayers = allPlayers.filter(player => !usedPlayerIds.has(player.id));

    // Selección optimizada para usar el presupuesto
    let selectedPlayers = [];
    let totalSpent = 0;
    let teamCounts = {};

    // Mapear posiciones
    const positionMap = {
      "1": "GK",
      "2": "DEF",
      "3": "MID",
      "4": "FWD"
    };

    // Calcular el total de jugadores necesarios
    const totalPlayersNeeded = Object.values(teamStructure).reduce((a, b) => a + b, 0);

    // Cambiar el orden para priorizar posiciones con menos jugadores disponibles
    const positionKeys = Object.keys(teamStructure);
    const positionAvailability = {};
    
    for (const posKey of positionKeys) {
      const posId = Object.keys(positionMap).find(key => positionMap[key] === posKey);
      positionAvailability[posKey] = availablePlayers.filter(p => p.positionId == posId).length;
    }
    
    // Ordenar posiciones por disponibilidad (menor primero)
    const sortedPositions = positionKeys.sort((a, b) => positionAvailability[a] - positionAvailability[b]);
    console.log("Orden de selección por disponibilidad:", sortedPositions);

    // Seleccionar jugadores por posición (en orden de menos a más disponibles)
    for (const positionKey of sortedPositions) {
      let needed = teamStructure[positionKey];
      const positionId = Object.keys(positionMap).find(key => positionMap[key] === positionKey);
      let pool = availablePlayers.filter(p => p.positionId == positionId);
      
      console.log(`Seleccionando ${needed} jugadores para posición ${positionKey}. Disponibles: ${pool.length}`);
      
      // Calcular presupuesto promedio por jugador restante
      const playersSelected = selectedPlayers.length;
      const remainingPlayers = totalPlayersNeeded - playersSelected;
      const avgBudgetPerPlayer = (targetTeamValue - totalSpent) / Math.max(1, remainingPlayers);
      
      // Ordenar jugadores según cuánto presupuesto queda
      if (avgBudgetPerPlayer > 8000000) {
        // Si queda mucho presupuesto, priorizar jugadores caros
        pool.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
      } else {
        // Si queda poco presupuesto, mezclar aleatoriamente
        pool.sort(() => Math.random() - 0.5);
      }
      
      while (needed > 0 && pool.length > 0) {
        const player = pool[0];
        pool.shift(); // Quitar el primer jugador
        
        if (
          !selectedPlayers.find(p => p.id === player.id) &&
          (teamCounts[player.team?.name] || 0) < maxPlayersPerTeam &&
          totalSpent + Number(player.marketValue) <= targetTeamValue
        ) {
          selectedPlayers.push(player);
          totalSpent += Number(player.marketValue);
          teamCounts[player.team?.name] = (teamCounts[player.team?.name] || 0) + 1;
          needed--;
        }
      }
    }

    // VERIFICACIÓN FINAL: Asegurar que el equipo no supere los 100M
    if (totalSpent > targetTeamValue) {
      console.log(`El valor del equipo (${totalSpent}) excede el límite de 100M. Realizando ajustes...`);
      
      // Ordenar jugadores por valor (de mayor a menor)
      selectedPlayers.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
      
      // Reemplazar jugadores caros por alternativas más baratas
      while (totalSpent > targetTeamValue && selectedPlayers.length >= totalPlayersNeeded) {
        // Identificar el jugador más caro
        const expensivePlayer = selectedPlayers[0];
        const position = positionMap[expensivePlayer.positionId];
        
        // Eliminar el jugador caro
        totalSpent -= Number(expensivePlayer.marketValue);
        selectedPlayers.shift();
        
        // Buscar un reemplazo más barato de la misma posición
        const replacementCandidates = availablePlayers.filter(p => 
          positionMap[p.positionId] === position && 
          !selectedPlayers.some(sp => sp.id === p.id) &&
          Number(p.marketValue) < Number(expensivePlayer.marketValue)
        );
        
        if (replacementCandidates.length > 0) {
          // Ordenar por valor (de menor a mayor)
          replacementCandidates.sort((a, b) => Number(a.marketValue) - Number(b.marketValue));
          
          // Seleccionar el reemplazo más barato que mantenga el equipo bajo el límite
          for (const replacement of replacementCandidates) {
            if (totalSpent + Number(replacement.marketValue) <= targetTeamValue) {
              selectedPlayers.push(replacement);
              totalSpent += Number(replacement.marketValue);
              
              console.log(`Reemplazado ${expensivePlayer.name} (${expensivePlayer.marketValue}) por ${replacement.name} (${replacement.marketValue})`);
              break;
            }
          }
        }
      }
    }

    // VERIFICACIÓN EXPLÍCITA DE POSICIONES
    const requiredPositions = {
      "GK": 2,
      "DEF": 4,
      "MID": 6,
      "FWD": 3
    };

    // Al final del proceso de selección
    for (const position in requiredPositions) {
      const positionId = Object.keys(positionMap).find(key => positionMap[key] === position);
      const count = selectedPlayers.filter(p => p.positionId == positionId).length;
      
      if (count < requiredPositions[position]) {
        console.error(`¡Faltan jugadores en la posición ${position}! Solo hay ${count}/${requiredPositions[position]}`);
        
        // Forzar la selección de jugadores faltantes en esta posición
        const missingCount = requiredPositions[position] - count;
        const availableForPosition = availablePlayers.filter(p => 
          positionMap[p.positionId] === position && 
          !selectedPlayers.some(sp => sp.id === p.id)
        );
        
        // Ordenar por valor de mercado (menor primero para no exceder presupuesto)
        availableForPosition.sort((a, b) => Number(a.marketValue) - Number(b.marketValue));
        
        // Añadir los jugadores faltantes
        for (let i = 0; i < Math.min(missingCount, availableForPosition.length); i++) {
          selectedPlayers.push(availableForPosition[i]);
          totalSpent += Number(availableForPosition[i].marketValue);
        }
      }
    }

    // Verificar distribución final por posiciones
    const positionCounts = {};
    for (const pos of Object.keys(teamStructure)) {
      const posId = Object.keys(positionMap).find(key => positionMap[key] === pos);
      positionCounts[pos] = selectedPlayers.filter(p => p.positionId == posId).length;
    }
    console.log('Distribución final por posiciones:', positionCounts);
    console.log(`Valor total del equipo: ${totalSpent} (límite: ${targetTeamValue})`);

    // Guardar el equipo
    await Team.create({
      league: leagueId,
      user: userId,
      players: [],
      budget: transferBudget, // Presupuesto para fichajes (no se resta el valor del equipo)
      playersData: selectedPlayers,
      formation: '4-4-2'
    });

    res.status(201).json(selectedPlayers);
  } catch (error) {
    console.error('Error asignando equipo aleatorio:', error.message);
    res.status(500).json({ message: 'Error asignando equipo aleatorio', error: error.message });
  }
};








// Obtener la clasificación de la liga
exports.getLeagueClassification = async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    // Obtén todos los equipos de la liga
    const teams = await Team.find({ league: leagueId }).populate('user');
    
    // Para cada equipo, calcula los puntos y el valor del equipo
    const classification = teams.map(team => {
      // Verificar si el equipo tiene 11 jugadores en startingEleven
      const hasCompleteTeam = team.startingEleven && team.startingEleven.length === 11;
      
      // Calcular puntos totales solo si tiene equipo completo
      let totalPoints = 0;
      if (hasCompleteTeam) {
        totalPoints = (team.playersData || []).reduce((sum, player) => {
          return sum + (Number(player.points) || 0);
        }, 0);
      }
      
      // Calcular valor total del equipo
      const teamValue = (team.playersData || []).reduce((sum, player) => {
        return sum + (Number(player.marketValue) || 0);
      }, 0);
      
      // Calcular jornadas jugadas (solo aquellas con 11 jugadores)
      const matchdaysPlayed = hasCompleteTeam ? team.matchdaysPlayed || 0 : 0;
      
      return {
        userId: team.user._id,  // Incluir el ID del usuario
        name: team.user.name,
        points: totalPoints,
        teamValue: teamValue,
        matchdaysPlayed: matchdaysPlayed
      };
    });
    
    // Ordena por puntos descendente
    classification.sort((a, b) => b.points - a.points);
    
    res.json(classification);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clasificación', error: error.message });
  }
};




exports.generateInviteLink = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ message: 'Liga no encontrada' });
    }
    
    // Genera un código único para la liga si no existe
    if (!league.inviteCode) {
      league.inviteCode = generateRandomCode(8);
      await league.save();
    }
    
    // Construye el enlace de invitación
    const inviteLink = `http://localhost:4200/join-league/${league.inviteCode}`;
    
    res.json({
      inviteLink,
      inviteCode: league.inviteCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar enlace de invitación', error: error.message });
  }
};


// Función auxiliar para generar un código aleatorio
function generateRandomCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}


exports.joinLeagueByCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Buscar la liga por el código de invitación
    const league = await League.findOne({ inviteCode });

    if (!league) {
      return res.status(404).json({ message: 'Liga no encontrada' });
    }

    // Verificar si el usuario ya es miembro
    const isMember = league.members.some(member =>
      member.userId.toString() === userId.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'Ya eres miembro de esta liga' });
    }

    // Añadir usuario a la liga
    league.members.push({
      userId,
      role: 'manager',
      joinedAt: new Date()
    });
    await league.save();
    
    // Añadir la liga al usuario también
    await User.findByIdAndUpdate(
      userId,
      { $push: { leagues: league._id } },
      { new: true }
    );

    // Obtener la jornada de creación de la liga
    const creationMatchday = league.creationMatchday || 1;
    console.log(`Usuario uniéndose a liga ${league.name} creada en jornada ${creationMatchday}`);

    try {
      // Obtener todos los equipos existentes en esta liga
      const existingTeams = await Team.find({ league: league._id });
      
      // Crear un conjunto de IDs de jugadores ya utilizados
      const usedPlayerIds = new Set();
      existingTeams.forEach(team => {
        (team.playersData || []).forEach(player => {
          usedPlayerIds.add(player.id);
        });
      });

      // Estructura y presupuesto
      const teamStructure = { GK: 2, DEF: 4, MID: 6, FWD: 3 };
      const maxPlayersPerTeam = 3;
      const targetTeamValue = 100000000; // Valor máximo de 100M para el equipo
      const transferBudget = league.initialBudget || 100000000; // Presupuesto para fichajes

      // Obtener todos los jugadores de la API externa
      const response = await axios.get('https://api-fantasy.llt-services.com/api/v3/players');
      const allPlayers = response.data;

      // Filtrar jugadores ya utilizados
      const availablePlayers = allPlayers.filter(player => !usedPlayerIds.has(player.id));

      // Selección optimizada para usar el presupuesto
      let selectedPlayers = [];
      let totalSpent = 0;
      let teamCounts = {};

      // Mapear posiciones
      const positionMap = {
        "1": "GK",
        "2": "DEF",
        "3": "MID",
        "4": "FWD"
      };

      // Calcular el total de jugadores necesarios
      const totalPlayersNeeded = Object.values(teamStructure).reduce((a, b) => a + b, 0);

      // Cambiar el orden para priorizar posiciones con menos jugadores disponibles
      const positionKeys = Object.keys(teamStructure);
      const positionAvailability = {};
      
      for (const posKey of positionKeys) {
        const posId = Object.keys(positionMap).find(key => positionMap[key] === posKey);
        positionAvailability[posKey] = availablePlayers.filter(p => p.positionId == posId).length;
      }
      
      // Ordenar posiciones por disponibilidad (menor primero)
      const sortedPositions = positionKeys.sort((a, b) => positionAvailability[a] - positionAvailability[b]);
      console.log("Orden de selección por disponibilidad:", sortedPositions);

      // Seleccionar jugadores por posición (en orden de menos a más disponibles)
      for (const positionKey of sortedPositions) {
        let needed = teamStructure[positionKey];
        const positionId = Object.keys(positionMap).find(key => positionMap[key] === positionKey);
        let pool = availablePlayers.filter(p => p.positionId == positionId);
        
        console.log(`Seleccionando ${needed} jugadores para posición ${positionKey}. Disponibles: ${pool.length}`);
        
        // Calcular presupuesto promedio por jugador restante
        const playersSelected = selectedPlayers.length;
        const remainingPlayers = totalPlayersNeeded - playersSelected;
        const avgBudgetPerPlayer = (targetTeamValue - totalSpent) / Math.max(1, remainingPlayers);
        
        // Ordenar jugadores según cuánto presupuesto queda
        if (avgBudgetPerPlayer > 8000000) {
          // Si queda mucho presupuesto, priorizar jugadores caros
          pool.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
        } else {
          // Si queda poco presupuesto, mezclar aleatoriamente
          pool.sort(() => Math.random() - 0.5);
        }
        
        while (needed > 0 && pool.length > 0) {
          const player = pool[0];
          pool.shift(); // Quitar el primer jugador
          
          if (
            !selectedPlayers.find(p => p.id === player.id) &&
            (teamCounts[player.team?.name] || 0) < maxPlayersPerTeam &&
            totalSpent + Number(player.marketValue) <= targetTeamValue
          ) {
            selectedPlayers.push(player);
            totalSpent += Number(player.marketValue);
            teamCounts[player.team?.name] = (teamCounts[player.team?.name] || 0) + 1;
            needed--;
          }
        }
      }

      // VERIFICACIÓN FINAL: Asegurar que el equipo no supere los 100M
      if (totalSpent > targetTeamValue) {
        console.log(`El valor del equipo (${totalSpent}) excede el límite de 100M. Realizando ajustes...`);
        
        // Ordenar jugadores por valor (de mayor a menor)
        selectedPlayers.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
        
        // Reemplazar jugadores caros por alternativas más baratas
        while (totalSpent > targetTeamValue && selectedPlayers.length >= totalPlayersNeeded) {
          // Identificar el jugador más caro
          const expensivePlayer = selectedPlayers[0];
          const position = positionMap[expensivePlayer.positionId];
          
          // Eliminar el jugador caro
          totalSpent -= Number(expensivePlayer.marketValue);
          selectedPlayers.shift();
          
          // Buscar un reemplazo más barato de la misma posición
          const replacementCandidates = availablePlayers.filter(p => 
            positionMap[p.positionId] === position && 
            !selectedPlayers.some(sp => sp.id === p.id) &&
            Number(p.marketValue) < Number(expensivePlayer.marketValue)
          );
          
          if (replacementCandidates.length > 0) {
            // Ordenar por valor (de menor a mayor)
            replacementCandidates.sort((a, b) => Number(a.marketValue) - Number(b.marketValue));
            
            // Seleccionar el reemplazo más barato que mantenga el equipo bajo el límite
            for (const replacement of replacementCandidates) {
              if (totalSpent + Number(replacement.marketValue) <= targetTeamValue) {
                selectedPlayers.push(replacement);
                totalSpent += Number(replacement.marketValue);
                
                console.log(`Reemplazado ${expensivePlayer.name} (${expensivePlayer.marketValue}) por ${replacement.name} (${replacement.marketValue})`);
                break;
              }
            }
          }
        }
      }

      // VERIFICACIÓN EXPLÍCITA DE POSICIONES
      const requiredPositions = {
        "GK": 2,
        "DEF": 4,
        "MID": 6,
        "FWD": 3
      };

      // Al final del proceso de selección
      for (const position in requiredPositions) {
        const positionId = Object.keys(positionMap).find(key => positionMap[key] === position);
        const count = selectedPlayers.filter(p => p.positionId == positionId).length;
        
        if (count < requiredPositions[position]) {
          console.error(`¡Faltan jugadores en la posición ${position}! Solo hay ${count}/${requiredPositions[position]}`);
          
          // Forzar la selección de jugadores faltantes en esta posición
          const missingCount = requiredPositions[position] - count;
          const availableForPosition = availablePlayers.filter(p => 
            positionMap[p.positionId] === position && 
            !selectedPlayers.some(sp => sp.id === p.id)
          );
          
          // Ordenar por valor de mercado (menor primero para no exceder presupuesto)
          availableForPosition.sort((a, b) => Number(a.marketValue) - Number(b.marketValue));
          
          // Añadir los jugadores faltantes
          for (let i = 0; i < Math.min(missingCount, availableForPosition.length); i++) {
            selectedPlayers.push(availableForPosition[i]);
            totalSpent += Number(availableForPosition[i].marketValue);
          }
        }
      }

      // Verificar distribución final por posiciones
      const positionCounts = {};
      for (const pos of Object.keys(teamStructure)) {
        const posId = Object.keys(positionMap).find(key => positionMap[key] === pos);
        positionCounts[pos] = selectedPlayers.filter(p => p.positionId == posId).length;
      }
      console.log('Distribución final por posiciones:', positionCounts);
      console.log(`Valor total del equipo: ${totalSpent} (límite: ${targetTeamValue})`);

      // Crear el equipo con los jugadores seleccionados y la jornada de creación de la liga
      await Team.create({
        league: league._id,
        user: userId,
        players: [],
        budget: transferBudget,
        playersData: selectedPlayers,
        formation: '4-4-2',
        matchdaysPlayed: 0 // Inicializar a 0 ya que los puntos se contarán desde la jornada de creación
      });

      return res.status(200).json({
        success: true,
        message: 'Te has unido a la liga correctamente',
        leagueId: league._id,
        team: selectedPlayers,
        creationMatchday: creationMatchday // Devolver la jornada de creación para información
      });
    } catch (teamError) {
      console.error('Error asignando equipo aleatorio:', teamError);
      return res.status(500).json({
        message: 'Error asignando equipo aleatorio',
        error: teamError.message
      });
    }
  } catch (error) {
    console.error('Error al unirse a la liga:', error);
    return res.status(500).json({
      message: 'Error al unirse a la liga',
      error: error.message
    });
  }
};








exports.generateInviteCode = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.id || req.user._id;
    
    // Verificar que el usuario es miembro o admin de la liga
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }
    
    // Verificar permisos (opcional)
    const isAdmin = league.members.some(m => 
      m.userId.toString() === userId.toString() && m.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para generar códigos de invitación' });
    }
    
    // Generar código de invitación si no existe
    if (!league.inviteCode) {
      league.inviteCode = generateRandomCode(8); // Función que genera un código aleatorio
      await league.save();
    }
    
    res.json({ 
      success: true, 
      inviteCode: league.inviteCode 
    });
  } catch (error) {
    console.error('Error al generar código de invitación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar código de invitación', 
      error: error.message 
    });
  }
};

// Función auxiliar para generar códigos aleatorios
function generateRandomCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}


// Obtener liga por código de invitación
exports.getLeagueByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const league = await League.findOne({ inviteCode });
    
    if (!league) {
      return res.status(404).json({ message: 'Liga no encontrada' });
    }
    
    res.json({
      leagueId: league._id,
      name: league.name,
      privacy: league.privacy,
      createdBy: league.createdBy
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener información de la liga', error: error.message });
  }
};

// Obtener el equipo del usuario en una liga específica
exports.getMyTeam = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.id || req.user._id;
    
    // Buscar el equipo del usuario en esta liga
    const team = await Team.findOne({ league: leagueId, user: userId });
    
    if (!team) {
      return res.status(404).json({ message: 'No tienes un equipo en esta liga' });
    }
    
    // Calcular el valor total del equipo
    const teamValue = (team.playersData || []).reduce((sum, player) => {
      return sum + (Number(player.marketValue) || 0);
    }, 0);
    
    res.json({
      teamId: team._id, // Añadir explícitamente el ID del equipo
      teamValue,
      budget: team.budget,
      playersData: team.playersData,
      team: {
        _id: team._id, // También incluirlo aquí para compatibilidad
        formation: team.formation,
        startingEleven: team.startingEleven,
        captain: team.captain,
        viceCaptain: team.viceCaptain
      }
    });
  } catch (error) {
    console.error('Error al obtener equipo:', error);
    res.status(500).json({ message: 'Error al obtener tu equipo', error: error.message });
  }
};


exports.updateTeamCaptain = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { playerId } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Actualizar el capitán en la base de datos
    const team = await Team.findOneAndUpdate(
      { league: leagueId, user: userId },
      { captain: playerId },
      { new: true }
    );
    
    res.status(200).json(team);
  } catch (error) {
    console.error('Error updating team captain:', error.message);
    res.status(500).json({ message: 'Error updating team captain', error: error.message });
  }
};

exports.updateTeamFormation = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { formation } = req.body;
    const userId = req.user.id || req.user._id;
    
    const team = await Team.findOneAndUpdate(
      { league: leagueId, user: userId },
      { formation },
      { new: true }
    );
    
    res.status(200).json(team);
  } catch (error) {
    console.error('Error updating team formation:', error.message);
    res.status(500).json({ message: 'Error updating team formation', error: error.message });
  }
};


exports.saveTeamChanges = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { formation, players, captainId, viceCaptainId } = req.body;
    const userId = req.user.id || req.user._id;

    // Buscar el equipo del usuario en esta liga
    const team = await Team.findOne({ league: leagueId, user: userId });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No tienes un equipo en esta liga'
      });
    }

    // Preparar las actualizaciones
    const updates = {
      formation: formation || team.formation,
      lastSaved: new Date()
    };

    // Actualizar startingEleven con los jugadores que no son placeholders
    if (players && players.length) {
      updates.startingEleven = players.filter(player => player.id && !player.id.startsWith('placeholder'));
    }


    // Actualizar capitán y vicecapitán
    if (captainId) {
      updates.captain = captainId;
    }
    
    if (viceCaptainId) {
      updates.viceCaptain = viceCaptainId;
    }

    // Actualizar el equipo en la base de datos
    const updatedTeam = await Team.findOneAndUpdate(
      { league: leagueId, user: userId },
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cambios guardados correctamente',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Error al guardar cambios del equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar cambios del equipo',
      error: error.message
    });
  }
};

// Obtener una liga por ID
exports.getLeagueById = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ 
        success: false, 
        message: 'Liga no encontrada' 
      });
    }
    
    res.status(200).json({
      success: true,
      name: league.name,
      privacy: league.privacy,
      maxParticipants: league.maxParticipants,
      initialBudget: league.initialBudget,
      createdBy: league.createdBy,
      inviteCode: league.inviteCode
    });
  } catch (error) {
    console.error('Error al obtener liga:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener liga', 
      error: error.message 
    });
  }
};


// Obtener todos los equipos del usuario en todas las ligas
exports.getUserTeams = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Buscar todos los equipos del usuario y ordenarlos por fecha de creación (descendente)
    const teams = await Team.find({ user: userId })
                            .sort({ createdAt: -1 }) // Ordenar por fecha de creación descendente
                            .populate('league', 'name');
    
    if (!teams || teams.length === 0) {
      return res.status(200).json({ 
        success: true, 
        teams: [],
        message: 'No tienes equipos en ninguna liga' 
      });
    }
    
    // Formatear la respuesta para incluir solo la información necesaria
    const formattedTeams = teams.map(team => ({
      teamId: team._id,
      leagueId: team.league._id,
      leagueName: team.league.name
    }));
    
    res.status(200).json({
      success: true,
      teams: formattedTeams
    });
  } catch (error) {
    console.error('Error al obtener equipos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus equipos',
      error: error.message
    });
  }
};

