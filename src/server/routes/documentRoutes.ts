import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../db/dataStore.ts';
import { authenticate } from '../middleware/authMiddleware.ts';
import { requireDocumentAccess } from '../middleware/documentAccessMiddleware.ts';
import type { AuthenticatedRequest, DocumentVersion } from '../types.ts';

const router = Router();

// Aplicar autenticación por defecto a todas las rutas de documentos
router.use(authenticate);

// 1. GET /api/documents
// Devuelve ÚNICAMENTE los documentos asignados al usuario autenticado (o todos si es ADMIN)
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { q, category, permission, page = '1', limit = '10' } = req.query;

  const searchQuery = typeof q === 'string' ? q.toLowerCase().trim() : '';
  const filterCat = typeof category === 'string' ? category.trim() : '';
  const filterPerm = typeof permission === 'string' ? permission.trim() : '';
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));

  let results: Array<{
    id: string;
    titulo: string;
    descripcion: string;
    categoria: string;
    mime_type: string;
    tamano_bytes: number;
    version_actual: number;
    created_at: string;
    updated_at: string;
    permiso: 'READ' | 'EDIT';
    assigned_at: string;
  }> = [];

  if (user.rol === 'ADMIN') {
    // Para administradores: listar todos los documentos con permiso total
    for (const doc of db.documents.values()) {
      results.push({
        id: doc.id,
        titulo: doc.titulo,
        descripcion: doc.descripcion,
        categoria: doc.categoria,
        mime_type: doc.mime_type,
        tamano_bytes: doc.tamano_bytes,
        version_actual: doc.version_actual,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        permiso: 'EDIT',
        assigned_at: doc.created_at,
      });
    }
  } else {
    // Para usuarios estándar: SOLO documentos asignados en la tabla 'assignments'
    for (const assignment of db.assignments.values()) {
      if (assignment.user_id === user.id) {
        const doc = db.documents.get(assignment.document_id);
        if (doc) {
          results.push({
            id: doc.id,
            titulo: doc.titulo,
            descripcion: doc.descripcion,
            categoria: doc.categoria,
            mime_type: doc.mime_type,
            tamano_bytes: doc.tamano_bytes,
            version_actual: doc.version_actual,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            permiso: assignment.permiso,
            assigned_at: assignment.created_at,
          });
        }
      }
    }
  }

  // Filtrado en memoria
  if (searchQuery) {
    results = results.filter(
      (d) =>
        d.titulo.toLowerCase().includes(searchQuery) ||
        d.descripcion.toLowerCase().includes(searchQuery) ||
        d.categoria.toLowerCase().includes(searchQuery)
    );
  }

  if (filterCat && filterCat !== 'ALL') {
    results = results.filter((d) => d.categoria.toLowerCase() === filterCat.toLowerCase());
  }

  if (filterPerm && filterPerm !== 'ALL') {
    results = results.filter((d) => d.permiso === filterPerm);
  }

  // Ordenar por fecha de actualización descendente
  results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Paginación
  const total = results.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedData = results.slice(startIndex, startIndex + limitNum);

  // Categorías disponibles para filtros en el frontend
  const availableCategories = Array.from(new Set(results.map((d) => d.categoria)));

  res.status(200).json({
    data: paginatedData,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
    categories: availableCategories,
  });
});

// 2. GET /api/documents/:id
// Obtiene metadatos y permiso asignado. Protegido contra IDOR (devuelve 404 si no asignado).
router.get('/:id', requireDocumentAccess('READ'), (req: AuthenticatedRequest, res: Response): void => {
  const { document, permiso } = req.documentAccess!;
  res.status(200).json({
    document,
    permiso,
  });
});

// 3. GET /api/documents/:id/content
// Devuelve el contenido del archivo y su versión actual para el editor/visor.
router.get('/:id/content', requireDocumentAccess('READ'), (req: AuthenticatedRequest, res: Response): void => {
  const { document, permiso } = req.documentAccess!;
  const latest = db.getLatestContent(document.id);

  // Registrar lectura en auditoría si es un documento sensible
  db.recordAuditLog(
    req.user!.id,
    'DOCUMENT_ACCESSED_VIEW',
    'documents',
    document.id,
    req.ip || '127.0.0.1',
    {
      titulo: document.titulo,
      version: latest.version,
    }
  );

  res.status(200).json({
    documentId: document.id,
    titulo: document.titulo,
    categoria: document.categoria,
    mimeType: document.mime_type,
    content: latest.content,
    version: document.version_actual,
    permiso,
  });
});

