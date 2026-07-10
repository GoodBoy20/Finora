const router = require('express').Router();
const { getRules, createRule, updateRule, deleteRule } = require('../controllers/ruleController');
const auth = require('../middleware/auth');
const { ruleValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getRules);
router.post('/', ruleValidation, createRule);
router.put('/:id', ruleValidation, updateRule);
router.delete('/:id', deleteRule);

module.exports = router;
