const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    set: (v) => Math.round(v * 100) / 100,
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer'],
    required: [true, 'Transaction type is required'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  transferNote: {
    type: String,
    trim: true,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTransaction',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
