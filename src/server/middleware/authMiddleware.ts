import type { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../security/crypto.ts';
import type { AuthenticatedRequest, UserRole } from '../types.ts';
import { db } from '../db/dataStore.ts';

// 1. Middleware de Autenticación Central (Deny by default)
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Extraer token de cookie HttpOnly o del encabezado Bearer
  let token = req.cookies?.access_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({
      error: 'No autenticado. Token de acceso ausente o inválido.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Token de acceso expirado o firma criptográfica inválida.',
      code: 'TOKEN_EXPIRED_OR_INVALID',
    });
    return;
  }

  // Verificar que el usuario exista y siga activo en base de datos
  const user = db.users.get(payload.id);
  if (!user || !user.activo) {
    res.status(401).json({
      error: 'Cuenta de usuario inactiva o deshabilitada por el administrador.',
      code: 'USER_DISABLED',
    });
    return;
  }

  req.user = {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };

  next();
}

// 2. Middleware de Autorización por Roles (RBAC)
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'No autenticado.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      db.recordAuditLog(
        req.user.id,
        'RBAC_ACCESS_DENIED',
        'route',
        req.originalUrl,
        req.ip || '127.0.0.1',
        { requiredRoles: roles, userRole: req.user.rol }
      );

      res.status(403).json({
        error: 'Acceso denegado: privilegios de rol insuficientes.',
        code: 'FORBIDDEN_ROLE',
      });
      return;
    }

    next();
  };
}
