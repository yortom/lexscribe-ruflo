import { decryptPii, encryptPii, hashPii } from '../../src/common/crypto/pii-crypto';

describe('pii-crypto', () => {
  const originalKey = process.env.APP_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey) {
      process.env.APP_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.APP_ENCRYPTION_KEY;
    }
  });

  it('requires APP_ENCRYPTION_KEY instead of using a fallback key', () => {
    delete process.env.APP_ENCRYPTION_KEY;

    expect(() => hashPii('12345678A')).toThrow('APP_ENCRYPTION_KEY is required');
  });

  it('redacts encrypted PII when the configured key cannot decrypt it', () => {
    process.env.APP_ENCRYPTION_KEY = 'original-test-key-32-chars-minimum';
    const encrypted = encryptPii('12345678A');

    process.env.APP_ENCRYPTION_KEY = 'different-test-key-32-chars-minimum';

    expect(decryptPii(encrypted)).toBeNull();
  });

  it('redacts encrypted PII when APP_ENCRYPTION_KEY is missing on read', () => {
    process.env.APP_ENCRYPTION_KEY = 'original-test-key-32-chars-minimum';
    const encrypted = encryptPii('12345678A');

    delete process.env.APP_ENCRYPTION_KEY;

    expect(decryptPii(encrypted)).toBeNull();
  });
});
