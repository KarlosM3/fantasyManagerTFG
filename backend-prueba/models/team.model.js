const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  playersData: { type: Array, default: [] }, // <-- NUEVO
  budget: { type: Number, default: 100000000 },
  createdAt: { type: Date, default: Date.now },
  captain: { type: String, default: null }, 
  viceCaptain: { type: String, default: null },
  formation: { type: String, default: '4-4-2' },
  startingEleven: { type: Array, default: [] },
  lastSaved: { type: Date, default: Date.now }, // Para seguimiento de la última actualización
  matchdaysPlayed: { type: Number, default: 0 } // Nuevo campo para contar jornadas jugadas
});

// Añadir al team.model.js existente
teamSchema.methods.calculatePoints = async function(matchday) {
  const PlayerScore = mongoose.model('PlayerScore');
  
  // Obtener puntos de todos los jugadores del equipo para una jornada específica
  const playerScores = await PlayerScore.find({
    player: { $in: this.players },
    matchday: matchday
  }).populate('player');
  
  // Calcular puntos totales
  const totalPoints = playerScores.reduce((sum, score) => sum + score.points, 0);
  
  return {
    totalPoints,
    playerScores
  };
};

module.exports = mongoose.model('Team', teamSchema);
