const mongoose = require('mongoose');

const marketListingSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player: { type: Object, required: true },
  askingPrice: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'sold', 'expired', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MarketListing', marketListingSchema);