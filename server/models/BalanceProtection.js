const mongoose = require('mongoose');

const balanceProtectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  minimumBalance: {
    type: Number,
    required: [true, 'Minimum balance is required'],
    set: (v) => Math.round(v * 100) / 100,
  },
  alertMessage: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
  },
  blockTransaction: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('BalanceProtection', balanceProtectionSchema);
