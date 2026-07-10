const { validationResult } = require('express-validator');
const RecurringTransaction = require('../models/RecurringTransaction');

// GET /api/recurring
const getRecurring = async (req, res) => {
  try {
    const rules = await RecurringTransaction.find({ userId: req.userId })
      .populate('accountId', 'account_name type')
      .populate('categoryId', 'name icon color')
      .sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/recurring
const createRecurring = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, categoryId, amount, type, description, frequency, nextRunDate } = req.body;

    const rule = new RecurringTransaction({
      userId: req.userId,
      accountId,
      categoryId,
      amount: parseFloat(amount),
      type,
      description: description || '',
      frequency,
      nextRunDate: new Date(nextRunDate),
    });

    await rule.save();

    const populated = await RecurringTransaction.findById(rule._id)
      .populate('accountId', 'account_name type')
      .populate('categoryId', 'name icon color');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/recurring/:id
const updateRecurring = async (req, res) => {
  try {
    const rule = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('accountId', 'account_name type')
      .populate('categoryId', 'name icon color');

    if (!rule) {
      return res.status(404).json({ message: 'Recurring rule not found' });
    }

    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/recurring/:id
const deleteRecurring = async (req, res) => {
  try {
    const rule = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!rule) {
      return res.status(404).json({ message: 'Recurring rule not found' });
    }
    res.json({ message: 'Recurring rule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getRecurring, createRecurring, updateRecurring, deleteRecurring };
