import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const PBKDF2_ITERATIONS = 100000;
const SALT_LEN = 16;
const KEY_LEN = 64;
const DIGEST = 'sha256';

const JWT_SECRET = process.env.JWT_SECRET || 'kuma-inventory-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (typeof storedHash !== 'string' || !storedHash) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  try {
    const computed = crypto.pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const computedBuf = Buffer.from(computed, 'hex');
    if (hashBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, computedBuf);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

