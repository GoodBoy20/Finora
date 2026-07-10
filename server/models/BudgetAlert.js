const mongoose = require('mongoose');

const budgetAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget',
    required: true,
  },
  thresholdPercent: {
    type: Number,
    required: [true, 'Threshold percentage is required'],
    min: 10,
    max: 100,
    default: 80,
  },
  alertMessage: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  triggeredAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('BudgetAlert', budgetAlertSchema);
