const mongoose = require('mongoose');

const playerScoreSchema = new mongoose.Schema({
  player: { type: String }, // ID del jugador de la API externa
  matchday: { type: Number, required: true }, // Jornada
  points: { type: Number, default: 0 }, // Puntos en esa jornada
  stats: { type: Object, default: {} }, // Estadísticas detalladas (opcional)
  createdAt: { type: Date, default: Date.now }
});

// Índice compuesto para búsquedas eficientes
playerScoreSchema.index({ player: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('PlayerScore', playerScoreSchema);
