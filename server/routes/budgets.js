const router = require('express').Router();
const { getBudgets, createBudget, updateBudget, deleteBudget } = require('../controllers/budgetController');
const auth = require('../middleware/auth');
const { budgetValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getBudgets);
router.post('/', budgetValidation, createBudget);
router.put('/:id', budgetValidation, updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
