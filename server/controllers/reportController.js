const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// GET /api/reports/summary — total income, expenses, balance
const getSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const incomeResult = await Transaction.aggregate([
      { $match: { userId, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const expenseResult = await Transaction.aggregate([
      { $match: { userId, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const accounts = await Account.find({ userId: req.userId });
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    res.json({
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reports/monthly — monthly breakdown
const getMonthly = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const result = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate },
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format into monthly data
    const monthlyData = {};
    result.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, income: 0, expense: 0 };
      }
      monthlyData[key][item._id.type] = Math.round(item.total * 100) / 100;
    });

    res.json(Object.values(monthlyData));
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reports/category — spending by category
const getCategoryReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;

    const match = { userId, type: 'expense' };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const result = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          name: '$category.name',
          color: '$category.color',
          icon: '$category.icon',
          total: { $round: ['$total', 2] },
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error('Category report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reports/cashflow — income vs expense over time
const getCashflow = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const result = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate },
          type: { $in: ['income', 'expense'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const cashflowData = {};
    result.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!cashflowData[key]) {
        cashflowData[key] = { month: key, income: 0, expense: 0, net: 0 };
      }
      cashflowData[key][item._id.type] = Math.round(item.total * 100) / 100;
    });

    // Calculate net
    Object.values(cashflowData).forEach((item) => {
      item.net = Math.round((item.income - item.expense) * 100) / 100;
    });

    res.json(Object.values(cashflowData));
  } catch (err) {
    console.error('Cashflow report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSummary, getMonthly, getCategoryReport, getCashflow };
