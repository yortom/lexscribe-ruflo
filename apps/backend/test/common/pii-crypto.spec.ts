import { hashPii } from '../../src/common/crypto/pii-crypto';

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
});
