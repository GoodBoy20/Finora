const router = require('express').Router();
const { getRecurring, createRecurring, updateRecurring, deleteRecurring } = require('../controllers/recurringController');
const auth = require('../middleware/auth');
const { recurringValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getRecurring);
router.post('/', recurringValidation, createRecurring);
router.put('/:id', recurringValidation, updateRecurring);
router.delete('/:id', deleteRecurring);

module.exports = router;
