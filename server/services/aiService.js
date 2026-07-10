const { GoogleGenerativeAI } = require('@google/generative-ai');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Account = require('../models/Account');
const RecurringTransaction = require('../models/RecurringTransaction');

// ─── Shared data fetcher ────────────────────────────────────────────

async function getUserFinancialData(userId) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Last 1 month transactions
  const recentTransactions = await Transaction.find({
    userId,
    date: { $gte: oneMonthAgo },
  })
    .populate('categoryId', 'name category_type')
    .populate('accountId', 'account_name type')
    .lean();

  // Last 3 months transactions (for predictions + anomalies)
  const historicTransactions = await Transaction.find({
    userId,
    date: { $gte: threeMonthsAgo },
  })
    .populate('categoryId', 'name category_type')
    .populate('accountId', 'account_name type')
    .lean();

  const budgets = await Budget.find({ userId })
    .populate('categoryId', 'name')
    .lean();

  const accounts = await Account.find({ userId }).lean();

  const recurring = await RecurringTransaction.find({
    userId,
    isActive: true,
  })
    .populate('categoryId', 'name')
    .lean();

  // ─── Compute summaries ──────────────────────────────────────────

  // Recent month stats
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  recentTransactions.forEach((t) => {
    if (t.type === 'transfer') return;
    if (t.type === 'income') totalIncome += t.amount;
    if (t.type === 'expense') {
      totalExpenses += t.amount;
      const cat = t.categoryId?.name || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    }
  });

  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : 0;

  // Monthly breakdown for last 3 months
  const monthlyBreakdown = {};
  historicTransactions.forEach((t) => {
    if (t.type === 'transfer') return;
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyBreakdown[month]) {
      monthlyBreakdown[month] = { income: 0, expenses: 0, byCategory: {} };
    }
    if (t.type === 'income') {
      monthlyBreakdown[month].income += t.amount;
    }
    if (t.type === 'expense') {
      monthlyBreakdown[month].expenses += t.amount;
      const cat = t.categoryId?.name || 'Uncategorized';
      monthlyBreakdown[month].byCategory[cat] =
        (monthlyBreakdown[month].byCategory[cat] || 0) + t.amount;
    }
  });

  // Budget utilization
  const budgetSummary = budgets.map((b) => ({
    category: b.categoryId?.name || 'Unknown',
    limit: b.limitAmount,
    spent: b.spentAmount,
    period: b.period,
    utilizationPercent:
      b.limitAmount > 0
        ? Math.round((b.spentAmount / b.limitAmount) * 100)
        : 0,
    isOverBudget: b.spentAmount > b.limitAmount,
  }));

  // Account summary
  const accountSummary = accounts.map((a) => ({
    name: a.account_name,
    type: a.type,
    balance: a.balance,
  }));

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const monthlyRecurringTotal = recurring.reduce((sum, r) => {
    if (r.type === 'expense') return sum + r.amount;
    return sum;
  }, 0);

  // Top spending categories
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  return {
    totalIncome,
    totalExpenses,
    savingsRate,
    categoryTotals,
    topCategories,
    budgetSummary,
    accountSummary,
    totalBalance,
    monthlyRecurringTotal,
    recurringCount: recurring.length,
    monthlyBreakdown,
    transactionCount: recentTransactions.length,
  };
}

// ─── Helper: call Gemini and parse JSON ─────────────────────────────

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent(prompt);
  const raw = result.response
    .text()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(raw);
}

// ─── Feature 1: Financial Health Score ──────────────────────────────

