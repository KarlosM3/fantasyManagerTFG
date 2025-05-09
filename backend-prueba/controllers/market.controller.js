const Team = require("../models/team.model")
const Market = require("../models/market.model")
const Transaction = require("../models/transaction.model")
const axios = require("axios")

// Obtener jugadores del mercado actual
exports.getAllPlayers = async (req, res) => {
  try {
    const { leagueId } = req.query;
    
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere el ID de la liga"
      });
    }

    // Buscar el mercado actual para esta liga específica
    let market = await Market.findOne({ 
      league: leagueId 
    }).sort({ lastUpdated: -1 });
    
    // Si no existe o necesita actualización, crear uno nuevo
    if (!market || new Date() > market.nextUpdate) {
      market = await refreshMarket(leagueId);
    }
    
    // Devolver un objeto con los jugadores y la información de actualización
    res.status(200).json({
      players: market.players,
      nextMarketUpdate: market.nextUpdate,
      lastUpdated: market.lastUpdated
    });
  } catch (error) {
    console.error("Error al obtener jugadores del mercado:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener jugadores del mercado",
      error: error.message,
    });
  }
};



// Función para refrescar el mercado
async function refreshMarket(leagueId) {
  try {
    // Obtener todos los jugadores de la API
    const response = await axios.get("https://api-fantasy.llt-services.com/api/v3/players");
    const allPlayers = response.data;
    
    // Seleccionar 12 jugadores aleatorios
    const marketPlayers = [];
    
    // Asegurar distribución por posiciones
    const positionCounts = { "1": 2, "2": 4, "3": 4, "4": 2 };
    
    for (const positionId in positionCounts) {
      const positionPlayers = allPlayers.filter(p => p.positionId === positionId);
      const count = positionCounts[positionId];
      
      // Seleccionar jugadores aleatorios de esta posición
      for (let i = 0; i < count; i++) {
        if (positionPlayers.length > 0) {
          const randomIndex = Math.floor(Math.random() * positionPlayers.length);
          marketPlayers.push(positionPlayers[randomIndex]);
          positionPlayers.splice(randomIndex, 1);
        }
      }
    }
    
    // Calcular próxima actualización (24 horas después)
    const nextUpdate = new Date();
    nextUpdate.setHours(nextUpdate.getHours() + 24);
    
    // Guardar el nuevo mercado para esta liga específica
    const newMarket = await Market.create({
      league: leagueId,
      players: marketPlayers,
      lastUpdated: new Date(),
      nextUpdate: nextUpdate
    });
    
    return newMarket;
  } catch (error) {
    console.error("Error al refrescar el mercado:", error);
    throw error;
  }
}




// Comprar un jugador
exports.buyPlayer = async (req, res) => {
  try {
    const { leagueId, playerId } = req.body
    const userId = req.user.id || req.user._id

    // Obtener el equipo del usuario en esta liga
    const team = await Team.findOne({ league: leagueId, user: userId })
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "No tienes un equipo en esta liga",
      })
    }

    // Verificar si el jugador ya está en el equipo
    const playerExists = team.playersData.some((player) => player.id === playerId)
    if (playerExists) {
      return res.status(400).json({
        success: false,
        message: "Este jugador ya está en tu equipo",
      })
    }

    // Obtener datos del jugador desde la API externa
    const response = await axios.get("https://api-fantasy.llt-services.com/api/v3/players")
    const allPlayers = response.data
    const playerToBuy = allPlayers.find((player) => player.id === playerId)

    if (!playerToBuy) {
      return res.status(404).json({
        success: false,
        message: "Jugador no encontrado",
      })
    }

    // Verificar si hay suficiente presupuesto
    const playerValue = Number(playerToBuy.marketValue)
    if (team.budget < playerValue) {
      return res.status(400).json({
        success: false,
        message: "No tienes suficiente presupuesto para comprar este jugador",
      })
    }

    // Verificar límites de jugadores por posición
    const positionCounts = {
      1: 0, // Porteros
      2: 0, // Defensas
      3: 0, // Centrocampistas
      4: 0, // Delanteros
    }

    team.playersData.forEach((player) => {
      if (positionCounts[player.positionId] !== undefined) {
        positionCounts[player.positionId]++
      }
    })

    // Límites por posición
    const positionLimits = {
      1: 2, // Máximo 2 porteros
      2: 5, // Máximo 5 defensas
      3: 5, // Máximo 5 centrocampistas
      4: 3, // Máximo 3 delanteros
    }

    if (positionCounts[playerToBuy.positionId] >= positionLimits[playerToBuy.positionId]) {
      return res.status(400).json({
        success: false,
        message: `Ya tienes el máximo de jugadores permitidos en la posición de ${
          playerToBuy.positionId === "1"
            ? "portero"
            : playerToBuy.positionId === "2"
              ? "defensa"
              : playerToBuy.positionId === "3"
                ? "centrocampista"
                : "delantero"
        }`,
      })
    }

    // Verificar límite de jugadores por equipo (máximo 3 del mismo equipo)
    if (playerToBuy.team && playerToBuy.team.name) {
      const sameTeamCount = team.playersData.filter(
        (player) => player.team && player.team.name === playerToBuy.team.name,
      ).length

      if (sameTeamCount >= 3) {
        return res.status(400).json({
          success: false,
          message: `Ya tienes el máximo de 3 jugadores del equipo ${playerToBuy.team.name}`,
        })
      }
    }

    // Realizar la compra
    const newBudget = team.budget - playerValue

    // Añadir jugador al equipo
    team.playersData.push(playerToBuy)
    team.budget = newBudget
    await team.save()

    // Registrar la transacción
    await Transaction.create({
      league: leagueId,
      user: userId,
      player: {
        id: playerToBuy.id,
        name: playerToBuy.name,
        positionId: playerToBuy.positionId,
        team: playerToBuy.team?.name || "Sin equipo",
      },
      type: "buy",
      amount: playerValue,
      date: new Date(),
    })

    res.status(200).json({
      success: true,
      message: "Jugador comprado con éxito",
      newBudget,
      player: playerToBuy,
    })
  } catch (error) {
    console.error("Error al comprar jugador:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la compra",
      error: error.message,
    })
  }
}

