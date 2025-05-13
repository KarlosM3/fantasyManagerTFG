const Team = require("../models/team.model")
const Market = require("../models/market.model")
const Transaction = require("../models/transaction.model")
const Bid = require("../models/bid.model")
const MarketListening = require("../models/market-listening.model")
const MarketOffer = require("../models/market-offer.model")
const axios = require("axios")
const mongoose = require("mongoose")

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
    
    // Obtener conteo de pujas por jugador
    const bidCounts = await Bid.aggregate([
      { $match: { league: new mongoose.Types.ObjectId(leagueId) } },
      { $group: { _id: "$player.id", count: { $sum: 1 } } }
    ]);
    
    // Crear un mapa de conteos
    const bidCountMap = {};
    bidCounts.forEach(item => {
      bidCountMap[item._id] = item.count;
    });
    
    // Añadir conteo a los jugadores
    const playersWithBidCount = market.players.map(player => ({
      ...player,
      bidCount: bidCountMap[player.id] || 0
    }));
    
    // Devolver un objeto con los jugadores y la información de actualización
    res.status(200).json({
      players: playersWithBidCount,
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
    // Procesar pujas existentes antes de actualizar el mercado
    await exports.processBids(leagueId);
    
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
    const newMarket = await Market.findOneAndUpdate(
      { league: leagueId },
      {
        players: marketPlayers,
        lastUpdated: new Date(),
        nextUpdate: nextUpdate
      },
      { new: true, upsert: true }
    );
    
    return newMarket;
  } catch (error) {
    console.error("Error al refrescar el mercado:", error);
    throw error;
  }
}



// Hacer una puja por un jugador
exports.placeBid = async (req, res) => {
  try {
    const { playerId, leagueId, amount } = req.body;
    const userId = req.user.id || req.user._id;

    // Verificar que el jugador está en el mercado
    const market = await Market.findOne({ league: leagueId });
    if (!market) {
      return res.status(404).json({ success: false, message: 'Mercado no encontrado' });
    }

    const player = market.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Jugador no disponible en el mercado' });
    }

    // Verificar presupuesto del equipo
    const team = await Team.findOne({ user: userId, league: leagueId });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }

    if (team.budget < amount) {
      return res.status(400).json({ success: false, message: 'Presupuesto insuficiente para esta puja' });
    }

    // Verificar si ya existe una puja del mismo usuario por este jugador
    const existingBid = await Bid.findOne({ 
      league: leagueId, 
      'player.id': playerId, 
      user: userId 
    });

    if (existingBid) {
      // Actualizar puja existente
      existingBid.amount = amount;
      await existingBid.save();
    } else {
      // Crear nueva puja
      await Bid.create({
        league: leagueId,
        player: player,
        user: userId,
        amount: amount
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Puja realizada con éxito',
      bidAmount: amount
    });
  } catch (error) {
    console.error('Error al realizar puja:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la puja', 
      error: error.message 
    });
  }
};

// Procesar pujas cuando se actualiza el mercado
exports.processBids = async (leagueId) => {
  try {
    // Obtener todas las pujas para esta liga
    const allBids = await Bid.find({ league: leagueId });
    
    // Agrupar pujas por jugador
    const bidsByPlayer = {};
    allBids.forEach(bid => {
      if (!bidsByPlayer[bid.player.id]) {
        bidsByPlayer[bid.player.id] = [];
      }
      bidsByPlayer[bid.player.id].push(bid);
    });

    // Para cada jugador, encontrar la puja más alta
    for (const playerId in bidsByPlayer) {
      const playerBids = bidsByPlayer[playerId];
      
      // Ordenar pujas por monto (de mayor a menor)
      playerBids.sort((a, b) => b.amount - a.amount);
      
      if (playerBids.length > 0) {
        const winningBid = playerBids[0];
        
        // Asignar jugador al ganador
        const team = await Team.findOne({ 
          user: winningBid.user, 
          league: leagueId 
        });
        
        if (team) {
          // Restar el monto de la puja del presupuesto
          team.budget -= winningBid.amount;
          
          // Añadir jugador al equipo
          team.playersData.push(winningBid.player);
          
          await team.save();
          
          // Registrar la transacción
          await Transaction.create({
            league: leagueId,
            user: winningBid.user,
            player: {
              id: winningBid.player.id,
              name: winningBid.player.nickname || winningBid.player.name,
              positionId: winningBid.player.positionId,
              team: winningBid.player.team?.name || "Sin equipo",
            },
            type: "buy",
            amount: winningBid.amount,
            date: new Date(),
          });
        }
      }
    }

    // Eliminar todas las pujas procesadas
    await Bid.deleteMany({ league: leagueId });

    return true;
  } catch (error) {
    console.error('Error al procesar pujas:', error);
    return false;
  }
};


