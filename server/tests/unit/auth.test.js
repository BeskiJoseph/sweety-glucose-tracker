const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, comparePassword } = require('../../src/utils/password.util');
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
