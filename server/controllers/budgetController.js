const { validationResult } = require('express-validator');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// GET /api/budgets
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId })
      .populate('categoryId', 'name icon color category_type')
      .sort({ createdAt: -1 });

    // Recalculate spent amounts from actual transactions
    const enrichedBudgets = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await Transaction.aggregate([
          {
            $match: {
              userId: budget.userId,
              categoryId: budget.categoryId._id,
              type: 'expense',
              date: { $gte: budget.startDate, $lte: budget.endDate },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const budgetObj = budget.toObject();
        budgetObj.spentAmount = spent.length > 0 ? Math.round(spent[0].total * 100) / 100 : 0;
        return budgetObj;
      })
    );

    res.json(enrichedBudgets);
  } catch (err) {
    console.error('Get budgets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/budgets
const createBudget = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { categoryId, limitAmount, period, startDate, endDate } = req.body;

    const budget = new Budget({
      userId: req.userId,
      categoryId,
      limitAmount: parseFloat(limitAmount),
      spentAmount: 0,
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    await budget.save();

    const populated = await Budget.findById(budget._id).populate(
      'categoryId',
      'name icon color category_type'
    );

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/budgets/:id
const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('categoryId', 'name icon color category_type');

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
