const mongoose = require('mongoose');

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 20
  },
  initialBudget: {
    type: Number,
    default: 100000000
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'manager'],
      default: 'manager'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('League', leagueSchema);
