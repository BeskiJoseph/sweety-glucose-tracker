const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const app = require('../../src/app');
const { pool, closePool } = require('../../src/config/db');
const { runMigrations } = require('../../database/migrate');
const { resetRateLimiter } = require('../../src/middleware/rateLimiter.middleware');
const { closeRedis } = require('../../src/config/redis');
const { closeQueue } = require('../../src/jobs/reminder.queue');

let server;
let baseUrl;

const testUser = {
  name: 'Glucose Tester',
  email: `test_${Date.now()}@example.com`,
  password: 'StrongPassword123!'
};

before(async () => {
  // Ensure database tables exist
  await runMigrations();

  // Clean up any stale test user
  await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [testUser.email]);

  // Start HTTP server on random available port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  // Clean up test users
  if (pool) {
    await pool.query('DELETE FROM users WHERE LOWER(email) LIKE $1', ['test_%@example.com']);
    await closePool();
  }
  await closeQueue().catch(() => {});
  await closeRedis().catch(() => {});
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Integration Tests: Authentication Endpoints', () => {
  let authCookie = null;

  it('POST /api/auth/register — should register user, return safe profile, and set secure HTTP-only cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    assert.equal(res.status, 201);
    const data = await res.json();

    assert.equal(data.success, true);
    assert.equal(data.data.user.name, testUser.name);
    assert.equal(data.data.user.email, testUser.email.toLowerCase());
    assert.ok(data.data.user.id);
    assert.ok(data.data.user.createdAt);

    // Verify password hash or token is NEVER exposed in response body
    assert.equal(data.data.user.password, undefined);
    assert.equal(data.data.user.password_hash, undefined);
    assert.equal(data.data.token, undefined);

    // Verify Set-Cookie header sets HTTP-only auth cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Expected Set-Cookie header on successful registration');
    assert.match(setCookie, /token=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\//);

    // Save cookie for subsequent session validation
    authCookie = setCookie.split(';')[0];
  });

  it('Database check — should store bcrypt password hash and NEVER plaintext password', async () => {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
      [testUser.email]
    );

    assert.equal(result.rowCount, 1);
    const dbUser = result.rows[0];

    assert.notEqual(dbUser.password_hash, testUser.password);
    assert.match(dbUser.password_hash, /^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it('POST /api/auth/register — should reject duplicate email with HTTP 409 Conflict', async () => {
    // Attempt registration with same email in uppercase
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Person',
        email: testUser.email.toUpperCase(),
        password: 'AnotherPassword888!'
      })
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /already exists/i);
  });

  it('POST /api/auth/register — should reject missing required fields with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com', password: 'Password123!' })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Name is required/i);
  });

  it('POST /api/auth/register — should reject invalid email format with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'invalid-email-address',
        password: 'Password123!'
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /valid email/i);
  });

  it('POST /api/auth/register — should reject weak password (< 8 chars) with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'valid_user@example.com',
        password: '123'
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /at least 8 characters/i);
  });

  it('POST /api/auth/login — should log in successfully, return safe user, and set HTTP-only cookie', async () => {
    resetRateLimiter();

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email.toUpperCase(), // Test case insensitivity
        password: testUser.password
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.success, true);
    assert.equal(data.data.user.email, testUser.email.toLowerCase());
    assert.equal(data.data.user.password, undefined);
    assert.equal(data.data.user.password_hash, undefined);
    assert.equal(data.data.token, undefined);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.match(setCookie, /token=/);
    assert.match(setCookie, /HttpOnly/i);

    authCookie = setCookie.split(';')[0];
  });

  it('POST /api/auth/login — should return HTTP 401 with generic error message for incorrect password', async () => {
    resetRateLimiter();

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword999'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.message, 'Invalid email or password');
  });

  it('POST /api/auth/login — should return HTTP 401 with generic error message for unknown email', async () => {
    resetRateLimiter();

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_user_9999@example.com',
        password: 'SomePassword123'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.message, 'Invalid email or password');
  });

  it('GET /api/auth/me — should return authenticated user profile when valid cookie is provided', async () => {
    assert.ok(authCookie, 'Expected valid authCookie from previous login');

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: authCookie
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.user.email, testUser.email.toLowerCase());
    assert.equal(data.data.user.name, testUser.name);
    assert.equal(data.data.user.password, undefined);
    assert.equal(data.data.user.password_hash, undefined);
  });

  it('GET /api/auth/me — should return HTTP 401 when unauthenticated (no cookie/token)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Authentication required/i);
  });

  it('GET /api/auth/me — should return HTTP 401 when token is invalid or tampered', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: 'token=invalid.tampered.token'
      }
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Invalid authentication token/i);
  });

  it('POST /api/auth/logout — should clear auth cookie and return success', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: authCookie
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.message, 'Logged out successfully');

    // Verify cookie clearing in Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Expected Set-Cookie header to clear token');
    assert.match(setCookie, /token=;/);
    assert.match(setCookie, /HttpOnly/i);
  });

  it('Security: SQL Injection Resistance — should resist injection attempts in login', async () => {
    resetRateLimiter();

    const sqlInjectionPayload = {
      email: "' OR 1=1 --",
      password: 'password123'
    };

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sqlInjectionPayload)
    });

    // Should fail cleanly via email validation format (400) or 401, never 500 or SQL leakage
    assert.ok([400, 401].includes(res.status));
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(!data.message.includes('syntax error'));
    assert.ok(!data.message.includes('SELECT'));
  });

  it('Security: Brute-Force Rate Limiting — should return HTTP 429 when max login attempts exceeded', async () => {
    resetRateLimiter();

    // Make 10 requests (allowed max attempts)
    for (let i = 0; i < 10; i++) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
      });
    }

    // 11th request must be rejected with 429
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
    });

    assert.equal(res.status, 429);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Too many login attempts/i);
    assert.ok(res.headers.get('retry-after'));

    resetRateLimiter();
  });
});
