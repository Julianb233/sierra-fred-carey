/**
 * Token Utility Tests
 *
 * Unit tests for JWT signing, verification, and expiration checking.
 * Uses Jest/Vitest compatible syntax.
 *
 * @vitest-environment node
 */

import {
  signJWT,
  verifyTokenSafely,
  verifyToken,
  isTokenExpired,
  getTokenExpiresIn,
  extractTokenFromHeader,
  extractTokenFromCookies,
  calculateExpiration,
  secretToUint8Array,
  getJWTSecret,
} from '../token';
import type { JWTPayload } from '@/types/auth';

describe('Token Utilities', () => {
  const testSecret = 'test-secret-key-for-testing';

  describe('secretToUint8Array', () => {
    it('should convert string to Uint8Array', () => {
      const result = secretToUint8Array('test');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = secretToUint8Array('');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });
  });

  describe('getJWTSecret', () => {
    const originalEnv = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.JWT_SECRET = originalEnv;
    });

    it('should return JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'test-secret';
      const secret = getJWTSecret();
      expect(secret).toBe('test-secret');
    });

    it('should throw in production without JWT_SECRET', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      expect(() => getJWTSecret()).toThrow();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should throw in development without JWT_SECRET', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';

      expect(() => getJWTSecret()).toThrow('JWT_SECRET environment variable is required');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('signJWT', () => {
    it('should create a valid JWT token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await signJWT(payload, { secret: testSecret });

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include payload claims in token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await signJWT(payload, { secret: testSecret });
      const verified = await verifyTokenSafely(token, testSecret);

      expect(verified?.sub).toBe('user-123');
      expect(verified?.email).toBe('test@example.com');
    });

    it('should set expiration time', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, {
        secret: testSecret,
        expiresIn: '7d',
      });

      const verified = await verifyTokenSafely(token, testSecret);
      expect(verified?.exp).toBeDefined();
      expect(typeof verified?.exp).toBe('number');
    });

    it('should set issuedAt time', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, { secret: testSecret });

      const verified = await verifyTokenSafely(token, testSecret);
      expect(verified?.iat).toBeDefined();
      expect(typeof verified?.iat).toBe('number');
    });
  });

  describe('verifyTokenSafely', () => {
    it('should verify valid token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await signJWT(payload, { secret: testSecret });

      const verified = await verifyTokenSafely(token, testSecret);
      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe('user-123');
    });

    it('should return null for invalid token', async () => {
      const verified = await verifyTokenSafely('invalid.token.here', testSecret);
      expect(verified).toBeNull();
    });

    it('should return null for wrong secret', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, { secret: testSecret });

      const verified = await verifyTokenSafely(token, 'wrong-secret');
      expect(verified).toBeNull();
    });

    it('should return null for tampered token', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, { secret: testSecret });
      const tampered = token.slice(0, -10) + 'tampered!!';

      const verified = await verifyTokenSafely(tampered, testSecret);
      expect(verified).toBeNull();
    });

    it('should handle missing secret gracefully', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, { secret: testSecret });

      // Should attempt to use JWT_SECRET from env and likely fail
      const verified = await verifyTokenSafely(token);
      expect(verified).toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await signJWT(payload, { secret: testSecret });

      const verified = await verifyToken(token, testSecret);
      expect(verified.sub).toBe('user-123');
      expect(verified.email).toBe('test@example.com');
    });

    it('should throw error for invalid token', async () => {
      await expect(
        verifyToken('invalid.token.here', testSecret)
      ).rejects.toThrow();
    });

    it('should throw error for wrong secret', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, { secret: testSecret });

      await expect(
        verifyToken(token, 'wrong-secret')
      ).rejects.toThrow();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, {
        secret: testSecret,
        expiresIn: '7d',
      });

      const verified = await verifyTokenSafely(token, testSecret);
      expect(isTokenExpired(verified as JWTPayload)).toBe(false);
    });

    it('should return true for token without exp claim (security: no-exp = expired)', () => {
      const payload: JWTPayload = { sub: 'user-123' };
      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should return true for expired token', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      expect(isTokenExpired(payload)).toBe(true);
    });
  });

  describe('getTokenExpiresIn', () => {
    it('should return remaining time for valid token', async () => {
      const payload = { sub: 'user-123' };
      const token = await signJWT(payload, {
        secret: testSecret,
        expiresIn: '7d',
      });

      const verified = await verifyTokenSafely(token, testSecret);
      const remaining = getTokenExpiresIn(verified as JWTPayload);

      expect(remaining).toBeDefined();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(7 * 24 * 60 * 60); // 7 days
    });

    it('should return null for token without exp claim', () => {
      const payload: JWTPayload = { sub: 'user-123' };
      const remaining = getTokenExpiresIn(payload);
      expect(remaining).toBeNull();
    });

    it('should return 0 for expired token', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const remaining = getTokenExpiresIn(payload);
      expect(remaining).toBe(0);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'my-jwt-token';
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should handle case-insensitive Bearer', () => {
      const token = 'my-jwt-token';
      const header = `bearer ${token}`;
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing Authorization header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed header', () => {
      const extracted = extractTokenFromHeader('just-a-token');
      expect(extracted).toBeNull();
    });

    it('should return null for empty Bearer', () => {
      const extracted = extractTokenFromHeader('Bearer ');
      expect(extracted).toBeNull();
    });
  });

  describe('extractTokenFromCookies', () => {
    it('should extract token from cookies', () => {
      const token = 'my-jwt-token';
      const cookieHeader = `token=${token}; Path=/`;
      const extracted = extractTokenFromCookies(cookieHeader);
      expect(extracted).toBe(token);
    });

    it('should check multiple cookie names', () => {
      const token = 'my-jwt-token';
      const cookieHeader = `auth-token=${token}; Path=/`;
      const extracted = extractTokenFromCookies(cookieHeader, [
        'token',
        'auth-token',
      ]);
      expect(extracted).toBe(token);
    });

    it('should prefer first matching cookie', () => {
      const cookieHeader = 'token=first; auth-token=second';
      const extracted = extractTokenFromCookies(cookieHeader, [
        'token',
        'auth-token',
      ]);
      expect(extracted).toBe('first');
    });

    it('should return null for missing cookie', () => {
      const cookieHeader = 'other=value; Path=/';
      const extracted = extractTokenFromCookies(cookieHeader, ['token']);
      expect(extracted).toBeNull();
    });

    it('should return null for undefined cookie header', () => {
      const extracted = extractTokenFromCookies(undefined);
      expect(extracted).toBeNull();
    });
  });

  describe('calculateExpiration', () => {
    it('should calculate seconds correctly', () => {
      const before = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiration(3600);
      const after = Math.floor(Date.now() / 1000);

      expect(expiry).toBeGreaterThanOrEqual(before + 3600);
      expect(expiry).toBeLessThanOrEqual(after + 3600 + 1);
    });

    it('should parse time strings', () => {
      const expiry = calculateExpiration('7d');
      const now = Math.floor(Date.now() / 1000);
      const sevenDays = 7 * 24 * 60 * 60;

      expect(expiry).toBeGreaterThanOrEqual(now + sevenDays);
      expect(expiry).toBeLessThanOrEqual(now + sevenDays + 1);
    });

    it('should handle all time units', () => {
      const now = Math.floor(Date.now() / 1000);

      const seconds = calculateExpiration('60s');
      expect(seconds).toBeGreaterThanOrEqual(now + 60);

      const minutes = calculateExpiration('1m');
      expect(minutes).toBeGreaterThanOrEqual(now + 60);

      const hours = calculateExpiration('1h');
      expect(hours).toBeGreaterThanOrEqual(now + 3600);

      const days = calculateExpiration('1d');
      expect(days).toBeGreaterThanOrEqual(now + 86400);

      const weeks = calculateExpiration('1w');
      expect(weeks).toBeGreaterThanOrEqual(now + 604800);
    });

    it('should throw for invalid format', () => {
      expect(() => calculateExpiration('invalid')).toThrow();
    });
  });

  describe('Integration', () => {
    it('should sign and verify token end-to-end', async () => {
      const payload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: 'user',
        permissions: ['read:documents'],
      };

      // Sign
      const token = await signJWT(payload, {
        secret: testSecret,
        expiresIn: '7d',
      });

      // Verify
      const verified = await verifyTokenSafely(token, testSecret);

      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe(payload.sub);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.role).toBe(payload.role);
      expect(JSON.stringify(verified?.permissions)).toBe(
        JSON.stringify(payload.permissions)
      );
      expect(isTokenExpired(verified as JWTPayload)).toBe(false);
    });
  });
});
