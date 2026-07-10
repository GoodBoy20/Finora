const router = require('express').Router();
const { getAccounts, createAccount, updateAccount, deleteAccount } = require('../controllers/accountController');
const auth = require('../middleware/auth');
const { accountValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getAccounts);
router.post('/', accountValidation, createAccount);
router.put('/:id', accountValidation, updateAccount);
router.delete('/:id', deleteAccount);

module.exports = router;
