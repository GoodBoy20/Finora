const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  account_name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['bank', 'wallet'],
    required: [true, 'Account type is required'],
  },
  balance: {
    type: Number,
    default: 0,
    set: (v) => Math.round(v * 100) / 100,
  },
  currency: {
    type: String,
    default: 'INR',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Account', accountSchema);
