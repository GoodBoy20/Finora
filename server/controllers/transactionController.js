const { validationResult } = require('express-validator');
const fs = require('fs');
const csv = require('csv-parser');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const { checkBudgetAlerts } = require('./budgetAlertController');
const { checkBalanceProtection } = require('./balanceProtectionController');

// Populate options shared across all queries
const populateFields = [
  { path: 'accountId', select: 'account_name type balance' },
  { path: 'toAccountId', select: 'account_name type balance' },
  { path: 'categoryId', select: 'name icon color category_type' },
];

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const { type, category, account, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.userId };

    if (type) filter.type = type;
    if (category) filter.categoryId = category;
    if (account) {
      filter.$or = [{ accountId: account }, { toAccountId: account }];
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .populate(populateFields)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, toAccountId, categoryId, amount, type, date, description, tags, transferNote } = req.body;
    const parsedAmount = parseFloat(amount);

    // ─── TRANSFER ───
    if (type === 'transfer') {
      if (!toAccountId) {
        return res.status(400).json({ message: 'To Account is required for transfers' });
      }
      if (accountId === toAccountId) {
        return res.status(400).json({ message: 'From and To accounts cannot be the same' });
      }

      const fromAccount = await Account.findOne({ _id: accountId, userId: req.userId });
      if (!fromAccount) return res.status(404).json({ message: 'From account not found' });

      const toAccount = await Account.findOne({ _id: toAccountId, userId: req.userId });
      if (!toAccount) return res.status(404).json({ message: 'To account not found' });

      // Balance protection check on FROM account
      let balanceWarning = null;
      const protectionResult = await checkBalanceProtection({
        userId: req.userId,
        accountId,
        transactionAmount: parsedAmount,
        transactionType: 'transfer',
      });
      if (!protectionResult.allowed) {
        return res.status(400).json({
          message: protectionResult.message || 'Transaction blocked by balance protection',
          blocked: true,
        });
      }
      if (protectionResult.warning) {
        balanceWarning = protectionResult.warning;
      }

      // Atomic balance updates with rollback safety
      fromAccount.balance -= parsedAmount;
      await fromAccount.save();
      try {
        toAccount.balance += parsedAmount;
        await toAccount.save();
      } catch (err) {
        // Rollback FROM account if TO account save fails
        fromAccount.balance += parsedAmount;
        await fromAccount.save();
        throw err;
      }

      const transaction = new Transaction({
        userId: req.userId,
        accountId,
        toAccountId,
        categoryId: null,
        amount: parsedAmount,
        type: 'transfer',
        date: date || Date.now(),
        description: description || '',
        transferNote: transferNote || '',
        tags: tags || [],
      });
      await transaction.save();

      const populated = await Transaction.findById(transaction._id).populate(populateFields);
      const response = { transaction: populated, triggeredAlerts: [] };
      if (balanceWarning) response.balanceWarning = balanceWarning;

      return res.status(201).json(response);
    }

    // ─── INCOME / EXPENSE ───
    const account = await Account.findOne({ _id: accountId, userId: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Balance protection check for expense
    let balanceWarning = null;
    if (type === 'expense') {
      const protectionResult = await checkBalanceProtection({
        userId: req.userId,
        accountId,
        transactionAmount: parsedAmount,
        transactionType: type,
      });
      if (!protectionResult.allowed) {
        return res.status(400).json({
          message: protectionResult.message || 'Transaction blocked by balance protection',
          blocked: true,
        });
      }
      if (protectionResult.warning) {
        balanceWarning = protectionResult.warning;
      }
    }

    // Update account balance
    if (type === 'income') {
      account.balance += parsedAmount;
    } else if (type === 'expense') {
      account.balance -= parsedAmount;
    }
    await account.save();

    // Update budget spent amount if expense
    if (type === 'expense' && categoryId) {
      const now = new Date(date || Date.now());
      const budgets = await Budget.find({
        userId: req.userId,
        categoryId,
        startDate: { $lte: now },
        endDate: { $gte: now },
      });
      for (const budget of budgets) {
        budget.spentAmount += parsedAmount;
        await budget.save();
      }
    }

    const transaction = new Transaction({
      userId: req.userId,
      accountId,
      toAccountId: null,
      categoryId: categoryId || null,
      amount: parsedAmount,
      type,
      date: date || Date.now(),
      description: description || '',
      tags: tags || [],
    });
    await transaction.save();

    // Check budget alerts after saving (only for income/expense)
    const triggeredAlerts = await checkBudgetAlerts(req.userId);

    const populated = await Transaction.findById(transaction._id).populate(populateFields);
    const response = { transaction: populated, triggeredAlerts };
    if (balanceWarning) response.balanceWarning = balanceWarning;

    res.status(201).json(response);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const oldTx = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!oldTx) return res.status(404).json({ message: 'Transaction not found' });

    const oldType = oldTx.type;
    const oldAmount = oldTx.amount;
    const oldAccountId = oldTx.accountId;
    const oldToAccountId = oldTx.toAccountId;
    const oldCategoryId = oldTx.categoryId;

    // ─── STEP 1: Reverse old balance effects ───
    if (oldType === 'transfer') {
      // Reverse: add back to FROM, deduct from TO
      const oldFrom = await Account.findById(oldAccountId);
      if (oldFrom) {
        oldFrom.balance += oldAmount;
        await oldFrom.save();
      }
      if (oldToAccountId) {
        const oldTo = await Account.findById(oldToAccountId);
        if (oldTo) {
          oldTo.balance -= oldAmount;
          await oldTo.save();
        }
      }
    } else if (oldType === 'income') {
      const oldAcc = await Account.findById(oldAccountId);
      if (oldAcc) {
        oldAcc.balance -= oldAmount;
        await oldAcc.save();
      }
    } else if (oldType === 'expense') {
      const oldAcc = await Account.findById(oldAccountId);
      if (oldAcc) {
        oldAcc.balance += oldAmount;
        await oldAcc.save();
      }
    }

    // Reverse old budget if expense
    if (oldType === 'expense' && oldCategoryId) {
      const oldBudgets = await Budget.find({
        userId: req.userId,
        categoryId: oldCategoryId,
        startDate: { $lte: oldTx.date },
        endDate: { $gte: oldTx.date },
      });
      for (const budget of oldBudgets) {
        budget.spentAmount = Math.max(0, budget.spentAmount - oldAmount);
        await budget.save();
      }
    }

    // ─── STEP 2: Apply new values ───
    const updates = req.body;
    Object.assign(oldTx, updates);
    if (updates.amount !== undefined) oldTx.amount = parseFloat(updates.amount);
    // Clear transfer fields if changing away from transfer
    if (oldTx.type !== 'transfer') {
      oldTx.toAccountId = null;
      oldTx.transferNote = '';
    }
    // Clear category if becoming a transfer
    if (oldTx.type === 'transfer') {
      oldTx.categoryId = null;
    }
    await oldTx.save();

    // ─── STEP 3: Apply new balance effects ───
    const newAmount = oldTx.amount;

    if (oldTx.type === 'transfer') {
      if (!oldTx.toAccountId) {
        return res.status(400).json({ message: 'To Account is required for transfers' });
      }
      if (oldTx.accountId.toString() === oldTx.toAccountId.toString()) {
        return res.status(400).json({ message: 'From and To accounts cannot be the same' });
      }

      const newFrom = await Account.findById(oldTx.accountId);
      if (newFrom) {
        newFrom.balance -= newAmount;
        await newFrom.save();
      }
      const newTo = await Account.findById(oldTx.toAccountId);
      if (newTo) {
        newTo.balance += newAmount;
        await newTo.save();
      }
    } else if (oldTx.type === 'income') {
      const newAcc = await Account.findById(oldTx.accountId);
      if (newAcc) {
        newAcc.balance += newAmount;
        await newAcc.save();
      }
    } else if (oldTx.type === 'expense') {
      const newAcc = await Account.findById(oldTx.accountId);
      if (newAcc) {
        newAcc.balance -= newAmount;
        await newAcc.save();
      }
    }

    // Apply new budget if expense
    if (oldTx.type === 'expense' && oldTx.categoryId) {
      const newBudgets = await Budget.find({
        userId: req.userId,
        categoryId: oldTx.categoryId,
        startDate: { $lte: oldTx.date },
        endDate: { $gte: oldTx.date },
      });
      for (const budget of newBudgets) {
        budget.spentAmount += newAmount;
        await budget.save();
      }
    }

    const populated = await Transaction.findById(oldTx._id).populate(populateFields);

    // Check budget alerts after update (skip for transfers)
    const triggeredAlerts = oldTx.type !== 'transfer' ? await checkBudgetAlerts(req.userId) : [];

    res.json({ transaction: populated, triggeredAlerts });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type === 'transfer') {
      // Reverse transfer: add back to FROM, deduct from TO
      const fromAccount = await Account.findById(transaction.accountId);
      if (fromAccount) {
        fromAccount.balance += transaction.amount;
        await fromAccount.save();
      }
      if (transaction.toAccountId) {
        const toAccount = await Account.findById(transaction.toAccountId);
        if (toAccount) {
          toAccount.balance -= transaction.amount;
          await toAccount.save();
        }
      }
    } else {
      // Reverse balance for income/expense
      const account = await Account.findById(transaction.accountId);
      if (account) {
        if (transaction.type === 'income') {
          account.balance -= transaction.amount;
        } else if (transaction.type === 'expense') {
          account.balance += transaction.amount;
        }
        await account.save();
      }

      // Reverse budget spent
      if (transaction.type === 'expense' && transaction.categoryId) {
        const budgets = await Budget.find({
          userId: req.userId,
          categoryId: transaction.categoryId,
          startDate: { $lte: transaction.date },
          endDate: { $gte: transaction.date },
        });
        for (const budget of budgets) {
          budget.spentAmount = Math.max(0, budget.spentAmount - transaction.amount);
          await budget.save();
        }
      }
    }

    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/transactions/import
const importCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    // Fetch user's accounts and categories once
    const userAccounts = await Account.find({ userId: req.userId });
    const userCategories = await Category.find({
      $or: [{ userId: req.userId }, { isDefault: true }],
    });

    if (userAccounts.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Create at least one account before importing' });
    }

    // Build case-insensitive lookup maps
    const accountMap = {};
    userAccounts.forEach((a) => {
      accountMap[a.account_name.toLowerCase().trim()] = a;
    });
    const categoryMap = {};
    userCategories.forEach((c) => {
      categoryMap[c.name.toLowerCase().trim()] = c;
    });

    // Parse CSV
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    const imported = [];
    const skipped = [];
    const warnings = [];

    // Helper: parse date in multiple formats
    const parseDate = (str) => {
      if (!str || !str.trim()) return null;
      const s = str.trim();

      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
      }
      // DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [day, month, year] = s.split('/');
        const d = new Date(`${year}-${month}-${day}T00:00:00`);
        return isNaN(d.getTime()) ? null : d;
      }
      // MM/DD/YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [month, day, year] = s.split('-');
        const d = new Date(`${year}-${month}-${day}T00:00:00`);
        return isNaN(d.getTime()) ? null : d;
      }
      // Fallback: let JS try
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2

      // A) Date validation
      const parsedDate = parseDate(row.date);
      if (!parsedDate) {
        skipped.push({ row: rowNum, reason: 'Invalid or missing date' });
        continue;
      }

      // B) Amount validation
      const rawAmount = (row.amount || '').replace(/[₹$,]/g, '').trim();
      const parsedAmount = parseFloat(rawAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        skipped.push({ row: rowNum, reason: 'Invalid or missing amount' });
        continue;
      }

      // C) Type validation
      const type = (row.type || '').toLowerCase().trim();
      if (!['income', 'expense', 'transfer'].includes(type)) {
        skipped.push({ row: rowNum, reason: 'Invalid type — must be income, expense, or transfer' });
        continue;
      }

      // D) Account (FROM) validation
      const accountName = (row.account || '').trim();
      if (!accountName) {
        skipped.push({ row: rowNum, reason: 'Account name is required for all rows' });
        continue;
      }
      const fromAccount = accountMap[accountName.toLowerCase()];
      if (!fromAccount) {
        skipped.push({ row: rowNum, reason: `Account '${accountName}' not found in your accounts` });
        continue;
      }

      // E) toAccount validation (transfers only)
      let toAccount = null;
      if (type === 'transfer') {
        const toAccountName = (row.toAccount || '').trim();
        if (!toAccountName) {
          skipped.push({ row: rowNum, reason: 'toAccount is required for transfer rows' });
          continue;
        }
        toAccount = accountMap[toAccountName.toLowerCase()];
        if (!toAccount) {
          skipped.push({ row: rowNum, reason: `toAccount '${toAccountName}' not found in your accounts` });
          continue;
        }
        if (fromAccount._id.toString() === toAccount._id.toString()) {
          skipped.push({ row: rowNum, reason: 'From and To accounts cannot be the same' });
          continue;
        }
      }

      // F) Category validation (income/expense only)
      let categoryId = null;
      if (type !== 'transfer') {
        const catName = (row.category || '').trim();
        if (catName) {
          const found = categoryMap[catName.toLowerCase()];
          if (found) {
            categoryId = found._id;
          } else {
            warnings.push({ row: rowNum, message: `Category '${catName}' not found — imported without category` });
          }
        } else {
          warnings.push({ row: rowNum, message: 'No category provided — imported without category' });
        }
      }

      // G) Build transaction object
      const txObj = {
        userId: req.userId,
        accountId: fromAccount._id,
        toAccountId: type === 'transfer' ? toAccount._id : null,
        categoryId,
        amount: Math.round(parsedAmount * 100) / 100,
        type,
        date: parsedDate,
        description: (row.description || '').trim(),
        transferNote: type === 'transfer' ? (row.description || '').trim() : '',
        isRecurring: false,
      };

      imported.push(txObj);
    }

    // Step 5: Bulk insert + balance updates (only if there are valid rows)
    if (imported.length > 0) {
      // Calculate balance deltas
      const balanceDelta = {};
      for (const tx of imported) {
        const accId = tx.accountId.toString();
        if (tx.type === 'income') {
          balanceDelta[accId] = (balanceDelta[accId] || 0) + tx.amount;
        } else if (tx.type === 'expense') {
          balanceDelta[accId] = (balanceDelta[accId] || 0) - tx.amount;
        } else if (tx.type === 'transfer') {
          balanceDelta[accId] = (balanceDelta[accId] || 0) - tx.amount;
          const toId = tx.toAccountId.toString();
          balanceDelta[toId] = (balanceDelta[toId] || 0) + tx.amount;
        }
      }

      try {
        await Transaction.insertMany(imported);
        // Apply balance updates only after successful insert
        await Promise.all(
          Object.entries(balanceDelta).map(([accId, delta]) =>
            Account.findByIdAndUpdate(accId, { $inc: { balance: Math.round(delta * 100) / 100 } })
          )
        );
      } catch (insertErr) {
        console.error('Import insertMany error:', insertErr);
        return res.status(500).json({
          message: 'Failed to save transactions — no balances were changed',
          success: false,
        });
      }
    }

    res.json({
      success: true,
      totalRows: rows.length,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      warnings,
    });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/transactions/export
const exportCSV = async (req, res) => {
  try {
    const { type, category, account, startDate, endDate } = req.query;
    const filter = { userId: req.userId };

    if (type) filter.type = type;
    if (category) filter.categoryId = category;
    if (account) {
      filter.$or = [{ accountId: account }, { toAccountId: account }];
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('accountId', 'account_name')
      .populate('toAccountId', 'account_name')
      .populate('categoryId', 'name')
      .sort({ date: -1 });

    // CSV escape helper
    function escapeCSV(value) {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const header = ['date', 'amount', 'type', 'category', 'description', 'account', 'toAccount'];

    const rows = transactions.map((t) => [
      new Date(t.date).toISOString().split('T')[0],
      t.amount.toFixed(2),
      t.type.toLowerCase(),
      t.type === 'transfer' ? '' : (t.categoryId?.name || ''),
      t.description || '',
      t.accountId?.account_name || '',
      t.type === 'transfer' ? (t.toAccountId?.account_name || '') : '',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n');

    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finora_transactions_${today}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction, importCSV, exportCSV };
