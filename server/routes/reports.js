const router = require('express').Router();
const { getSummary, getMonthly, getCategoryReport, getCashflow } = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/summary', getSummary);
router.get('/monthly', getMonthly);
router.get('/category', getCategoryReport);
router.get('/cashflow', getCashflow);

module.exports = router;