// Obtener pujas del usuario actual
exports.getUserBids = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const userId = req.user.id || req.user._id;

    const bids = await Bid.find({ 
      league: leagueId, 
      user: userId 
    }).sort({ createdAt: -1 });

    res.status(200).json(bids);
  } catch (error) {
    console.error('Error al obtener pujas del usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener pujas', 
      error: error.message 
    });
  }
};



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

// Poner jugador a la venta
exports.listPlayerForSale = async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { playerId, askingPrice } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Verificar que el jugador pertenece al usuario
    const team = await Team.findOne({ league: leagueId, user: userId });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    
    const playerIndex = team.playersData.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return res.status(404).json({ success: false, message: 'Jugador no encontrado en tu equipo' });
    }
    
    const player = team.playersData[playerIndex];
    
    // Verificar precio mínimo
    if (askingPrice < Number(player.marketValue)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El precio debe ser al menos igual al valor de mercado del jugador' 
      });
    }
    
    // Crear listado de venta
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3); // 3 días de duración
    
    const listing = await MarketListening.create({
      league: leagueId,
      seller: userId,
      player: player,
      askingPrice: askingPrice,
      expiryDate: expiryDate,
      status: 'active'
    });
    
    // Generar una oferta automática (entre 80% y 95% del precio pedido)
    const minPercentage = 0.80;
    const maxPercentage = 0.95;
    const randomPercentage = minPercentage + Math.random() * (maxPercentage - minPercentage);
    const autoOfferAmount = Math.round(askingPrice * randomPercentage);
    
    // Crear la oferta automática
    await MarketOffer.create({
      listing: listing._id,
      amount: autoOfferAmount,
      isAutoOffer: true,
      status: 'pending',
      createdAt: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Jugador puesto a la venta con éxito'
    });
  } catch (error) {
    console.error('Error al poner jugador a la venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la venta',
      error: error.message
    });
  }
};



// Obtener jugadores puestos a la venta en una liga
exports.getListedPlayers = async (req, res) => {
  try {
    const { leagueId } = req.query;
    
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere el ID de la liga"
      });
    }
    
    // Obtener listados activos que no hayan expirado
    const listings = await MarketListening.find({
      league: leagueId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    }).populate('seller', 'username');
    
    // Obtener ofertas para cada listado
    const listingsWithOffers = await Promise.all(listings.map(async (listing) => {
      const offers = await MarketOffer.find({ 
        listing: listing._id,
        status: 'pending'
      }).sort({ amount: -1 });
      
      // Contar ofertas y obtener la oferta más alta
      const offerCount = offers.length;
      const highestOffer = offers.length > 0 ? offers[0].amount : 0;
      
      return {
        ...listing.toObject(),
        offerCount,
        highestOffer
      };
    }));
    
    res.status(200).json(listingsWithOffers);
  } catch (error) {
    console.error("Error al obtener jugadores en venta:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener jugadores en venta",
      error: error.message,
    });
  }
};


// Hacer una oferta por un jugador puesto a la venta
exports.makeOffer = async (req, res) => {
  try {
    const { listingId, amount } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Verificar que el listado existe y está activo
    const listing = await MarketListening.findOne({ 
      _id: listingId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    });
    
    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Listado no encontrado o ya no está disponible' 
      });
    }
    
    // Verificar que el usuario no es el vendedor
    if (listing.seller.toString() === userId.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes hacer una oferta por tu propio jugador' 
      });
    }
    
    // Verificar presupuesto del equipo
    const team = await Team.findOne({ user: userId, league: listing.league });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    
    if (team.budget < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Presupuesto insuficiente para esta oferta' 
      });
    }
    
    // Verificar que la oferta es al menos igual al precio pedido
    if (amount < listing.askingPrice) {
      return res.status(400).json({ 
        success: false, 
        message: `La oferta debe ser al menos ${listing.askingPrice}` 
      });
    }
    
    // Crear o actualizar oferta
    const existingOffer = await MarketOffer.findOne({
      listing: listingId,
      buyer: userId,
      status: 'pending'
    });
    
    if (existingOffer) {
      existingOffer.amount = amount;
      await existingOffer.save();
    } else {
      await MarketOffer.create({
        listing: listingId,
        buyer: userId,
        amount: amount,
        status: 'pending',
        isAutoOffer: false
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Oferta realizada con éxito'
    });
  } catch (error) {
    console.error('Error al realizar oferta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la oferta',
      error: error.message
    });
  }
};


