const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, comparePassword } = require('../../src/utils/password.util');
const { getSslConfig } = require('../../src/config/db');
const { getPreviousMonthRange } = require('../../src/utils/date.util');
const {
  signToken,
  verifyToken,
  getAuthCookieOptions,
  getClearCookieOptions
} = require('../../src/utils/token.util');
const {
  validateRegister,
  validateLogin
} = require('../../src/validators/auth.validator');
const {
  authRateLimiter,
  resetRateLimiter,
  pruneExpiredEntries,
  getRateLimiterStats,
  WINDOW_MS,
  MAX_ATTEMPTS,
  MAX_TRACKED_CLIENTS
} = require('../../src/middleware/rateLimiter.middleware');

describe('Unit Tests: Password Utility', () => {
  it('should hash a password with bcrypt and produce a valid non-plaintext hash', async () => {
    const plaintext = 'SuperSecret123!';
    const hash = await hashPassword(plaintext);

    assert.notEqual(hash, plaintext);
    assert.match(hash, /^\$2[aby]\$\d{2}\$.{53}$/);

    const isMatch = await comparePassword(plaintext, hash);
    assert.equal(isMatch, true);
  });

  it('should reject an incorrect password when comparing against hash', async () => {
    const plaintext = 'CorrectPassword88';
    const hash = await hashPassword(plaintext);

    const isMatch = await comparePassword('WrongPassword99', hash);
    assert.equal(isMatch, false);
  });

  it('should handle empty or null inputs safely without throwing or false positives', async () => {
    const isMatchNull = await comparePassword('', null);
    assert.equal(isMatchNull, false);

    await assert.rejects(async () => {
      await hashPassword('');
    }, /Password must be a non-empty string/);
  });
});

describe('Unit Tests: Database SSL Configuration', () => {
  it('should disable SSL in development/testing environments', () => {
    const ssl = getSslConfig(false);
    assert.equal(ssl, false);
  });

  it('should enforce SSL certificate verification in production (rejectUnauthorized: true)', () => {
    const ssl = getSslConfig(true, null);
    assert.equal(typeof ssl, 'object');
    assert.equal(ssl.rejectUnauthorized, true);
    assert.equal(ssl.ca, undefined);
  });

  it('should attach custom CA certificate when provided in production', () => {
    const fakeCa = '-----BEGIN CERTIFICATE-----\nFAKE_CERT\n-----END CERTIFICATE-----';
    const ssl = getSslConfig(true, fakeCa);
    assert.equal(typeof ssl, 'object');
    assert.equal(ssl.rejectUnauthorized, true);
    assert.equal(ssl.ca, fakeCa);
  });

  it('should prevent DATABASE_SSL=false from disabling SSL in production', () => {
    const originalEnv = process.env.DATABASE_SSL;
    process.env.DATABASE_SSL = 'false';
    try {
      const ssl = getSslConfig(true, null);
      assert.equal(typeof ssl, 'object');
      assert.equal(ssl.rejectUnauthorized, true);
    } finally {
      if (originalEnv !== undefined) {
        process.env.DATABASE_SSL = originalEnv;
      } else {
        delete process.env.DATABASE_SSL;
      }
    }
  });

  it('should allow enabling SSL in non-production when DATABASE_SSL=true', () => {
    const originalEnv = process.env.DATABASE_SSL;
    process.env.DATABASE_SSL = 'true';
    try {
      const ssl = getSslConfig(false, null);
      assert.equal(typeof ssl, 'object');
      assert.equal(ssl.rejectUnauthorized, true);
    } finally {
      if (originalEnv !== undefined) {
        process.env.DATABASE_SSL = originalEnv;
      } else {
        delete process.env.DATABASE_SSL;
      }
    }
  });
});

