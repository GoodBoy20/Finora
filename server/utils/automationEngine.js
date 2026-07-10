const AutomationRule = require('../models/AutomationRule');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

const evaluateCondition = (transaction, rule, categories) => {
  const { conditionField, conditionOperator, conditionValue } = rule;
  let fieldValue;

  switch (conditionField) {
    case 'amount':
      fieldValue = transaction.amount;
      break;
    case 'category':
      const cat = categories.find((c) => c._id.toString() === transaction.categoryId.toString());
      fieldValue = cat ? cat.name : '';
      break;
    case 'type':
      fieldValue = transaction.type;
      break;
    case 'description':
      fieldValue = transaction.description || '';
      break;
    default:
      return false;
  }

  const numericValue = parseFloat(conditionValue);

  switch (conditionOperator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();
    case 'greater_than':
      return typeof fieldValue === 'number' && fieldValue > numericValue;
    case 'less_than':
      return typeof fieldValue === 'number' && fieldValue < numericValue;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    default:
      return false;
  }
};

const applyAction = async (transaction, rule) => {
  const { actionType, actionValue } = rule;

  switch (actionType) {
    case 'add_tag':
      if (!transaction.tags.includes(actionValue)) {
        transaction.tags.push(actionValue);
      }
      break;
    case 'set_category':
      const category = await Category.findOne({
        $or: [{ _id: actionValue }, { name: actionValue }],
      });
      if (category) {
        transaction.categoryId = category._id;
      }
      break;
    case 'flag':
      if (!transaction.tags.includes(`flag:${actionValue}`)) {
        transaction.tags.push(`flag:${actionValue}`);
      }
      break;
  }

  await transaction.save();
};

const applyAutomationRules = async (transaction, userId) => {
  try {
    const rules = await AutomationRule.find({ userId, isActive: true });
    if (rules.length === 0) return;

    const categories = await Category.find({
      $or: [{ userId }, { isDefault: true }],
    });

    for (const rule of rules) {
      if (evaluateCondition(transaction, rule, categories)) {
        await applyAction(transaction, rule);
      }
    }
  } catch (err) {
    console.error('Error applying automation rules:', err);
  }
};

module.exports = { applyAutomationRules };
