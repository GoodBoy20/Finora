const router = require('express').Router();
const multer = require('multer');
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importCSV,
  exportCSV,
} = require('../controllers/transactionController');
const auth = require('../middleware/auth');
const { transactionValidation } = require('../middleware/validate');

const upload = multer({ dest: 'uploads/' });

router.use(auth);

router.get('/export', exportCSV);
router.get('/', getTransactions);
router.post('/', transactionValidation, createTransaction);
router.put('/:id', transactionValidation, updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/import', upload.single('file'), importCSV);

module.exports = router;
