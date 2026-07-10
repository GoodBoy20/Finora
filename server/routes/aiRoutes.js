const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getHealthScore,
  getBudgetSuggestions,
  getPredictions,
  getAnomalies,
} = require('../controllers/aiController');

router.get('/health-score', auth, getHealthScore);
router.get('/budget-suggestions', auth, getBudgetSuggestions);
router.get('/predictions', auth, getPredictions);
router.get('/anomalies', auth, getAnomalies);

module.exports = router;
