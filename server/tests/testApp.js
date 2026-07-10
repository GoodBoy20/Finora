/**
 * Testable Express app — mirrors server.js route setup
 * without connecting to real MongoDB or starting a listener.
 * 
 * Tests import this instead of server.js so they can use
 * supertest against the in-memory MongoDB from setup.js.
 */
const express = require('express');
const cors = require('cors');

// Set env vars that the app/middleware expects
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_testing';

const authRoutes = require('../routes/auth');
const accountRoutes = require('../routes/accounts');
const transactionRoutes = require('../routes/transactions');
const categoryRoutes = require('../routes/categories');
const budgetRoutes = require('../routes/budgets');
const recurringRoutes = require('../routes/recurring');
const budgetAlertRoutes = require('../routes/budgetAlertRoutes');
const balanceProtectionRoutes = require('../routes/balanceProtectionRoutes');
const reportRoutes = require('../routes/reports');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes — same as server.js
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budget-alerts', budgetAlertRoutes);
app.use('/api/balance-protection', balanceProtectionRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
