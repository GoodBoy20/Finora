const { validationResult } = require('express-validator');
const AutomationRule = require('../models/AutomationRule');

// GET /api/rules
const getRules = async (req, res) => {
  try {
    const rules = await AutomationRule.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/rules
const createRule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conditionField, conditionOperator, conditionValue, actionType, actionValue } = req.body;

    const rule = new AutomationRule({
      userId: req.userId,
      conditionField,
      conditionOperator,
      conditionValue,
      actionType,
      actionValue,
    });

    await rule.save();
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/rules/:id
const updateRule = async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/rules/:id
const deleteRule = async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Automation rule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getRules, createRule, updateRule, deleteRule };