describe('Unit Tests: Token Utility', () => {
  it('should sign and verify JWT tokens containing user payload', () => {
    const payload = { userId: '123e4567-e89b-12d3-a456-426614174000' };
    const token = signToken(payload);

    assert.equal(typeof token, 'string');
    assert.ok(token.length > 20);

    const decoded = verifyToken(token);
    assert.equal(decoded.userId, payload.userId);
    assert.ok(decoded.exp);
    assert.ok(decoded.iat);
  });

  it('should reject invalid or tampered tokens', () => {
    assert.throws(() => {
      verifyToken('tampered.jwt.token');
    });
  });

  it('should produce secure cookie options matching production and development requirements', () => {
    const options = getAuthCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, '/');
    assert.ok(options.maxAge > 0);
    assert.equal(['lax', 'strict'].includes(options.sameSite), true);

    const clearOptions = getClearCookieOptions();
    assert.equal(clearOptions.httpOnly, true);
    assert.equal(clearOptions.path, '/');

    // Security flags between auth and clear cookie MUST match for reliable browser deletion
    assert.equal(clearOptions.httpOnly, options.httpOnly);
    assert.equal(clearOptions.secure, options.secure);
    assert.equal(clearOptions.sameSite, options.sameSite);
    assert.equal(clearOptions.path, options.path);
  });
});

