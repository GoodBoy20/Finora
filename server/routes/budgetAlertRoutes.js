const router = require('express').Router();
const {
  getBudgetAlerts,
  createBudgetAlert,
  updateBudgetAlert,
  deleteBudgetAlert,
} = require('../controllers/budgetAlertController');
const auth = require('../middleware/auth');
const { budgetAlertValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getBudgetAlerts);
router.post('/', budgetAlertValidation, createBudgetAlert);
router.put('/:id', updateBudgetAlert);
router.delete('/:id', deleteBudgetAlert);

module.exports = router;
