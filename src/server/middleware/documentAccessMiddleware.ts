import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, AssignmentPermission } from '../types.ts';
import { db } from '../db/dataStore.ts';

/**
 * Middleware Anti-IDOR (Insecure Direct Object Reference)
 * Verifica que el usuario tenga asignado el documento con el nivel de permiso requerido.
 * REGLA FUNDAMENTAL DE SEGURIDAD:
 * Si el documento no existe O si el usuario NO tiene una fila en 'assignments',
 * se debe responder HTTP 404 (Not Found) y NUNCA 403. Esto evita que atacantes
 * enumeren UUIDs válidos en la base de datos corporativa.
 */
export function requireDocumentAccess(requiredPermission: AssignmentPermission = 'READ') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const documentId = req.params.id;
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'No autenticado.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!documentId) {
      res.status(400).json({
        error: 'Identificador de documento no proporcionado.',
        code: 'INVALID_DOCUMENT_ID',
      });
      return;
    }

    const document = db.documents.get(documentId);

    // Si el documento físicamente no existe en el sistema -> 404
    if (!document) {
      res.status(404).json({
        error: 'Documento no encontrado o no disponible.',
        code: 'DOCUMENT_NOT_FOUND',
      });
      return;
    }

    // Los administradores tienen acceso global en rutas de administración
    if (user.rol === 'ADMIN') {
      req.documentAccess = {
        document,
        permiso: 'EDIT',
      };
      next();
      return;
    }

    // Para usuarios estándar (USER): verificar explícitamente en la tabla de asignaciones
    const assignment = db.findAssignment(user.id, documentId);

    // ANTI-IDOR: Si NO está asignado, responder 404 como si el recurso no existiera
    if (!assignment) {
      // Registrar intento sospechoso en auditoría para análisis de seguridad forense
      db.recordAuditLog(
        user.id,
        'SECURITY_IDOR_PROBE_BLOCKED',
        'documents',
        documentId,
        req.ip || '127.0.0.1',
        {
          attemptedAccessByUser: user.email,
          targetDocumentId: documentId,
          mitigation: 'Responded 404 to obscure document existence',
        }
      );

      res.status(404).json({
        error: 'Documento no encontrado o no disponible.',
        code: 'DOCUMENT_NOT_FOUND',
      });
      return;
    }

    // Si requiere permiso EDIT pero la asignación solo autoriza READ -> 403 Forbidden
    if (requiredPermission === 'EDIT' && assignment.permiso !== 'EDIT') {
      db.recordAuditLog(
        user.id,
        'PERMISSION_DENIED_READONLY',
        'documents',
        documentId,
        req.ip || '127.0.0.1',
        {
          assignedPermission: assignment.permiso,
          requiredPermission,
        }
      );

      res.status(403).json({
        error: 'Permiso insuficiente. Su perfil solo tiene asignada lectura (READ) para este archivo.',
        code: 'FORBIDDEN_INSUFFICIENT_PERMISSION',
        assignedPermission: assignment.permiso,
      });
      return;
    }

    // Acceso validado correctamente
    req.documentAccess = {
      document,
      assignment,
      permiso: assignment.permiso,
    };

    next();
  };
}
