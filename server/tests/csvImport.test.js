require('./setup');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('./testApp');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');

// ─── Helpers ──────────────────────────────────────────────────
async function registerAndLogin(emailSuffix = '') {
  const email = `csvuser${emailSuffix}@finora.com`;
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'CSV Test User',
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

function buildCSV(rows) {
  const header = 'date,amount,type,category,description,account,toAccount';
  const lines = rows.map((r) =>
    [
      r.date || '',
      r.amount || '',
      r.type || '',
      r.category || '',
      r.description || '',
      r.account || '',
      r.toAccount || '',
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

function writeCSVToTempFile(csvContent) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, `test_import_${Date.now()}.csv`);
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}

// ══════════════════════════════════════════════════════════════
//  CSV Import — Valid data
// ══════════════════════════════════════════════════════════════
describe('CSV Import — Valid data', () => {
  test('should import income and expense rows and update balances correctly', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { account_name: 'SBI', balance: 50000 });
    await seedCategory('Salary', 'income');
    await seedCategory('Food', 'expense');

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '5000', type: 'income', category: 'Salary', description: 'March salary', account: 'SBI' },
      { date: '2026-03-02', amount: '1500', type: 'expense', category: 'Food', description: 'Groceries', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.importedCount).toBe(2);
    expect(res.body.skippedCount).toBe(0);

    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(53500); // 50000 + 5000 - 1500
  });

  test('should import transfer row and update both account balances', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const sbi = await createAccount(token, { account_name: 'SBI', balance: 50000 });
    const hdfc = await createAccount(token, { account_name: 'HDFC', balance: 30000 });

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '10000', type: 'transfer', description: 'Transfer', account: 'SBI', toAccount: 'HDFC' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.importedCount).toBe(1);

    const sbiAcct = await Account.findById(sbi._id);
    const hdfcAcct = await Account.findById(hdfc._id);
    expect(sbiAcct.balance).toBe(40000);
    expect(hdfcAcct.balance).toBe(40000);
  });

  test('should handle multiple date formats', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });
    await seedCategory('Salary', 'income');

    const csvContent = buildCSV([
      // YYYY-MM-DD
      { date: '2026-03-01', amount: '1000', type: 'income', category: 'Salary', description: 'D1', account: 'SBI' },
      // DD/MM/YYYY
      { date: '01/03/2026', amount: '1000', type: 'income', category: 'Salary', description: 'D2', account: 'SBI' },
      // MM-DD-YYYY (the app's third format)
      { date: '03-01-2026', amount: '1000', type: 'income', category: 'Salary', description: 'D3', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.importedCount).toBe(3);
    expect(res.body.skippedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
//  CSV Import — Invalid data handling
// ══════════════════════════════════════════════════════════════
describe('CSV Import — Invalid data handling', () => {
  test('should skip row with missing account and continue importing valid rows', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });
    await seedCategory('Salary', 'income');
    await seedCategory('Food', 'expense');

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '5000', type: 'income', category: 'Salary', description: 'Valid 1', account: 'SBI' },
      { date: '2026-03-02', amount: '2000', type: 'income', category: 'Salary', description: 'Missing account', account: '' },
      { date: '2026-03-03', amount: '1500', type: 'expense', category: 'Food', description: 'Valid 2', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.importedCount).toBe(2);
    expect(res.body.skippedCount).toBe(1);
    expect(res.body.skipped[0].row).toBe(3); // Row 3 in CSV (header=1, data starts at 2)
    expect(res.body.skipped[0].reason).toMatch(/account/i);
  });

  test('should skip row with non-existent account', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '5000', type: 'income', description: 'Ghost', account: 'NONEXISTENT BANK' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.skippedCount).toBe(1);
    expect(res.body.skipped[0].reason).toMatch(/NONEXISTENT BANK/i);
  });

  test('should skip transfer row with missing toAccount', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '5000', type: 'transfer', description: 'Transfer', account: 'SBI', toAccount: '' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.skippedCount).toBe(1);
  });

  test('should skip row with invalid amount', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: 'abc', type: 'income', description: 'bad1', account: 'SBI' },
      { date: '2026-03-02', amount: '-500', type: 'income', description: 'bad2', account: 'SBI' },
      { date: '2026-03-03', amount: '0', type: 'income', description: 'bad3', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.skippedCount).toBe(3);
  });

  test('should skip row with invalid type', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    await createAccount(token, { account_name: 'SBI', balance: 50000 });

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '1000', type: 'loan', description: 'bad type', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.body.skippedCount).toBe(1);
  });

  test('should NOT partially update balances if insert fails', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { account_name: 'SBI', balance: 50000 });

    // Mock Transaction.insertMany to throw
    const originalInsertMany = Transaction.insertMany;
    Transaction.insertMany = jest.fn().mockRejectedValueOnce(new Error('DB insert failed'));

    const csvContent = buildCSV([
      { date: '2026-03-01', amount: '5000', type: 'income', description: 'test', account: 'SBI' },
      { date: '2026-03-02', amount: '3000', type: 'income', description: 'test2', account: 'SBI' },
    ]);

    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'test.csv');

    expect(res.status).toBe(500);

    // Account balance should be unchanged
    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(50000);

    // No transactions in DB
    const txCount = await Transaction.countDocuments({});
    expect(txCount).toBe(0);

    // Restore original
    Transaction.insertMany = originalInsertMany;
  });
});
