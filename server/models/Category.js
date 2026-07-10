const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  category_type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Category type is required'],
  },
  icon: {
    type: String,
    default: 'Tag',
  },
  color: {
    type: String,
    default: '#10B981',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Category', categorySchema);
