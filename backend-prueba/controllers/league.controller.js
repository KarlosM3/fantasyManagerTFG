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

    // ¿Ya tiene equipo en esta liga?
    const existingTeam = await Team.findOne({ league: leagueId, user: userId });
    if (existingTeam && existingTeam.playersData && existingTeam.playersData.length > 0) {
      return res.status(200).json(existingTeam.playersData);
    }

    // Estructura y presupuesto
    const teamStructure = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
    const maxPlayersPerTeam = 3;
    const budget = 100000000;

    // Obtener todos los jugadores de la API externa
    const response = await axios.get('https://api-fantasy.llt-services.com/api/v3/players');
    const allPlayers = response.data; // Ajusta si la respuesta es { data: [...] }

    // Selección aleatoria
    let selectedPlayers = [];
    let totalSpent = 0;
    let teamCounts = {};

    // Mapear posiciones de la API a tus posiciones
    const positionMap = {
      "1": "GK",
      "2": "DEF",
      "3": "MID",
      "4": "FWD"
    };

    for (const positionKey of Object.keys(teamStructure)) {
      let needed = teamStructure[positionKey];
      let pool = allPlayers.filter(p => positionMap[p.positionId] === positionKey);

      while (needed > 0 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const player = pool[idx];

        if (
          !selectedPlayers.find(p => p.id === player.id) &&
          (teamCounts[player.team?.name] || 0) < maxPlayersPerTeam &&
          totalSpent + Number(player.marketValue) <= budget
        ) {
          selectedPlayers.push(player);
          totalSpent += Number(player.marketValue);
          teamCounts[player.team?.name] = (teamCounts[player.team?.name] || 0) + 1;
          needed--;
        } else {
          pool.splice(idx, 1);
        }
      }
    }

    // Guarda el equipo con los datos completos de los jugadores
    await Team.create({
      league: leagueId,
      user: userId,
      players: [], // No guardamos referencias locales
      budget: budget - totalSpent,
      playersData: selectedPlayers // <-- añade este campo en tu modelo si no lo tienes
    });

    // Devuelve los jugadores seleccionados al frontend
    res.status(201).json(selectedPlayers);

  } catch (error) {
    console.error('Error asignando equipo aleatorio:', error.message);
    res.status(500).json({ message: 'Error asignando equipo aleatorio', error: error.message });
  }
};

// Obtener clasificación de una liga
exports.getLeagueClassification = async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Obtén todos los equipos de la liga
    const teams = await Team.find({ league: leagueId }).populate('user');

    // Para cada equipo, calcula los puntos sumando los puntos de cada jugador (ejemplo: lastSeasonPoints)
    // Si tienes lógica propia para calcular puntos, usa esa.
    const classification = teams.map(team => {
      const totalPoints = (team.playersData || []).reduce((sum, player) => {
        // Usa el campo correcto para puntos, por ejemplo player.points o player.lastSeasonPoints
        return sum + (Number(player.points) || 0);
      }, 0);
      return {
        userId: team.user._id,
        name: team.user.name,
        points: totalPoints
      };
    });

    // Ordena por puntos descendente
    classification.sort((a, b) => b.points - a.points);

    res.json(classification);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clasificación', error: error.message });
  }
};

