const { validationResult } = require('express-validator');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [{ userId: req.userId }, { isDefault: true }],
    }).sort({ isDefault: -1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category_type, icon, color } = req.body;

    const category = new Category({
      userId: req.userId,
      name,
      category_type,
      icon: icon || 'Tag',
      color: color || '#10B981',
      isDefault: false,
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Don't allow editing default categories by other users
    if (category.isDefault) {
      return res.status(403).json({ message: 'Cannot edit default categories' });
    }

    if (category.userId && category.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(category, req.body);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.isDefault) {
      return res.status(403).json({ message: 'Cannot delete default categories' });
    }

    if (category.userId && category.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if any transactions use this category
    const txCount = await Transaction.countDocuments({ categoryId: req.params.id });
    if (txCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category — ${txCount} transaction(s) use this category. Reassign them first.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
