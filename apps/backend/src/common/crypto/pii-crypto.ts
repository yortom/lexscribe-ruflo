import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY is required');
  }

  return createHash('sha256').update(secret).digest();
}

export function normalizePii(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function isEncryptedPii(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function hashPii(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return createHmac('sha256', getKey()).update(normalizePii(value)).digest('hex');
}

export function encryptPii(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (isEncryptedPii(value)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64url')}.${tag.toString(
    'base64url',
  )}.${encrypted.toString('base64url')}`;
}

export function decryptPii(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (!isEncryptedPii(value)) return value;

  const [ivRaw, tagRaw, encryptedRaw] = value.slice(PREFIX.length).split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) return value;

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