// Aceptar una oferta
// En market.controller.js, método acceptOffer
exports.acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Obtener la oferta con el listado
    const offer = await MarketOffer.findById(offerId)
      .populate({
        path: 'listing',
        populate: { path: 'seller' }
      });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
    }
    
    // Verificar que el usuario es el vendedor
    if (offer.listing.seller._id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para aceptar esta oferta' 
      });
    }
    
    // Verificar que el listado sigue activo
    if (offer.listing.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Este listado ya no está activo' 
      });
    }
    
    // Obtener el equipo del vendedor
    const sellerTeam = await Team.findOne({ 
      user: userId, 
      league: offer.listing.league 
    });
    
    if (!sellerTeam) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    
    // Verificar si es una oferta automática o de usuario real
    if (offer.isAutoOffer) {
      // Procesar oferta automática (sin transferencia a otro equipo)
      
      // 1. Quitar jugador del equipo del vendedor
      const playerIndex = sellerTeam.playersData.findIndex(
        p => p.id === offer.listing.player.id
      );
      
      if (playerIndex === -1) {
        return res.status(400).json({ 
          success: false, 
          message: 'El jugador ya no está en tu equipo' 
        });
      }
      
      // 2. Actualizar presupuesto del vendedor
      sellerTeam.playersData.splice(playerIndex, 1);
      sellerTeam.budget += offer.amount;
      await sellerTeam.save();
      
      // 3. Actualizar estado del listado y de la oferta
      offer.listing.status = 'sold';
      await offer.listing.save();
      
      offer.status = 'accepted';
      await offer.save();
      
      // 4. Rechazar otras ofertas
      await MarketOffer.updateMany(
        { listing: offer.listing._id, _id: { $ne: offerId } },
        { status: 'rejected' }
      );
      
      // 5. Registrar transacción de venta
      await Transaction.create({
        league: offer.listing.league,
        user: userId,
        player: {
          id: offer.listing.player.id,
          name: offer.listing.player.nickname || offer.listing.player.name,
          positionId: offer.listing.player.positionId,
          team: offer.listing.player.team?.name || "Sin equipo",
        },
        type: "sell",
        amount: offer.amount,
        date: new Date(),
      });
      
      res.status(200).json({
        success: true,
        message: 'Oferta automática aceptada con éxito',
        newBudget: sellerTeam.budget
      });
    } else {
      // Procesar oferta de usuario real (código existente)
      const buyerTeam = await Team.findOne({ 
        user: offer.buyer, 
        league: offer.listing.league 
      });
      
      if (!buyerTeam) {
        return res.status(404).json({ success: false, message: 'Equipo del comprador no encontrado' });
      }
      
      // Verificar que el comprador tiene suficiente presupuesto
      if (buyerTeam.budget < offer.amount) {
        return res.status(400).json({ 
          success: false, 
          message: 'El comprador ya no tiene suficiente presupuesto' 
        });
      }
      
      // Quitar jugador del equipo del vendedor
      const playerIndex = sellerTeam.playersData.findIndex(p => p.id === offer.listing.player.id);
            
      if (playerIndex === -1) {
        return res.status(400).json({ 
          success: false, 
          message: 'El jugador ya no está en tu equipo' 
        });
      }

      const playerToTransfer = sellerTeam.playersData[playerIndex];

      // Verificar límites del equipo comprador
      // 1. Límites por posición
      const positionCounts = {
        1: 0, // Porteros
        2: 0, // Defensas
        3: 0, // Centrocampistas
        4: 0, // Delanteros
      };

      buyerTeam.playersData.forEach(player => {
        if (positionCounts[player.positionId] !== undefined) {
          positionCounts[player.positionId]++;
        }
      });

      const positionLimits = {
        1: 2, // Máximo 2 porteros
        2: 5, // Máximo 5 defensas
        3: 5, // Máximo 5 centrocampistas
        4: 3, // Máximo 3 delanteros
      };

      if (positionCounts[playerToTransfer.positionId] >= positionLimits[playerToTransfer.positionId]) {
        return res.status(400).json({
          success: false,
          message: `El comprador ya tiene el máximo de jugadores permitidos en esta posición`
        });
      }

      // 2. Verificar límite de jugadores por equipo (máximo 3 del mismo equipo)
      if (playerToTransfer.team && playerToTransfer.team.name) {
        const sameTeamCount = buyerTeam.playersData.filter(
          player => player.team && player.team.name === playerToTransfer.team.name
        ).length;
        
        if (sameTeamCount >= 3) {
          return res.status(400).json({
            success: false,
            message: `El comprador ya tiene el máximo de 3 jugadores del equipo ${playerToTransfer.team.name}`
          });
        }
      }

      // Realizar la transferencia
      // 1. Quitar jugador del equipo del vendedor
      sellerTeam.playersData.splice(playerIndex, 1);
      sellerTeam.budget += offer.amount;
      await sellerTeam.save();

      // 2. Añadir jugador al equipo del comprador
      buyerTeam.playersData.push(playerToTransfer);
      buyerTeam.budget -= offer.amount;
      await buyerTeam.save();

      // 3. Actualizar estado del listado y de la oferta
      offer.listing.status = 'sold';
      await offer.listing.save();

      offer.status = 'accepted';
      await offer.save();

      // 4. Rechazar otras ofertas
      await MarketOffer.updateMany(
        { listing: offer.listing._id, _id: { $ne: offerId } },
        { status: 'rejected' }
      );

      // 5. Registrar transacciones
      // Transacción de venta para el vendedor
      await Transaction.create({
        league: offer.listing.league,
        user: userId,
        player: {
          id: playerToTransfer.id,
          name: playerToTransfer.nickname || playerToTransfer.name,
          positionId: playerToTransfer.positionId,
          team: playerToTransfer.team?.name || "Sin equipo",
        },
        type: "sell",
        amount: offer.amount,
        date: new Date(),
      });

      // Transacción de compra para el comprador
      await Transaction.create({
        league: offer.listing.league,
        user: offer.buyer,
        player: {
          id: playerToTransfer.id,
          name: playerToTransfer.nickname || playerToTransfer.name,
          positionId: playerToTransfer.positionId,
          team: playerToTransfer.team?.name || "Sin equipo",
        },
        type: "buy",
        amount: offer.amount,
        date: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Oferta aceptada con éxito',
        newBudget: sellerTeam.budget
      });

    }
  } catch (error) {
    console.error('Error al aceptar oferta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la aceptación',
      error: error.message
    });
  }
};


