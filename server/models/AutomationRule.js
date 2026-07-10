const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conditionField: {
    type: String,
    required: true,
    enum: ['amount', 'category', 'type', 'description'],
  },
  conditionOperator: {
    type: String,
    required: true,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'],
  },
  conditionValue: {
    type: String,
    required: true,
  },
  actionType: {
    type: String,
    required: true,
    enum: ['add_tag', 'set_category', 'flag'],
  },
  actionValue: {
    type: String,
    required: true,
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

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
