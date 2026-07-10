const { validationResult } = require('express-validator');
const BudgetAlert = require('../models/BudgetAlert');
const Budget = require('../models/Budget');

// GET /api/budget-alerts
const getBudgetAlerts = async (req, res) => {
  try {
    const alerts = await BudgetAlert.find({ userId: req.userId })
      .populate('categoryId', 'name icon color category_type')
      .populate('budgetId', 'limitAmount spentAmount period startDate endDate')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    console.error('Get budget alerts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/budget-alerts
const createBudgetAlert = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { categoryId, budgetId, thresholdPercent, alertMessage, isActive } = req.body;

    // Verify budget belongs to user
    const budget = await Budget.findOne({ _id: budgetId, userId: req.userId });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const alert = new BudgetAlert({
      userId: req.userId,
      categoryId,
      budgetId,
      thresholdPercent: thresholdPercent || 80,
      alertMessage,
      isActive: isActive !== undefined ? isActive : true,
    });

    await alert.save();

    const populated = await BudgetAlert.findById(alert._id)
      .populate('categoryId', 'name icon color category_type')
      .populate('budgetId', 'limitAmount spentAmount period startDate endDate');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create budget alert error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/budget-alerts/:id
const updateBudgetAlert = async (req, res) => {
  try {
    const alert = await BudgetAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name icon color category_type')
      .populate('budgetId', 'limitAmount spentAmount period startDate endDate');

    if (!alert) {
      return res.status(404).json({ message: 'Budget alert not found' });
    }

    res.json(alert);
  } catch (err) {
    console.error('Update budget alert error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/budget-alerts/:id
const deleteBudgetAlert = async (req, res) => {
  try {
    const alert = await BudgetAlert.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!alert) {
      return res.status(404).json({ message: 'Budget alert not found' });
    }
    res.json({ message: 'Budget alert deleted' });
  } catch (err) {
    console.error('Delete budget alert error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check budget alerts for a user — called after transaction create/update
const checkBudgetAlerts = async (userId) => {
  try {
    const alerts = await BudgetAlert.find({ userId, isActive: true })
      .populate('budgetId', 'limitAmount spentAmount');

    const triggered = [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const alert of alerts) {
      if (!alert.budgetId) continue;

      const { limitAmount, spentAmount } = alert.budgetId;
      if (!limitAmount || limitAmount <= 0) continue;

      const percentage = (spentAmount / limitAmount) * 100;

      if (percentage >= alert.thresholdPercent) {
        // Check if alert has already fired this month
        if (alert.triggeredAt && alert.triggeredAt >= monthStart) {
          continue;
        }

        alert.triggeredAt = now;
        await alert.save();

        triggered.push({
          _id: alert._id,
          alertMessage: alert.alertMessage,
          thresholdPercent: alert.thresholdPercent,
          percentage: Math.round(percentage),
          triggeredAt: now,
        });
      }
    }

    return triggered;
  } catch (err) {
    console.error('Check budget alerts error:', err);
    return [];
  }
};

module.exports = {
  getBudgetAlerts,
  createBudgetAlert,
  updateBudgetAlert,
  deleteBudgetAlert,
  checkBudgetAlerts,
};
