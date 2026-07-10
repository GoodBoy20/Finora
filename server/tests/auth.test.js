require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('./testApp');
const User = require('../models/User');

// ─── Helper ───────────────────────────────────────────────────
async function registerUser(overrides = {}) {
  const userData = {
    name: 'Test User',
    email: 'test@finora.com',
    password: 'TestPass123!',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(userData);
  return { res, userData };
}

async function registerAndLogin(overrides = {}) {
  const { res: regRes, userData } = await registerUser(overrides);
  const securityKey = regRes.body.securityKey;

  const loginRes = await request(app).post('/api/auth/login').send({
    email: userData.email,
    password: userData.password,
    securityKey,
  });

  return { regRes, loginRes, userData, securityKey, token: loginRes.body.token };
}

// ══════════════════════════════════════════════════════════════
//  POST /api/auth/register
// ══════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  test('should register a new user successfully', async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('securityKey');
    // 64 char hex string (32 bytes → hex)
    expect(res.body.securityKey).toMatch(/^[a-f0-9]{64}$/);
    // Must NOT leak sensitive data
    expect(res.body.password).toBeUndefined();
    expect(res.body.securityKeyHash).toBeUndefined();
  });

  test('should NOT return securityKey on second request', async () => {
    const { securityKey, token } = await registerAndLogin();
    expect(securityKey).toBeDefined();

    // GET /api/auth/me — should never expose securityKey
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.securityKey).toBeUndefined();
    expect(meRes.body.securityKeyHash).toBeUndefined();
  });

  test('should reject registration with duplicate email', async () => {
    await registerUser({ email: 'dup@finora.com' });
    const { res } = await registerUser({ email: 'dup@finora.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test('should reject registration with missing fields', async () => {
    // Missing password
    let res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'a@b.com' });
    expect(res.status).toBe(400);

    // Missing email
    res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', password: 'TestPass123!' });
    expect(res.status).toBe(400);

    // Missing name
    res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'TestPass123!' });
    expect(res.status).toBe(400);
  });

  test('should store password as hash not plaintext', async () => {
    await registerUser({ email: 'hash@test.com', password: 'TestPass123!' });
    const user = await User.findOne({ email: 'hash@test.com' });

    expect(user.password).not.toBe('TestPass123!');
    expect(user.password).toMatch(/^\$2[ab]\$/); // bcrypt prefix
  });

  test('should store securityKey as hash not plaintext', async () => {
    const { res } = await registerUser({ email: 'skhash@test.com' });
    const plainKey = res.body.securityKey;
    const user = await User.findOne({ email: 'skhash@test.com' });

    expect(user.securityKeyHash).not.toBe(plainKey);
    expect(user.securityKeyHash).toMatch(/^\$2[ab]\$/); // bcrypt prefix
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/auth/login
// ══════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  test('should login successfully with correct credentials', async () => {
    const { loginRes } = await registerAndLogin();

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    // JWT has 3 dot-separated parts
    expect(loginRes.body.token.split('.')).toHaveLength(3);
  });

  test('should reject login with wrong password', async () => {
    const { securityKey, userData } = await registerAndLogin({ email: 'wrong1@test.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: userData.email,
      password: 'WrongPassword!',
      securityKey,
    });

    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
    // Error must be generic — must NOT say "wrong password"
    expect(res.body.message).not.toMatch(/wrong password/i);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('should reject login with wrong security key', async () => {
    const { userData } = await registerAndLogin({ email: 'wrong2@test.com' });

    // Random 64 char hex string
    const fakeKey = 'a'.repeat(64);
    const res = await request(app).post('/api/auth/login').send({
      email: userData.email,
      password: userData.password,
      securityKey: fakeKey,
    });

    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });

  test('should reject login with missing security key', async () => {
    const { userData } = await registerAndLogin({ email: 'nokey@test.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: userData.email,
      password: userData.password,
      // No securityKey
    });

    expect([400, 401]).toContain(res.status);
  });

  test('should reject login with nonexistent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@nowhere.com',
      password: 'SomePass123!',
      securityKey: 'a'.repeat(64),
    });

    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
//  Auth Middleware
// ══════════════════════════════════════════════════════════════
describe('Auth Middleware', () => {
  test('should reject requests with no token', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  test('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  test('should reject requests with expired token', async () => {
    // Register a real user so the userId is valid in the DB
    const { userData, securityKey } = await registerAndLogin({ email: 'exp@test.com' });
    const user = await User.findOne({ email: userData.email });

    // Create expired token
    const expired = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });

  test('should allow requests with valid token', async () => {
    const { token } = await registerAndLogin({ email: 'valid@test.com' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
