const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const getNextDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
};

const processRecurringTransactions = async () => {
  const now = new Date();
  const dueRules = await RecurringTransaction.find({
    isActive: true,
    nextRunDate: { $lte: now },
  });

  for (const rule of dueRules) {
    try {
      // Create the transaction
      const transaction = new Transaction({
        userId: rule.userId,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        amount: rule.amount,
        type: rule.type,
        date: new Date(),
        description: rule.description || 'Recurring transaction',
        isRecurring: true,
        recurringRuleId: rule._id,
      });
      await transaction.save();

      // Update account balance
      const account = await Account.findById(rule.accountId);
      if (account) {
        if (rule.type === 'income') {
          account.balance += rule.amount;
        } else if (rule.type === 'expense') {
          account.balance -= rule.amount;
        }
        await account.save();
      }

      // Update next run date
      rule.nextRunDate = getNextDate(rule.nextRunDate, rule.frequency);
      await rule.save();
    } catch (err) {
      console.error(`Error processing recurring rule ${rule._id}:`, err);
    }
  }
};

module.exports = { processRecurringTransactions };
