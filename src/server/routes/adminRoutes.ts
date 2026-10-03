import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../db/dataStore.ts';
import { authenticate, authorize } from '../middleware/authMiddleware.ts';
import { hashPassword } from '../security/crypto.ts';
import type { AuthenticatedRequest, UserRole, AssignmentPermission, Document, Assignment } from '../types.ts';

const router = Router();

// Todas las rutas de administración requieren autenticación y rol 'ADMIN'
router.use(authenticate);
router.use(authorize('ADMIN'));

// -----------------------------------------------------------------------------
// GESTIÓN DE USUARIOS (CRUD)
// -----------------------------------------------------------------------------

// 1. GET /api/admin/users
router.get('/users', (_req: AuthenticatedRequest, res: Response): void => {
  const usersList = Array.from(db.users.values()).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    assignedCount: Array.from(db.assignments.values()).filter((a) => a.user_id === u.id).length,
  }));

  res.status(200).json({ users: usersList });
});

// 2. POST /api/admin/users
router.post('/users', (req: AuthenticatedRequest, res: Response): void => {
  const { nombre, email, password, rol = 'USER' } = req.body || {};
  const admin = req.user!;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Validar unicidad de email
  for (const existingUser of db.users.values()) {
    if (existingUser.email.toLowerCase() === normalizedEmail) {
      res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
      return;
    }
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    return;
  }

  const newUserId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newUser = {
    id: newUserId,
    nombre: String(nombre).trim(),
    email: normalizedEmail,
    password_hash: hashPassword(password),
    rol: (rol === 'ADMIN' ? 'ADMIN' : 'USER') as UserRole,
    activo: true,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: now,
    updated_at: now,
  };

  db.users.set(newUserId, newUser);

  db.recordAuditLog(admin.id, 'USER_CREATED', 'users', newUserId, req.ip || '127.0.0.1', {
    createdUserEmail: normalizedEmail,
    assignedRole: newUser.rol,
  });

  res.status(201).json({
    message: 'Usuario creado exitosamente',
    user: {
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      rol: newUser.rol,
      activo: newUser.activo,
    },
  });
});

// 3. PATCH /api/admin/users/:id
router.patch('/users/:id', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.params.id;
  const { nombre, rol, activo } = req.body || {};
  const admin = req.user!;

  const user = db.users.get(userId);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  // Prevenir que un admin se desactive a sí mismo
  if (user.id === admin.id && activo === false) {
    res.status(400).json({ error: 'No puedes desactivar tu propia cuenta de administrador.' });
    return;
  }

  if (typeof nombre === 'string') user.nombre = nombre.trim();
  if (rol === 'ADMIN' || rol === 'USER') user.rol = rol;
  if (typeof activo === 'boolean') user.activo = activo;
  user.updated_at = new Date().toISOString();

  db.recordAuditLog(admin.id, 'USER_UPDATED', 'users', userId, req.ip || '127.0.0.1', {
    updates: { nombre, rol, activo },
  });

  res.status(200).json({
    message: 'Usuario actualizado correctamente',
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
    },
  });
});

// 4. PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.params.id;
  const { newPassword } = req.body || {};
  const admin = req.user!;

  const user = db.users.get(userId);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    return;
  }

  user.password_hash = hashPassword(newPassword);
  user.updated_at = new Date().toISOString();

  // Revocar sesiones activas del usuario por seguridad
  for (const token of db.refreshTokens.values()) {
    if (token.user_id === userId) {
      token.revoked_at = new Date().toISOString();
    }
  }

  db.recordAuditLog(admin.id, 'PASSWORD_RESET_BY_ADMIN', 'users', userId, req.ip || '127.0.0.1', {
    targetUserEmail: user.email,
  });

  res.status(200).json({ message: 'Contraseña restablecida y sesiones previas revocadas con éxito.' });
});

// -----------------------------------------------------------------------------
// GESTIÓN DE DOCUMENTOS
// -----------------------------------------------------------------------------

// 5. GET /api/admin/documents
router.get('/documents', (_req: AuthenticatedRequest, res: Response): void => {
  const docsList = Array.from(db.documents.values()).map((doc) => {
    const docAssignments = Array.from(db.assignments.values()).filter((a) => a.document_id === doc.id);
    return {
      id: doc.id,
      titulo: doc.titulo,
      descripcion: doc.descripcion,
      categoria: doc.categoria,
      mime_type: doc.mime_type,
      tamano_bytes: doc.tamano_bytes,
      version_actual: doc.version_actual,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      assignments: docAssignments.map((a) => ({
        id: a.id,
        userId: a.user_id,
        userNombre: a.user_nombre,
        userEmail: a.user_email,
        permiso: a.permiso,
      })),
    };
  });

  res.status(200).json({ documents: docsList });
});