describe('Unit Tests: Fixed-Window Rate Limiter Middleware', () => {
  it('should allow requests below limit and block when max attempts reached', () => {
    resetRateLimiter();
    const mockReq = { ip: '192.168.1.100' };
    const mockRes = {
      setHeader: (name, val) => {
        mockRes.headers = mockRes.headers || {};
        mockRes.headers[name] = val;
      }
    };

    let nextCalled = 0;
    let nextError = null;
    const next = (err) => {
      if (err) nextError = err;
      else nextCalled++;
    };

    // 10 requests allowed
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      authRateLimiter(mockReq, mockRes, next);
    }
    assert.equal(nextCalled, MAX_ATTEMPTS);
    assert.equal(nextError, null);

    // 11th request blocked
    authRateLimiter(mockReq, mockRes, next);
    assert.ok(nextError);
    assert.equal(nextError.statusCode, 429);
    assert.ok(mockRes.headers['Retry-After']);

    resetRateLimiter();
  });

  it('should track different client IPs independently', () => {
    resetRateLimiter();
    const req1 = { ip: '10.0.0.1' };
    const req2 = { ip: '10.0.0.2' };
    const mockRes = { setHeader: () => {} };

    let calls1 = 0;
    let calls2 = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      authRateLimiter(req1, mockRes, () => calls1++);
    }
    authRateLimiter(req2, mockRes, () => calls2++);

    assert.equal(calls1, MAX_ATTEMPTS);
    assert.equal(calls2, 1);

    resetRateLimiter();
  });

  it('should enforce strict memory bound and never exceed MAX_TRACKED_CLIENTS when receiving requests from 10,001 distinct IPs', () => {
    resetRateLimiter();
    const mockRes = { setHeader: () => {} };
    const noop = () => {};

    // Send requests from 10,001 distinct IP addresses (0 to 10,000 inclusive)
    for (let i = 0; i <= MAX_TRACKED_CLIENTS; i++) {
      const ip = `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
      authRateLimiter({ ip }, mockRes, noop);
      assert.ok(
        getRateLimiterStats().size <= MAX_TRACKED_CLIENTS,
        `Expected size <= ${MAX_TRACKED_CLIENTS}, got ${getRateLimiterStats().size}`
      );
    }

    const finalStats = getRateLimiterStats();
    assert.equal(finalStats.size, MAX_TRACKED_CLIENTS);
    resetRateLimiter();
  });

  it('should create a rate-limit record and remove it when pruneExpiredEntries() is called beyond its reset time', () => {
    resetRateLimiter();
    const mockRes = { setHeader: () => {} };
    const noop = () => {};

    // 1. Create a rate-limit record
    authRateLimiter({ ip: '192.168.10.50' }, mockRes, noop);
    assert.equal(getRateLimiterStats().size, 1);

    // 2. Prune with current time (not expired yet) -> still present
    pruneExpiredEntries(Date.now());
    assert.equal(getRateLimiterStats().size, 1);

    // 3. Call pruneExpiredEntries() with a timestamp beyond its reset time -> record removed
    pruneExpiredEntries(Date.now() + WINDOW_MS + 1000);
    assert.equal(getRateLimiterStats().size, 0);

    resetRateLimiter();
  });
});

describe('Unit Tests: Auth Validator', () => {
  it('should normalize and validate valid registration payload', () => {
    const input = {
      name: '  Jane Doe  ',
      email: '  Jane.Doe@EXAMPLE.com  ',
      password: 'SecurePassword123'
    };

    const sanitized = validateRegister(input);
    assert.equal(sanitized.name, 'Jane Doe');
    assert.equal(sanitized.email, 'jane.doe@example.com'); // trimmed and lowercased
    assert.equal(sanitized.password, 'SecurePassword123');
  });

  it('should reject registration when name is missing or too short', () => {
    assert.throws(() => {
      validateRegister({ email: 'test@example.com', password: 'password123' });
    }, /Name is required/);

    assert.throws(() => {
      validateRegister({ name: 'A', email: 'test@example.com', password: 'password123' });
    }, /Name must be between/);
  });

  it('should reject registration with invalid email formats', () => {
    const invalidEmails = ['invalid-email', 'missing@domain', '@no-local.com', 'spaces in@email.com'];
    for (const email of invalidEmails) {
      assert.throws(() => {
        validateRegister({ name: 'Valid Name', email, password: 'password123' });
      }, /valid email address/);
    }
  });

  it('should reject registration with passwords shorter than 8 characters', () => {
    assert.throws(() => {
      validateRegister({ name: 'Valid Name', email: 'test@example.com', password: 'short' });
    }, /Password must be at least 8 characters/);
  });

  it('should reject registration with passwords exceeding 128 characters', () => {
    assert.throws(() => {
      validateRegister({
        name: 'Valid Name',
        email: 'test@example.com',
        password: 'A'.repeat(129)
      });
    }, /Password must not exceed 128 characters/);
  });

  it('should validate and normalize login payload', () => {
    const input = {
      email: '  USER@DOMAIN.COM ',
      password: 'password123'
    };
    const sanitized = validateLogin(input);
    assert.equal(sanitized.email, 'user@domain.com');
    assert.equal(sanitized.password, 'password123');
  });

  it('should reject login with missing fields', () => {
    assert.throws(() => {
      validateLogin({ password: '123' });
    }, /Email is required/);

    assert.throws(() => {
      validateLogin({ email: 'test@example.com' });
    }, /Password is required/);
  });
});

describe('Unit Tests: Previous Month Date Range Calculator', () => {
  it('should calculate December range of previous year when given January (year rollover)', () => {
    const range = getPreviousMonthRange(2026, 1);
    assert.deepEqual(range, {
      month: '2025-12',
      startDate: '2025-12-01',
      endDate: '2025-12-31'
    });
  });

  it('should calculate February leap-year range with 29 days when given March in a leap year', () => {
    const range = getPreviousMonthRange(2024, 3);
    assert.deepEqual(range, {
      month: '2024-02',
      startDate: '2024-02-01',
      endDate: '2024-02-29'
    });
  });

  it('should calculate February non-leap-year range with 28 days when given March in a standard year', () => {
    const range = getPreviousMonthRange(2026, 3);
    assert.deepEqual(range, {
      month: '2026-02',
      startDate: '2026-02-01',
      endDate: '2026-02-28'
    });
  });

  it('should calculate previous calendar month range in mid-year', () => {
    const range = getPreviousMonthRange(2026, 8); // August -> July (31 days)
    assert.deepEqual(range, {
      month: '2026-07',
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    });
  });
});