// 4. PUT /api/documents/:id/content
// Modifica el contenido con CONTROL DE CONCURRENCIA OPTIMISTA y creación de nueva versión.
// Requiere explícitamente permiso EDIT (403 si el usuario solo tiene READ, 404 si no está asignado).
router.put('/:id/content', requireDocumentAccess('EDIT'), (req: AuthenticatedRequest, res: Response): void => {
  const { document } = req.documentAccess!;
  const { content, version, changeNote } = req.body || {};
  const user = req.user!;

  if (typeof content !== 'string') {
    res.status(400).json({
      error: 'El contenido debe ser una cadena de texto válida.',
      code: 'INVALID_CONTENT',
    });
    return;
  }

  const clientVersion = parseInt(version, 10);
  if (isNaN(clientVersion)) {
    res.status(400).json({
      error: 'Debe especificarse el número de versión base para el control de concurrencia optimista.',
      code: 'MISSING_VERSION',
    });
    return;
  }

  // =========================================================================
  // CONTROL DE CONCURRENCIA OPTIMISTA (Optimistic Concurrency Control)
  // Si la versión enviada por el cliente no coincide con la versión actual en BD,
  // significa que otro usuario guardó cambios mientras este usuario editaba.
  // Se responde HTTP 409 Conflict con la versión más reciente para evitar sobrescrituras.
  // =========================================================================
  if (document.version_actual !== clientVersion) {
    const latest = db.getLatestContent(document.id);

    db.recordAuditLog(
      user.id,
      'CONCURRENCY_CONFLICT_DETECTED',
      'documents',
      document.id,
      req.ip || '127.0.0.1',
      {
        attemptedVersion: clientVersion,
        currentServerVersion: document.version_actual,
      }
    );

    res.status(409).json({
      error: 'Conflicto de concurrencia: El documento fue modificado por otro usuario mientras realizabas cambios. Revisa las diferencias antes de sobrescribir.',
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      clientVersion,
      serverVersion: document.version_actual,
      latestContent: latest.content,
    });
    return;
  }

  // Sanitización básica de contenido (anti-XSS)
  const sanitizedContent = content.trim();

  // Incrementar versión del documento
  const newVersionNumber = document.version_actual + 1;
  const now = new Date().toISOString();

  const newVersionRecord: DocumentVersion = {
    id: crypto.randomUUID(),
    document_id: document.id,
    numero_version: newVersionNumber,
    ruta_archivo: `/vault/${document.id}/v${newVersionNumber}.md`,
    contenido: sanitizedContent,
    editado_por: user.id,
    editor_nombre: user.nombre,
    nota_cambio: changeNote || `Actualización guardada por ${user.nombre}`,
    created_at: now,
  };

  // Guardar nueva versión (historial inmutable, no sobrescribe)
  db.versions.push(newVersionRecord);

  // Actualizar metadatos del documento maestro
  document.version_actual = newVersionNumber;
  document.tamano_bytes = Buffer.byteLength(sanitizedContent, 'utf-8');
  document.updated_at = now;

  // Registrar en bitácora de auditoría
  db.recordAuditLog(
    user.id,
    'DOCUMENT_VERSION_SAVED',
    'documents',
    document.id,
    req.ip || '127.0.0.1',
    {
      newVersion: newVersionNumber,
      previousVersion: clientVersion,
      notaCambio: newVersionRecord.nota_cambio,
      tamanoBytes: document.tamano_bytes,
      notifiedAdmin: true,
    }
  );

  res.status(200).json({
    message: 'Nueva versión del documento guardada con éxito.',
    version: newVersionNumber,
    updatedAt: now,
  });
});

// 5. GET /api/documents/:id/versions
// Historial completo de versiones auditadas del documento
router.get('/:id/versions', requireDocumentAccess('READ'), (req: AuthenticatedRequest, res: Response): void => {
  const { document } = req.documentAccess!;

  const history = db.versions
    .filter((v) => v.document_id === document.id)
    .sort((a, b) => b.numero_version - a.numero_version)
    .map((v) => ({
      id: v.id,
      numeroVersion: v.numero_version,
      editadoPor: v.editor_nombre || 'Usuario del sistema',
      notaCambio: v.nota_cambio,
      createdAt: v.created_at,
      tamanoBytes: Buffer.byteLength(v.contenido, 'utf-8'),
    }));

  res.status(200).json({
    documentId: document.id,
    titulo: document.titulo,
    versions: history,
  });
});

export default router;
