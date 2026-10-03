import { Router } from 'express';
import type { Request, Response } from 'express';
import { 
  verifyPassword, 
  createAccessToken, 
  createRefreshTokenPayload, 
  hashToken 
} from '../security/crypto.ts';
import { db } from '../db/dataStore.ts';
import { authenticate } from '../middleware/authMiddleware.ts';
import type { AuthenticatedRequest, RefreshToken } from '../types.ts';

const router = Router();

// Helper para cookies seguras
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  // Access Token en cookie HttpOnly (15 min)
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  // Refresh Token en cookie HttpOnly (7 días)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth', // Limitar alcance de cookie
  });
}

// 1. POST /api/auth/login
router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body || {};
  const clientIp = req.ip || '127.0.0.1';

  if (!email || !password) {
    res.status(400).json({
      error: 'Se requiere correo electrónico y contraseña.',
      code: 'MISSING_CREDENTIALS',
    });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const rateLimitKey = `${clientIp}:${normalizedEmail}`;
  const now = Date.now();

  // Rate Limiting & Lockout Check
  const attemptRecord = db.failedAttempts.get(rateLimitKey);
  if (attemptRecord?.lockedUntil && attemptRecord.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
    res.status(429).json({
      error: `Demasiados intentos fallidos. Cuenta temporalmente bloqueada por seguridad. Intente nuevamente en ${remainingSeconds} segundos.`,
      code: 'ACCOUNT_LOCKED',
      retryAfterSeconds: remainingSeconds,
    });
    return;
  }

  // Buscar usuario
  let matchedUser = null;
  for (const user of db.users.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      matchedUser = user;
      break;
    }
  }

  // Mensaje genérico para prevenir enumeración de correos (OWASP)
  const genericErrorMessage = 'Credenciales inválidas o cuenta no autorizada.';

  if (!matchedUser) {
    // Registrar intento fallido genérico
    const cur = attemptRecord || { count: 0, lockedUntil: null };
    cur.count += 1;
    if (cur.count >= 5) {
      cur.lockedUntil = now + 15 * 60 * 1000; // 15 minutos
    }
    db.failedAttempts.set(rateLimitKey, cur);

    db.recordAuditLog(null, 'LOGIN_FAILED_NONEXISTENT_USER', 'auth', null, clientIp, { email: normalizedEmail });
    res.status(401).json({ error: genericErrorMessage, code: 'INVALID_CREDENTIALS' });
    return;
  }

  // Verificar si la cuenta está activa
  if (!matchedUser.activo) {
    db.recordAuditLog(matchedUser.id, 'LOGIN_REJECTED_DISABLED_USER', 'auth', matchedUser.id, clientIp);
    res.status(401).json({ error: 'La cuenta se encuentra desactivada por el administrador.', code: 'USER_DISABLED' });
    return;
  }

  // Validar contraseña
  const isMatch = verifyPassword(password, matchedUser.password_hash);
  if (!isMatch) {
    const cur = attemptRecord || { count: 0, lockedUntil: null };
    cur.count += 1;
    if (cur.count >= 5) {
      cur.lockedUntil = now + 15 * 60 * 1000;
    }
    db.failedAttempts.set(rateLimitKey, cur);

    db.recordAuditLog(matchedUser.id, 'LOGIN_FAILED_BAD_PASSWORD', 'auth', matchedUser.id, clientIp, {
      attemptCount: cur.count,
    });

    res.status(401).json({ error: genericErrorMessage, code: 'INVALID_CREDENTIALS' });
    return;
  }

  // Login exitoso: limpiar registro de intentos fallidos
  db.failedAttempts.delete(rateLimitKey);

  // Crear Access Token (15m)
  const authUser = {
    id: matchedUser.id,
    nombre: matchedUser.nombre,
    email: matchedUser.email,
    rol: matchedUser.rol,
  };
  const accessToken = createAccessToken(authUser);

  // Crear Refresh Token Rotativo (7 días)
  const { token: rawRefreshToken, expiresAt } = createRefreshTokenPayload();
  const tokenHash = hashToken(rawRefreshToken);

  const refreshTokenRecord: RefreshToken = {
    id: crypto.randomUUID(),
    user_id: matchedUser.id,
    token_hash: tokenHash,
    ip: clientIp,
    user_agent: req.headers['user-agent'] as string,
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    created_at: new Date().toISOString(),
  };
  db.refreshTokens.set(tokenHash, refreshTokenRecord);

  // Enviar cookies HttpOnly seguras
  setAuthCookies(res, accessToken, rawRefreshToken);

  db.recordAuditLog(matchedUser.id, 'LOGIN_SUCCESS', 'auth', matchedUser.id, clientIp, {
    rol: matchedUser.rol,
  });

  res.status(200).json({
    message: 'Autenticación exitosa',
    user: authUser,
    accessToken, // También provisto para clientes que usen encabezado Bearer
  });
});

