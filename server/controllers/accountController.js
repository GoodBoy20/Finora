const { validationResult } = require('express-validator');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// GET /api/accounts
const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/accounts
const createAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { account_name, type, balance, currency } = req.body;

    const account = new Account({
      userId: req.userId,
      account_name,
      type,
      balance: balance || 0,
      currency: currency || 'INR',
    });

    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/accounts/:id
const updateAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/accounts/:id — cascade: also deletes transactions
const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Cascade delete transactions for this account
    await Transaction.deleteMany({ accountId: req.params.id });

    res.json({ message: 'Account and associated transactions deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAccounts, createAccount, updateAccount, deleteAccount };
