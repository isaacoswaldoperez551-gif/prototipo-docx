import crypto from 'crypto';
import type { AuthenticatedUser } from '../types.ts';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'docuguard_access_secret_super_secure_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'docuguard_refresh_secret_super_secure_key_2026';

// 1. Password Hashing (PBKDF2 con Salt de 16 bytes y 100,000 iteraciones - conforme a OWASP)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

// 2. Hash SHA-256 para Refresh Tokens almacenados en BD
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 3. Generación de Token Criptográfico Seguro
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// 4. Implementación robusta de JWT (Access Token de 15 minutos)
interface TokenPayload {
  sub: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
  jti: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
}

export function createAccessToken(user: AuthenticatedUser): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    iat: now,
    exp: now + 15 * 60, // 15 minutos (vida corta)
    jti: crypto.randomUUID(),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_ACCESS_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_ACCESS_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const decodedPayload: TokenPayload = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);

    if (decodedPayload.exp < now) {
      return null; // Token expirado
    }

    return {
      id: decodedPayload.sub,
      nombre: decodedPayload.nombre,
      email: decodedPayload.email,
      rol: decodedPayload.rol,
    };
  } catch {
    return null;
  }
}

// 5. Refresh Token (Rotativo, 7 días de duración)
export function createRefreshTokenPayload(): { token: string; expiresAt: Date } {
  const token = generateRandomToken(48);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
  return { token, expiresAt };
}