// 6. POST /api/admin/documents
router.post('/documents', (req: AuthenticatedRequest, res: Response): void => {
  const { titulo, descripcion, categoria, contenido, mimeType = 'text/markdown' } = req.body || {};
  const admin = req.user!;

  if (!titulo || typeof contenido !== 'string') {
    res.status(400).json({ error: 'Título y contenido del documento son requeridos.' });
    return;
  }

  const docId = crypto.randomUUID();
  const now = new Date().toISOString();
  const bytes = Buffer.byteLength(contenido, 'utf-8');

  // Validar tamaño (máximo 25 MB)
  if (bytes > 25 * 1024 * 1024) {
    res.status(400).json({ error: 'El archivo excede el límite permitido de 25 MB.' });
    return;
  }

  // Nombre de archivo saneado y almacenado de forma segura con UUID
  const sanitizedTitle = titulo.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeStoragePath = `/vault/${docId}/v1_${sanitizedTitle}`;

  const newDoc: Document = {
    id: docId,
    titulo: String(titulo).trim(),
    descripcion: String(descripcion || '').trim(),
    categoria: String(categoria || 'General').trim(),
    ruta_archivo: safeStoragePath,
    mime_type: mimeType,
    tamano_bytes: bytes,
    version_actual: 1,
    created_by: admin.id,
    created_at: now,
    updated_at: now,
  };

  db.documents.set(docId, newDoc);

  // Crear versión inicial
  db.versions.push({
    id: crypto.randomUUID(),
    document_id: docId,
    numero_version: 1,
    ruta_archivo: safeStoragePath,
    contenido,
    editado_por: admin.id,
    editor_nombre: admin.nombre,
    nota_cambio: 'Carga inicial del documento',
    created_at: now,
  });

  db.recordAuditLog(admin.id, 'DOCUMENT_CREATED', 'documents', docId, req.ip || '127.0.0.1', {
    titulo: newDoc.titulo,
    categoria: newDoc.categoria,
    tamanoBytes: bytes,
  });

  res.status(201).json({ message: 'Documento creado y almacenado de forma segura.', document: newDoc });
});

// -----------------------------------------------------------------------------
// GESTIÓN DE ASIGNACIONES (PERMISOS POR ARCHIVO)
// -----------------------------------------------------------------------------

// 7. GET /api/admin/assignments
router.get('/assignments', (_req: AuthenticatedRequest, res: Response): void => {
  const assignmentsList = Array.from(db.assignments.values());
  res.status(200).json({ assignments: assignmentsList });
});

// 8. POST /api/admin/assignments
router.post('/assignments', (req: AuthenticatedRequest, res: Response): void => {
  const { userId, documentId, permiso } = req.body || {};
  const admin = req.user!;

  if (!userId || !documentId || !permiso) {
    res.status(400).json({ error: 'userId, documentId y permiso (READ|EDIT) son requeridos.' });
    return;
  }

  if (permiso !== 'READ' && permiso !== 'EDIT') {
    res.status(400).json({ error: 'El permiso debe ser READ o EDIT.' });
    return;
  }

  const user = db.users.get(userId);
  const doc = db.documents.get(documentId);

  if (!user || !doc) {
    res.status(404).json({ error: 'Usuario o documento no encontrado.' });
    return;
  }

  // Verificar si ya existe asignación para actualizarla o crearla
  let existingAssignment = db.findAssignment(userId, documentId);
  const now = new Date().toISOString();

  if (existingAssignment) {
    const oldPermiso = existingAssignment.permiso;
    existingAssignment.permiso = permiso as AssignmentPermission;
    existingAssignment.updated_at = now;

    db.recordAuditLog(admin.id, 'ASSIGNMENT_UPDATED', 'assignments', existingAssignment.id, req.ip || '127.0.0.1', {
      user: user.email,
      document: doc.titulo,
      previousPermission: oldPermiso,
      newPermission: permiso,
    });

    res.status(200).json({
      message: 'Permiso de asignación actualizado.',
      assignment: existingAssignment,
    });
    return;
  }

  const newAssignment: Assignment = {
    id: crypto.randomUUID(),
    user_id: userId,
    user_nombre: user.nombre,
    user_email: user.email,
    document_id: documentId,
    document_titulo: doc.titulo,
    permiso: permiso as AssignmentPermission,
    assigned_by: admin.id,
    created_at: now,
    updated_at: now,
  };

  db.assignments.set(newAssignment.id, newAssignment);

  db.recordAuditLog(admin.id, 'ASSIGNMENT_CREATED', 'assignments', newAssignment.id, req.ip || '127.0.0.1', {
    user: user.email,
    document: doc.titulo,
    permiso,
  });

  res.status(201).json({
    message: 'Documento asignado correctamente al usuario.',
    assignment: newAssignment,
  });
});

// 9. DELETE /api/admin/assignments/:id
router.delete('/assignments/:id', (req: AuthenticatedRequest, res: Response): void => {
  const assignmentId = req.params.id;
  const admin = req.user!;

  const assignment = db.assignments.get(assignmentId);
  if (!assignment) {
    res.status(404).json({ error: 'Asignación no encontrada.' });
    return;
  }

  db.assignments.delete(assignmentId);

  db.recordAuditLog(admin.id, 'ASSIGNMENT_REVOKED', 'assignments', assignmentId, req.ip || '127.0.0.1', {
    revokedUserId: assignment.user_id,
    documentId: assignment.document_id,
  });

  res.status(200).json({ message: 'Permiso y asignación revocados exitosamente.' });
});

// -----------------------------------------------------------------------------
// BITÁCORA DE AUDITORÍA (AUDIT LOGS)
// -----------------------------------------------------------------------------

// 10. GET /api/admin/audit-logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response): void => {
  const { action, limit = '100' } = req.query;
  const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 100));

  let logs = [...db.auditLogs];

  if (action && typeof action === 'string') {
    logs = logs.filter((l) => l.accion.toLowerCase().includes(action.toLowerCase()));
  }

  res.status(200).json({
    total: logs.length,
    logs: logs.slice(0, limitNum),
  });
});

export default router;
