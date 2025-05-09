const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "League",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player: {
    id: String,
    name: String,
    positionId: String,
    team: String,
  },
  type: {
    type: String,
    enum: ["buy", "sell"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Transaction", transactionSchema)
