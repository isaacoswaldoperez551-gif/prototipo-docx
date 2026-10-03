/**
 * Tests Automatizados: Autenticación, Emisión de Tokens y Mitigación de Fuerza Bruta
 * Framework: Vitest / Supertest
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/server/routes/authRoutes.ts';
import { db } from '../src/server/db/dataStore.ts';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Módulo de Autenticación y Control de Sesiones', () => {
  beforeEach(() => {
    db.failedAttempts.clear();
  });

  it('1. POST /api/auth/login con credenciales válidas debe emitir cookies HttpOnly y token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'carlos.mendoza@empresa.com',
        password: 'User123!*',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('carlos.mendoza@empresa.com');
    expect(res.body.user.rol).toBe('USER');

    // Verificar que las cookies se emitieron con atributos de seguridad
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();

    const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('SameSite=Strict');

    const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    expect(refreshTokenCookie).toContain('HttpOnly');
  });

  it('2. POST /api/auth/login con credenciales erróneas debe devolver 401 y mensaje genérico (Anti-Enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'carlos.mendoza@empresa.com',
        password: 'PasswordIncorrecta999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas o cuenta no autorizada.');
  });

  it('3. Debe activar bloqueo por Rate Limiting (429) tras 5 intentos fallidos consecutivos', async () => {
    const email = 'carlos.mendoza@empresa.com';

    // Disparar 5 intentos fallidos
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: `wrong_${i}` });
    }

    // El 6to intento debe ser bloqueado inmediatamente con 429
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'User123!*' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.code).toBe('ACCOUNT_LOCKED');
    expect(blockedRes.body.retryAfterSeconds).toBeGreaterThan(0);
  });
});
