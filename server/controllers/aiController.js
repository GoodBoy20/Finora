const {
  generateHealthScore,
  generateBudgetSuggestions,
  generatePredictions,
  generateAnomalies,
} = require('../services/aiService');

function handleAIError(error, res) {
  console.error('AI error:', error);

  if (error.name === 'SyntaxError') {
    return res.status(500).json({
      message: 'AI returned unexpected response. Try again.',
    });
  }
  if (error.status === 429 || error.code === 429) {
    return res.status(429).json({
      message: 'Too many requests. Please wait and try again.',
    });
  }
  if (error.status === 401 || error.code === 401) {
    return res.status(500).json({
      message: 'AI service authentication failed. Check your API key.',
    });
  }

  res.status(500).json({
    message: 'Failed to generate insights. Please try again.',
  });
}

exports.getHealthScore = async (req, res) => {
  try {
    const result = await generateHealthScore(req.user.id);
    res.json(result);
  } catch (e) {
    handleAIError(e, res);
  }
};

exports.getBudgetSuggestions = async (req, res) => {
  try {
    const result = await generateBudgetSuggestions(req.user.id);
    res.json(result);
  } catch (e) {
    handleAIError(e, res);
  }
};

exports.getPredictions = async (req, res) => {
  try {
    const result = await generatePredictions(req.user.id);
    res.json(result);
  } catch (e) {
    handleAIError(e, res);
  }
};

exports.getAnomalies = async (req, res) => {
  try {
    const result = await generateAnomalies(req.user.id);
    res.json(result);
  } catch (e) {
    handleAIError(e, res);
  }
};
