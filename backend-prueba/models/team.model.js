// team.model.js - Añadir el campo joinedMatchday
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  playersData: { type: Array, default: [] },
  budget: { type: Number, default: 100000000 },
  createdAt: { type: Date, default: Date.now },
  captain: { type: String, default: null },
  viceCaptain: { type: String, default: null },
  formation: { type: String, default: '4-4-2' },
  startingEleven: { type: Array, default: [] },
  lastSaved: { type: Date, default: Date.now },
  matchdaysPlayed: { type: Number, default: 0 },
  joinedMatchday: { type: Number, default: null } // AÑADIR ESTE CAMPO
});

module.exports = mongoose.model('Team', teamSchema);
