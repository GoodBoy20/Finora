require('./setup');
const request = require('supertest');
const app = require('./testApp');
const Category = require('../models/Category');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// ─── Helpers ──────────────────────────────────────────────────
async function registerAndLogin(emailSuffix = '') {
  const email = `exportuser${emailSuffix}@finora.com`;
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Export Test User',
    email,
    password: 'TestPass123!',
  });
  const securityKey = regRes.body.securityKey;

  const loginRes = await request(app).post('/api/auth/login').send({
    email,
    password: 'TestPass123!',
    securityKey,
  });

  return { token: loginRes.body.token };
}

async function createAccount(token, overrides = {}) {
  const data = { account_name: 'SBI', type: 'bank', balance: 50000, ...overrides };
  const res = await request(app)
    .post('/api/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body;
}

async function seedCategory(name, type = 'expense') {
  return Category.create({
    name,
    category_type: type,
    icon: 'Tag',
    color: '#EF4444',
    isDefault: true,
  });
}

async function createTransaction(token, data) {
  return request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || '').trim();
    });
    return obj;
  });
  return { headers, rows, raw: lines };
}

// ══════════════════════════════════════════════════════════════
//  CSV Export — Format
// ══════════════════════════════════════════════════════════════
describe('CSV Export — Format', () => {
  test('exported CSV should have correct headers', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const category = await seedCategory('Salary', 'income');

    await createTransaction(token, {
      type: 'income',
      amount: 1000,
      accountId: account._id,
      categoryId: category._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { headers } = parseCSV(res.text);
    expect(headers.map((h) => h.trim())).toEqual([
      'date', 'amount', 'type', 'category', 'description', 'account', 'toAccount',
    ]);
  });

  test('income row should have empty toAccount column', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const category = await seedCategory('Salary-' + Date.now(), 'income');

    await createTransaction(token, {
      type: 'income',
      amount: 5000,
      accountId: account._id,
      categoryId: category._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const incomeRow = rows.find((r) => r.type === 'income');
    expect(incomeRow).toBeDefined();
    expect(incomeRow.toAccount).toBe('');
  });

  test('transfer row should have both account names', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const sbi = await createAccount(token, { account_name: 'SBI', balance: 50000 });
    const hdfc = await createAccount(token, { account_name: 'HDFC', balance: 30000 });

    await createTransaction(token, {
      type: 'transfer',
      amount: 5000,
      accountId: sbi._id,
      toAccountId: hdfc._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    const transferRow = rows.find((r) => r.type === 'transfer');
    expect(transferRow).toBeDefined();
    expect(transferRow.account).toBe('SBI');
    expect(transferRow.toAccount).toBe('HDFC');
  });

  test('expense row should have empty toAccount', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const category = await seedCategory('Food-' + Date.now(), 'expense');

    await createTransaction(token, {
      type: 'expense',
      amount: 1500,
      accountId: account._id,
      categoryId: category._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    const expenseRow = rows.find((r) => r.type === 'expense');
    expect(expenseRow).toBeDefined();
    expect(expenseRow.toAccount).toBe('');
  });

  test('amount should have no currency symbol', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const category = await seedCategory('Income-' + Date.now(), 'income');

    await createTransaction(token, {
      type: 'income',
      amount: 1500,
      accountId: account._id,
      categoryId: category._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    expect(rows[0].amount).toBe('1500.00');
    expect(rows[0].amount).not.toContain('₹');
  });

  test('date should be in YYYY-MM-DD format', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const category = await seedCategory('DateCat-' + Date.now(), 'income');

    await createTransaction(token, {
      type: 'income',
      amount: 1000,
      accountId: account._id,
      categoryId: category._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    expect(rows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('type should be lowercase in export', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token);
    const account2 = await createAccount(token, { account_name: 'HDFC', balance: 30000 });
    const incomeCat = await seedCategory('TypeIncome-' + Date.now(), 'income');
    const expenseCat = await seedCategory('TypeExpense-' + Date.now(), 'expense');

    await createTransaction(token, {
      type: 'income',
      amount: 1000,
      accountId: account._id,
      categoryId: incomeCat._id,
      date: '2026-03-15T00:00:00.000Z',
    });
    await createTransaction(token, {
      type: 'expense',
      amount: 500,
      accountId: account._id,
      categoryId: expenseCat._id,
      date: '2026-03-15T00:00:00.000Z',
    });
    await createTransaction(token, {
      type: 'transfer',
      amount: 200,
      accountId: account._id,
      toAccountId: account2._id,
      date: '2026-03-15T00:00:00.000Z',
    });

    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const { rows } = parseCSV(res.text);
    const types = rows.map((r) => r.type);
    expect(types).toContain('income');
    expect(types).toContain('expense');
    expect(types).toContain('transfer');
    // None should be uppercase
    types.forEach((t) => {
      expect(t).toBe(t.toLowerCase());
    });
  });

  test('exported CSV should be re-importable with zero skipped rows', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { account_name: 'SBI', balance: 100000 });
    const account2 = await createAccount(token, { account_name: 'HDFC', balance: 50000 });
    const incomeCat = await seedCategory('RTSalary-' + Date.now(), 'income');
    const expenseCat = await seedCategory('RTFood-' + Date.now(), 'expense');

    // Create 5 transactions (mix of types)
    await createTransaction(token, {
      type: 'income', amount: 5000, accountId: account._id,
      categoryId: incomeCat._id, date: '2026-03-01T00:00:00.000Z',
      description: 'Salary',
    });
    await createTransaction(token, {
      type: 'expense', amount: 1500, accountId: account._id,
      categoryId: expenseCat._id, date: '2026-03-02T00:00:00.000Z',
      description: 'Groceries',
    });
    await createTransaction(token, {
      type: 'income', amount: 3000, accountId: account._id,
      categoryId: incomeCat._id, date: '2026-03-03T00:00:00.000Z',
      description: 'Freelance',
    });
    await createTransaction(token, {
      type: 'expense', amount: 800, accountId: account._id,
      categoryId: expenseCat._id, date: '2026-03-04T00:00:00.000Z',
      description: 'Transport',
    });
    await createTransaction(token, {
      type: 'transfer', amount: 2000, accountId: account._id,
      toAccountId: account2._id, date: '2026-03-05T00:00:00.000Z',
      description: 'Transfer to HDFC',
    });

    // Export to CSV
    const exportRes = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${token}`);

    const csvString = exportRes.text;
    const { rows } = parseCSV(csvString);
    expect(rows.length).toBe(5);

    // Clear all transactions
    await Transaction.deleteMany({});

    // Reset balances to original values for clean re-import
    await Account.findByIdAndUpdate(account._id, { balance: 100000 });
    await Account.findByIdAndUpdate(account2._id, { balance: 50000 });

    // Re-import the exported CSV
    const importRes = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvString), 'reimport.csv');

    expect(importRes.body.importedCount).toBe(5);
    expect(importRes.body.skippedCount).toBe(0);
  });
});