async function generateHealthScore(userId) {
  const data = await getUserFinancialData(userId);
  if (data.transactionCount < 5) {
    return { insufficientData: true };
  }

  const prompt = `
You are a personal financial advisor. Based on the user's financial 
data below, generate a financial health score and breakdown.

## DATA
- Total Income this month: ₹${data.totalIncome.toFixed(2)}
- Total Expenses this month: ₹${data.totalExpenses.toFixed(2)}
- Savings Rate: ${data.savingsRate}%
- Total Balance: ₹${data.totalBalance.toFixed(2)}
- Monthly Recurring Expenses: ₹${data.monthlyRecurringTotal.toFixed(2)}
- Budget Utilization: ${JSON.stringify(data.budgetSummary)}
- Spending by Category: ${JSON.stringify(data.categoryTotals)}

## TASK
Respond ONLY with raw JSON, no markdown, no preamble:

{
  "score": number between 0 and 100,
  "grade": "A" | "B" | "C" | "D" | "F",
  "label": "Excellent" | "Good" | "Fair" | "Needs Work" | "Critical",
  "breakdown": [
    {
      "pillar": "Savings Rate" | "Budget Adherence" | "Expense Control" | "Balance Health" | "Recurring Management",
      "score": number between 0 and 20,
      "maxScore": 20,
      "comment": "one sentence specific to this user's data"
    }
  ],
  "summary": "2-3 sentence overall assessment referencing actual numbers from the data"
}

Scoring guide:
- Savings Rate (0-20): 20 if savingsRate >= 30%, 15 if >= 20%, 10 if >= 10%, 5 if >= 0%, 0 if negative
- Budget Adherence (0-20): based on how many budgets are under limit vs over
- Expense Control (0-20): based on expense to income ratio
- Balance Health (0-20): based on whether total balance covers at least 3 months of recurring expenses
- Recurring Management (0-20): based on recurring expenses as % of total income

Be specific — reference actual ₹ numbers in comments.
  `;

  const parsed = await callGemini(prompt);

  return {
    data: parsed,
    generatedAt: new Date(),
    insufficientData: false,
  };
}

// ─── Feature 2: Smart Budget & Expense Suggestions ──────────────────

async function generateBudgetSuggestions(userId) {
  const data = await getUserFinancialData(userId);
  if (data.transactionCount < 5) {
    return { insufficientData: true };
  }

  const prompt = `
You are a personal financial advisor. Analyze the user's spending 
and budgets and provide specific actionable suggestions.

## DATA
- Spending by Category this month: ${JSON.stringify(data.categoryTotals)}
- Budget Utilization: ${JSON.stringify(data.budgetSummary)}
- Top Spending Categories: ${JSON.stringify(data.topCategories)}
- Total Income: ₹${data.totalIncome.toFixed(2)}
- Total Expenses: ₹${data.totalExpenses.toFixed(2)}
- Savings Rate: ${data.savingsRate}%
- Monthly Breakdown (3 months): ${JSON.stringify(data.monthlyBreakdown)}

## TASK
Respond ONLY with raw JSON, no markdown, no preamble:

{
  "suggestions": [
    {
      "type": "warning" | "suggestion" | "positive",
      "priority": "high" | "medium" | "low",
      "category": "category name or 'General'",
      "title": "under 8 words",
      "detail": "2-3 sentences, specific to the user's numbers",
      "potentialSaving": number or null
    }
  ],
  "budgetRecommendations": [
    {
      "category": "category name",
      "currentLimit": number or null,
      "recommendedLimit": number,
      "reason": "one specific sentence"
    }
  ],
  "quickWins": [
    "one sentence actionable tip the user can do today"
  ],
  "savingsTip": "one specific tip referencing their actual data"
}

Rules:
- 3 to 6 suggestions
- 1 to 3 budget recommendations (only where clearly needed)
- 2 to 4 quick wins
- potentialSaving: estimated ₹ amount they could save, or null if not quantifiable
- Reference actual ₹ numbers throughout
- If expenses > income, make that the first high priority warning
  `;

  const parsed = await callGemini(prompt);

  return {
    data: parsed,
    generatedAt: new Date(),
    insufficientData: false,
  };
}

// ─── Feature 3: Spending Predictions for Next Month ─────────────────

