const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress',
  },
  start_time: {
    type: Date,
    default: Date.now,
  },
  end_time: {
    type: Date,
  },
  multiplier: {
    type: Number,
    default: 1,
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  bets: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
    },
    cashout: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['live', 'cashed_out', 'lost'],
      default: 'live',
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
    },
  }],
  result: {
    type: Number,
  },
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;