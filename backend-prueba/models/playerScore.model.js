const mongoose = require('mongoose');

const playerScoreSchema = new mongoose.Schema({
  player: { type: String }, // ID externo del jugador de la API
  matchday: { type: Number, required: true },
  points: { type: Number, default: 0 },
  stats: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

// Índice compuesto para búsquedas eficientes
playerScoreSchema.index({ player: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('PlayerScore', playerScoreSchema);
