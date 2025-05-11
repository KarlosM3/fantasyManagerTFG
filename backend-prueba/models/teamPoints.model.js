const mongoose = require('mongoose');

const teamPointsSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  matchday: { type: Number, required: true },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Índice compuesto para búsquedas eficientes
teamPointsSchema.index({ team: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('TeamPoints', teamPointsSchema);
