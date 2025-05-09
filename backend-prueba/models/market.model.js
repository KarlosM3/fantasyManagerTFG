const mongoose = require("mongoose");

const marketSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  players: [{ type: Object }],
  lastUpdated: { type: Date, default: Date.now },
  nextUpdate: { type: Date, required: true }
});

module.exports = mongoose.model("Market", marketSchema);
