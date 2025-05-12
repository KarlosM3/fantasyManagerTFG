const League = require('../models/league.model');
const User = require('../models/user.model');
const Team = require('../models/team.model');
const axios = require('axios');

// Crear una nueva liga y asociarla al usuario
exports.createLeague = async (req, res) => {
  try {
    const { name, privacy, maxParticipants, initialBudget } = req.body;
    const userId = req.user.id || req.user._id;

    // 1. Crear la liga
    const newLeague = new League({
      name,
      privacy: privacy || 'private',
      maxParticipants: maxParticipants || 10,
      initialBudget: initialBudget || 100000000,
      createdBy: userId,
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
      message: 'Liga creada con éxito'
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
    const teamStructure = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
    const maxPlayersPerTeam = 3;
    const league = await League.findById(leagueId);
    const targetTeamValue = 100000000; // Valor fijo cercano a 100M para el equipo
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

    for (const positionKey of Object.keys(teamStructure)) {
      let needed = teamStructure[positionKey];
      let pool = availablePlayers.filter(p => positionMap[p.positionId] === positionKey);
      
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
        userId: team.user._id,
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
      const teamStructure = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
      const maxPlayersPerTeam = 3;
      const targetTeamValue = 100000000; // Valor fijo cercano a 100M para el equipo
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

      for (const positionKey of Object.keys(teamStructure)) {
        let needed = teamStructure[positionKey];
        let pool = availablePlayers.filter(p => positionMap[p.positionId] === positionKey);
        
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

      // Crear el equipo con los jugadores seleccionados
      await Team.create({
        league: league._id,
        user: userId,
        players: [],
        budget: transferBudget, // Presupuesto para fichajes (no se resta el valor del equipo)
        playersData: selectedPlayers,
        formation: '4-4-2' // Formación por defecto
      });

      return res.status(200).json({
        success: true,
        message: 'Te has unido a la liga correctamente',
        leagueId: league._id,
        team: selectedPlayers
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