// Vender un jugador
exports.sellPlayer = async (req, res) => {
  try {
    const { leagueId, playerId } = req.body
    const userId = req.user.id || req.user._id

    // Obtener el equipo del usuario en esta liga
    const team = await Team.findOne({ league: leagueId, user: userId })
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "No tienes un equipo en esta liga",
      })
    }

    // Buscar el jugador en el equipo
    const playerIndex = team.playersData.findIndex((player) => player.id === playerId)
    if (playerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Este jugador no está en tu equipo",
      })
    }

    // Obtener el jugador a vender
    const playerToSell = team.playersData[playerIndex]
    const playerValue = Number(playerToSell.marketValue)

    // Verificar si el jugador es capitán o vicecapitán
    if (team.captain === playerId || team.viceCaptain === playerId) {
      // Quitar el rol de capitán o vicecapitán
      if (team.captain === playerId) {
        team.captain = null
      }
      if (team.viceCaptain === playerId) {
        team.viceCaptain = null
      }
    }

    // Verificar si el jugador está en el once inicial
    if (team.startingEleven && team.startingEleven.length > 0) {
      team.startingEleven = team.startingEleven.filter((p) => p.id !== playerId)
    }

    // Realizar la venta
    const newBudget = team.budget + playerValue

    // Eliminar jugador del equipo
    team.playersData.splice(playerIndex, 1)
    team.budget = newBudget
    await team.save()

    // Registrar la transacción
    await Transaction.create({
      league: leagueId,
      user: userId,
      player: {
        id: playerToSell.id,
        name: playerToSell.name,
        positionId: playerToSell.positionId,
        team: playerToSell.team?.name || "Sin equipo",
      },
      type: "sell",
      amount: playerValue,
      date: new Date(),
    })

    res.status(200).json({
      success: true,
      message: "Jugador vendido con éxito",
      newBudget,
      player: playerToSell,
    })
  } catch (error) {
    console.error("Error al vender jugador:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la venta",
      error: error.message,
    })
  }
}

// Obtener historial de transacciones
exports.getTransactionHistory = async (req, res) => {
  try {
    const { leagueId } = req.params
    const userId = req.user.id || req.user._id

    // Verificar si el usuario tiene un equipo en esta liga
    const team = await Team.findOne({ league: leagueId, user: userId })
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "No tienes un equipo en esta liga",
      })
    }

    // Obtener transacciones
    const transactions = await Transaction.find({
      league: leagueId,
      user: userId,
    }).sort({ date: -1 })

    res.status(200).json(transactions)
  } catch (error) {
    console.error("Error al obtener historial de transacciones:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de transacciones",
      error: error.message,
    })
  }
}