// Obtener ofertas recibidas por los jugadores del usuario
exports.getReceivedOffers = async (req, res) => {
  try {
    const { leagueId } = req.query;
    const userId = req.user.id || req.user._id;
    
    if (!leagueId) {
      return res.status(400).json({
        success: false,
        message: "Se requiere el ID de la liga"
      });
    }
    
    // Buscar listados del usuario
    const listings = await MarketListening.find({
      league: leagueId,
      seller: userId,
      status: 'active'
    });
    
    const listingIds = listings.map(listing => listing._id);
    
    // Buscar ofertas para esos listados
    const offers = await MarketOffer.find({
      listing: { $in: listingIds },
      status: 'pending'
    }).populate({
      path: 'listing',
      populate: { path: 'seller', select: 'name' }
    }).populate('buyer', 'name');
    
    // Agrupar ofertas por listado
    const offersByListing = {};
    
    for (const offer of offers) {
      const listingId = offer.listing._id.toString();
      
      if (!offersByListing[listingId]) {
        offersByListing[listingId] = {
          listing: offer.listing,
          offers: []
        };
      }
      
      offersByListing[listingId].offers.push(offer);
    }
    
    // Convertir a array
    const result = Object.values(offersByListing);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener ofertas recibidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ofertas recibidas',
      error: error.message
    });
  }
};

// Rechazar una oferta
exports.rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Obtener la oferta con el listado
    const offer = await MarketOffer.findById(offerId)
      .populate({
        path: 'listing',
        populate: { path: 'seller' }
      });
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
    }
    
    // Verificar que el usuario es el vendedor
    if (offer.listing.seller._id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para rechazar esta oferta' 
      });
    }
    
    // Actualizar estado de la oferta
    offer.status = 'rejected';
    await offer.save();
    
    res.status(200).json({
      success: true,
      message: 'Oferta rechazada con éxito'
    });
  } catch (error) {
    console.error('Error al rechazar oferta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar oferta',
      error: error.message
    });
  }
};

