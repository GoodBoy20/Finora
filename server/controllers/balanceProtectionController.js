const { validationResult } = require('express-validator');
const BalanceProtection = require('../models/BalanceProtection');
const Account = require('../models/Account');

// GET /api/balance-protection
const getBalanceProtections = async (req, res) => {
  try {
    const rules = await BalanceProtection.find({ userId: req.userId })
      .populate('accountId', 'account_name type balance currency')
      .sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    console.error('Get balance protections error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/balance-protection
const createBalanceProtection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, minimumBalance, alertMessage, blockTransaction, isActive } = req.body;

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId: req.userId });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const rule = new BalanceProtection({
      userId: req.userId,
      accountId,
      minimumBalance,
      alertMessage,
      blockTransaction: blockTransaction || false,
      isActive: isActive !== undefined ? isActive : true,
    });

    await rule.save();

    const populated = await BalanceProtection.findById(rule._id)
      .populate('accountId', 'account_name type balance currency');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create balance protection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/balance-protection/:id
const updateBalanceProtection = async (req, res) => {
  try {
    const rule = await BalanceProtection.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('accountId', 'account_name type balance currency');

    if (!rule) {
      return res.status(404).json({ message: 'Balance protection rule not found' });
    }

    res.json(rule);
  } catch (err) {
    console.error('Update balance protection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/balance-protection/:id
const deleteBalanceProtection = async (req, res) => {
  try {
    const rule = await BalanceProtection.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!rule) {
      return res.status(404).json({ message: 'Balance protection rule not found' });
    }
    res.json({ message: 'Balance protection rule deleted' });
  } catch (err) {
    console.error('Delete balance protection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/balance-protection/check
// Also used internally by transactionController
const checkBalanceProtection = async ({ userId, accountId, transactionAmount, transactionType }) => {
  try {
    const rule = await BalanceProtection.findOne({
      userId,
      accountId,
      isActive: true,
    });

    if (!rule) {
      return { allowed: true };
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return { allowed: true };
    }

    let newBalance = account.balance;
    if (transactionType === 'expense' || transactionType === 'transfer') {
      newBalance -= parseFloat(transactionAmount);
    }

    if (newBalance < rule.minimumBalance) {
      if (rule.blockTransaction) {
        return { allowed: false, message: rule.alertMessage };
      } else {
        return { allowed: true, warning: rule.alertMessage };
      }
    }

    return { allowed: true };
  } catch (err) {
    console.error('Check balance protection error:', err);
    return { allowed: true };
  }
};

// HTTP endpoint wrapper for frontend pre-check
const checkBalanceProtectionEndpoint = async (req, res) => {
  try {
    const { accountId, transactionAmount, transactionType } = req.body;
    const result = await checkBalanceProtection({
      userId: req.userId,
      accountId,
      transactionAmount,
      transactionType,
    });
    res.json(result);
  } catch (err) {
    console.error('Check balance protection endpoint error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBalanceProtections,
  createBalanceProtection,
  updateBalanceProtection,
  deleteBalanceProtection,
  checkBalanceProtection,
  checkBalanceProtectionEndpoint,
};