async function generatePredictions(userId) {
  const data = await getUserFinancialData(userId);
  if (data.transactionCount < 5) {
    return { insufficientData: true };
  }

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthName = nextMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const prompt = `
You are a personal financial advisor. Based on 3 months of spending 
history, predict the user's finances for next month.

## DATA
- Monthly breakdown (last 3 months): ${JSON.stringify(data.monthlyBreakdown)}
- Current month spending by category: ${JSON.stringify(data.categoryTotals)}
- Active recurring expenses per month: ₹${data.monthlyRecurringTotal.toFixed(2)}
- Number of recurring transactions: ${data.recurringCount}
- Budget limits: ${JSON.stringify(data.budgetSummary)}

## TASK
Predict finances for ${nextMonthName}.
Respond ONLY with raw JSON, no markdown, no preamble:

{
  "predictedIncome": number,
  "predictedExpenses": number,
  "predictedSavings": number,
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "one sentence explaining confidence level",
  "categoryPredictions": [
    {
      "category": "category name",
      "predictedAmount": number,
      "trend": "increasing" | "stable" | "decreasing",
      "trendPercent": number,
      "note": "one sentence"
    }
  ],
  "budgetRisks": [
    {
      "category": "category name",
      "budgetLimit": number,
      "predictedSpend": number,
      "riskLevel": "high" | "medium" | "low",
      "message": "one sentence warning"
    }
  ],
  "outlook": "positive" | "neutral" | "concerning",
  "outlookMessage": "2 sentence summary of next month's outlook"
}

Rules:
- categoryPredictions: only top 5 spending categories
- budgetRisks: only categories predicted to exceed or approach their budget limit
- Base predictions on average of available monthly data
- trendPercent: % change predicted vs current month (positive = increase, negative = decrease)
- If only 1 month of data exists, set confidence to "low"
- All amounts in ₹
  `;

  const parsed = await callGemini(prompt);

  return {
    data: parsed,
    generatedAt: new Date(),
    insufficientData: false,
  };
}

// ─── Feature 4: Anomaly & Unusual Spending Alerts ───────────────────

async function generateAnomalies(userId) {
  const data = await getUserFinancialData(userId);
  if (data.transactionCount < 5) {
    return { insufficientData: true };
  }

  const prompt = `
You are a personal financial advisor. Identify unusual or 
anomalous spending patterns in the user's financial data.

## DATA
- Monthly breakdown (last 3 months): ${JSON.stringify(data.monthlyBreakdown)}
- This month's spending by category: ${JSON.stringify(data.categoryTotals)}
- Budget utilization: ${JSON.stringify(data.budgetSummary)}
- Total income: ₹${data.totalIncome.toFixed(2)}
- Total expenses: ₹${data.totalExpenses.toFixed(2)}

## TASK
Identify anomalies and unusual patterns.
Respond ONLY with raw JSON, no markdown, no preamble:

{
  "anomalies": [
    {
      "severity": "high" | "medium" | "low",
      "category": "category name or 'General'",
      "title": "under 8 words",
      "description": "2 sentences explaining what is unusual and by how much, referencing actual ₹ numbers",
      "type": "spike" | "new_category" | "budget_breach" | "income_drop" | "unusual_pattern"
    }
  ],
  "normalPatterns": [
    "one sentence describing something the user is doing consistently well"
  ],
  "overallAssessment": "normal" | "some_anomalies" | "concerning",
  "assessmentMessage": "1-2 sentence overall assessment"
}

Rules:
- anomalies: 0 to 5 items (empty array if nothing unusual)
- normalPatterns: 1 to 3 items
- A spike means spending in a category is significantly higher than the previous month average
- Only flag genuine anomalies — not every overspend qualifies, only notable ones
- If no anomalies found, return empty array and set overallAssessment to "normal"
  `;

  const parsed = await callGemini(prompt);

  return {
    data: parsed,
    generatedAt: new Date(),
    insufficientData: false,
  };
}

module.exports = {
  generateHealthScore,
  generateBudgetSuggestions,
  generatePredictions,
  generateAnomalies,
};
