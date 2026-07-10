const { body, query } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('securityKey').notEmpty().withMessage('Security key is required'),
];

const accountValidation = [
  body('account_name').trim().notEmpty().withMessage('Account name is required'),
  body('type').isIn(['bank', 'wallet']).withMessage('Type must be bank or wallet'),
  body('balance').optional().isNumeric().withMessage('Balance must be a number'),
  body('currency').optional().trim(),
];

const transactionValidation = [
  body('accountId').notEmpty().withMessage('Account is required'),
  body('categoryId').optional({ nullable: true }),
  body('toAccountId').optional({ nullable: true }),
  body('transferNote').optional().trim(),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('date').optional().isISO8601().withMessage('Date must be valid'),
  body('description').optional().trim(),
  body('tags').optional().isArray(),
];

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('category_type').isIn(['income', 'expense']).withMessage('Category type must be income or expense'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
];

const budgetValidation = [
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('limitAmount').isNumeric().withMessage('Limit amount must be a number'),
  body('period').isIn(['monthly', 'weekly', 'yearly']).withMessage('Period must be monthly, weekly, or yearly'),
  body('startDate').isISO8601().withMessage('Start date is required'),
  body('endDate').isISO8601().withMessage('End date is required'),
];

const recurringValidation = [
  body('accountId').notEmpty().withMessage('Account is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Invalid type'),
  body('frequency').isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid frequency'),
  body('nextRunDate').isISO8601().withMessage('Next run date is required'),
];

const budgetAlertValidation = [
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('budgetId').notEmpty().withMessage('Budget is required'),
  body('thresholdPercent').isNumeric().withMessage('Threshold must be a number'),
  body('alertMessage').trim().notEmpty().withMessage('Alert message is required'),
];

const balanceProtectionValidation = [
  body('accountId').notEmpty().withMessage('Account is required'),
  body('minimumBalance').isNumeric().withMessage('Minimum balance must be a number'),
  body('alertMessage').trim().notEmpty().withMessage('Alert message is required'),
];

module.exports = {
  registerValidation,
  loginValidation,
  accountValidation,
  transactionValidation,
  categoryValidation,
  budgetValidation,
  recurringValidation,
  budgetAlertValidation,
  balanceProtectionValidation,
};
