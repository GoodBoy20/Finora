require('./setup');
const request = require('supertest');
const app = require('./testApp');
const Account = require('../models/Account');
const BalanceProtection = require('../models/BalanceProtection');

// ─── Helpers ──────────────────────────────────────────────────
async function registerAndLogin(emailSuffix = '') {
  const email = `bpuser${emailSuffix}@finora.com`;
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'BP Test User',
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
  const data = { account_name: 'SBI', type: 'bank', balance: 10000, ...overrides };
  const res = await request(app)
    .post('/api/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body;
}

async function createProtectionRule(token, accountId, overrides = {}) {
  const data = {
    accountId,
    minimumBalance: 5000,
    alertMessage: 'Balance too low!',
    blockTransaction: true,
    isActive: true,
    ...overrides,
  };
  const res = await request(app)
    .post('/api/balance-protection')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body;
}

async function createTransaction(token, data) {
  return request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

// ══════════════════════════════════════════════════════════════
//  Balance Protection — Block mode
// ══════════════════════════════════════════════════════════════
describe('Balance Protection — Block mode', () => {
  test('should BLOCK transaction that would bring balance below minimum', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { balance: 10000 });
    await createProtectionRule(token, account._id, {
      minimumBalance: 5000,
      blockTransaction: true,
    });

    // Expense of 6000 → would leave 4000 < 5000
    const res = await createTransaction(token, {
      type: 'expense',
      amount: 6000,
      accountId: account._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();

    // Balance must NOT have changed
    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(10000);
  });

  test('should ALLOW transaction that keeps balance above minimum', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { balance: 10000 });
    await createProtectionRule(token, account._id, {
      minimumBalance: 5000,
      blockTransaction: true,
    });

    // Expense of 4000 → leaves 6000 > 5000
    const res = await createTransaction(token, {
      type: 'expense',
      amount: 4000,
      accountId: account._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(201);

    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(6000);
  });

  test('should ALLOW transaction that lands exactly on minimum', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { balance: 10000 });
    await createProtectionRule(token, account._id, {
      minimumBalance: 5000,
      blockTransaction: true,
    });

    // Expense of 5000 → lands exactly at 5000
    const res = await createTransaction(token, {
      type: 'expense',
      amount: 5000,
      accountId: account._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(201);

    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(5000);
  });
});

// ══════════════════════════════════════════════════════════════
//  Balance Protection — Warn mode
// ══════════════════════════════════════════════════════════════
describe('Balance Protection — Warn mode', () => {
  test('should ALLOW but return warning when balance would go below minimum', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { balance: 10000 });
    await createProtectionRule(token, account._id, {
      minimumBalance: 5000,
      blockTransaction: false, // warn only
      alertMessage: 'Warning: balance dropping below minimum',
    });

    // Expense of 7000 → leaves 3000 < 5000
    const res = await createTransaction(token, {
      type: 'expense',
      amount: 7000,
      accountId: account._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(201); // Transaction IS created
    expect(res.body.balanceWarning).toBeDefined(); // Warning returned

    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(3000);
  });
});

// ══════════════════════════════════════════════════════════════
//  Balance Protection — Inactive rule
// ══════════════════════════════════════════════════════════════
describe('Balance Protection — Inactive rule', () => {
  test('should ignore protection rule when isActive is false', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const account = await createAccount(token, { balance: 10000 });
    await createProtectionRule(token, account._id, {
      minimumBalance: 5000,
      blockTransaction: true,
      isActive: false, // Inactive rule
    });

    // Expense of 8000 → would leave 2000 < 5000 but rule is inactive
    const res = await createTransaction(token, {
      type: 'expense',
      amount: 8000,
      accountId: account._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(201); // Rule is inactive, no block
    const acct = await Account.findById(account._id);
    expect(acct.balance).toBe(2000);
  });
});

// ══════════════════════════════════════════════════════════════
//  Balance Protection — Transfers
// ══════════════════════════════════════════════════════════════
describe('Balance Protection — Transfers', () => {
  test('should apply protection to transfer\'s FROM account', async () => {
    const { token } = await registerAndLogin(Date.now().toString());
    const accountA = await createAccount(token, {
      account_name: 'A',
      balance: 10000,
    });
    const accountB = await createAccount(token, {
      account_name: 'B',
      balance: 5000,
    });
    await createProtectionRule(token, accountA._id, {
      minimumBalance: 5000,
      blockTransaction: true,
    });

    // Transfer 6000 from A → B — would leave A at 4000 < 5000
    const res = await createTransaction(token, {
      type: 'transfer',
      amount: 6000,
      accountId: accountA._id,
      toAccountId: accountB._id,
      date: new Date().toISOString(),
    });

    expect(res.status).toBe(400); // blocked

    const acctA = await Account.findById(accountA._id);
    const acctB = await Account.findById(accountB._id);
    expect(acctA.balance).toBe(10000); // unchanged
    expect(acctB.balance).toBe(5000);  // unchanged
  });
});