// 2. POST /api/auth/refresh
router.post('/refresh', (req: Request, res: Response): void => {
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  const clientIp = req.ip || '127.0.0.1';

  if (!rawRefreshToken) {
    res.status(401).json({ error: 'Refresh token ausente', code: 'REFRESH_TOKEN_REQUIRED' });
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const existingToken = db.refreshTokens.get(tokenHash);

  // Si no existe o fue revocado -> sospecha de robo de token
  if (!existingToken || existingToken.revoked_at || new Date(existingToken.expires_at) < new Date()) {
    // Si el token ya había sido revocado, invalidar todos los tokens del usuario por seguridad
    if (existingToken?.revoked_at) {
      db.recordAuditLog(
        existingToken.user_id,
        'SECURITY_REFRESH_TOKEN_REUSE_DETECTED',
        'auth',
        existingToken.id,
        clientIp,
        { warning: 'Posible ataque de reuso de token interceptado' }
      );
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(401).json({ error: 'Refresh token inválido, expirado o revocado', code: 'INVALID_REFRESH_TOKEN' });
    return;
  }

  // Revocar el token usado (Rotación estricta de refresh token)
  existingToken.revoked_at = new Date().toISOString();

  const user = db.users.get(existingToken.user_id);
  if (!user || !user.activo) {
    res.status(401).json({ error: 'Usuario no disponible', code: 'USER_DISABLED' });
    return;
  }

  const authUser = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };

  // Emitir nuevos tokens
  const newAccessToken = createAccessToken(authUser);
  const { token: newRawRefreshToken, expiresAt: newExpiresAt } = createRefreshTokenPayload();
  const newTokenHash = hashToken(newRawRefreshToken);

  const newRefreshTokenRecord: RefreshToken = {
    id: crypto.randomUUID(),
    user_id: user.id,
    token_hash: newTokenHash,
    ip: clientIp,
    user_agent: req.headers['user-agent'] as string,
    expires_at: newExpiresAt.toISOString(),
    revoked_at: null,
    created_at: new Date().toISOString(),
  };
  db.refreshTokens.set(newTokenHash, newRefreshTokenRecord);

  setAuthCookies(res, newAccessToken, newRawRefreshToken);

  res.status(200).json({
    message: 'Tokens renovados exitosamente',
    user: authUser,
    accessToken: newAccessToken,
  });
});

// 3. POST /api/auth/logout
router.post('/logout', (req: AuthenticatedRequest, res: Response): void => {
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = db.refreshTokens.get(tokenHash);
    if (tokenRecord) {
      tokenRecord.revoked_at = new Date().toISOString();
    }
  }

  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });

  if (req.user) {
    db.recordAuditLog(req.user.id, 'LOGOUT', 'auth', req.user.id, req.ip || '127.0.0.1');
  }

  res.status(200).json({ message: 'Sesión cerrada exitosamente' });
});

// 4. GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({ user: req.user });
});

export default router;
