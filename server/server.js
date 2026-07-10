const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const recurringRoutes = require('./routes/recurring');
const budgetAlertRoutes = require('./routes/budgetAlertRoutes');
const balanceProtectionRoutes = require('./routes/balanceProtectionRoutes');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/aiRoutes');
const { seedDefaultCategories } = require('./utils/seeder');
const { processRecurringTransactions } = require('./utils/recurringProcessor');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budget-alerts', budgetAlertRoutes);
app.use('/api/balance-protection', balanceProtectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');

    // Seed default categories on first run
    await seedDefaultCategories();

    // Cron job: process recurring transactions daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('Running recurring transactions cron job...');
      try {
        await processRecurringTransactions();
        console.log('Recurring transactions processed successfully');
      } catch (err) {
        console.error('Error processing recurring transactions:', err);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
