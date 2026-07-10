const router = require('express').Router();
const {
  getBalanceProtections,
  createBalanceProtection,
  updateBalanceProtection,
  deleteBalanceProtection,
  checkBalanceProtectionEndpoint,
} = require('../controllers/balanceProtectionController');
const auth = require('../middleware/auth');
const { balanceProtectionValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getBalanceProtections);
router.post('/', balanceProtectionValidation, createBalanceProtection);
router.post('/check', checkBalanceProtectionEndpoint);
router.put('/:id', updateBalanceProtection);
router.delete('/:id', deleteBalanceProtection);

module.exports = router;
