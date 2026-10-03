import { hashPassword, hashToken } from '../security/crypto.ts';
import type { 
  User, 
  Document, 
  DocumentVersion, 
  Assignment, 
  RefreshToken, 
  AuditLog, 
  AssignmentPermission,
  UserRole 
} from '../types.ts';

class DataStore {
  public users: Map<string, User> = new Map();
  public documents: Map<string, Document> = new Map();
  public versions: DocumentVersion[] = [];
  public assignments: Map<string, Assignment> = new Map();
  public refreshTokens: Map<string, RefreshToken> = new Map();
  public auditLogs: AuditLog[] = [];
  public failedAttempts: Map<string, { count: number; lockedUntil: number | null }> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Usuarios Semilla
    const adminId = 'a1000000-0000-0000-0000-000000000001';
    const user1Id = 'b2000000-0000-0000-0000-000000000002'; // Carlos Mendoza
    const user2Id = 'c3000000-0000-0000-0000-000000000003'; // Sofía Valdez
    const user3Id = 'd4000000-0000-0000-0000-000000000004'; // Pedro Ramírez (inactivo)

    const now = new Date().toISOString();

    const adminUser: User = {
      id: adminId,
      nombre: 'Dra. Elena Vega',
      email: 'admin@docuguard.com',
      password_hash: hashPassword('Admin123!*'),
      rol: 'ADMIN',
      activo: true,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    };

    const carlosUser: User = {
      id: user1Id,
      nombre: 'Ing. Carlos Mendoza',
      email: 'carlos.mendoza@empresa.com',
      password_hash: hashPassword('User123!*'),
      rol: 'USER',
      activo: true,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    };

    const sofiaUser: User = {
      id: user2Id,
      nombre: 'Lic. Sofía Valdez',
      email: 'sofia.valdez@empresa.com',
      password_hash: hashPassword('User123!*'),
      rol: 'USER',
      activo: true,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    };

    const pedroUser: User = {
      id: user3Id,
      nombre: 'Pedro Ramírez',
      email: 'pedro.inactivo@empresa.com',
      password_hash: hashPassword('User123!*'),
      rol: 'USER',
      activo: false,
      failed_login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(carlosUser.id, carlosUser);
    this.users.set(sofiaUser.id, sofiaUser);
    this.users.set(pedroUser.id, pedroUser);

    // 2. Documentos Semilla
    const doc1Id = 'e5000000-0000-0000-0000-000000000001';
    const doc2Id = 'e5000000-0000-0000-0000-000000000002';
    const doc3Id = 'e5000000-0000-0000-0000-000000000003';
    const doc4Id = 'e5000000-0000-0000-0000-000000000004';
    const doc5Id = 'e5000000-0000-0000-0000-000000000005';

    const contentDoc1 = `# Plan Estratégico Corporativo Q3-Q4 2026\n\n## 1. Visión y Objetivos\nEl objetivo de este trimestre es consolidar la infraestructura cloud y mitigar vectores de riesgo identificados en la última auditoría ISO 27001.\n\n### Hitos Clave:\n- Migración al stack PostgreSQL 16 con cifrado en reposo.\n- Implementación de RBAC estricto con mitigación IDOR.\n- Automatización de rotación de tokens JWT en cookies HttpOnly.\n\n## 2. Presupuesto Asignado\nPresupuesto operativo aprobado: **$145,000 USD** para infraestructura y capacitación de equipos DevSecOps.`;

    const contentDoc2 = `# Manual de Políticas de Seguridad de la Información (ISO 27001)\n\n## Control de Acceso (A.9)\n1. **Principio de Privilegio Mínimo**: Los usuarios solo accederán a los recursos estrictamente necesarios.\n2. **Defensa en Profundidad**: Todo endpoint de la API debe verificar la asignación en base de datos; la falta de asignación debe responder con código HTTP 404 para evitar filtración de existencia.\n3. **Criptografía**: Argon2id o PBKDF2 (>=100k iteraciones) para contraseñas de usuarios.`;

    const contentDoc3 = `# Reporte Confidencial de Auditoría Financiera 2026\n\n**DOCUMENTO DE ACCESO RESTRINGIDO - SOLO AUDITORÍA**\n\n## Resumen Ejecutivo de Flujo de Caja\n- Ingresos brutos consolidados: $4,200,000 USD.\n- Pasivos contingentes mitigados: 12%.\n- Hallazgos fiscales: Ninguna discrepancia material reportada.\n\n*Nota: Este documento está asignado exclusivamente a Sofía Valdez. Cualquier intento de consulta no autorizado debe fallar con 404.*`;

    const contentDoc4 = `# Especificación de Arquitectura de Microservicios\n\n## Diagrama de Topología\n- Gateway perimetral con Rate Limiting distribuido (5 req/15 min en autenticación).\n- Capa de datos con réplicas de lectura y pool de conexiones PgBouncer.\n- Almacenamiento no público de objetos mediante MinIO S3 con firmas pre-autenticadas.`;

    const contentDoc5 = `# Borrador de Contrato Marco de Proveedores Cloud\n\n## Cláusula de Confidencialidad y SLA\n- Disponibilidad mínima garantizada del 99.95%.\n- Penalización del 5% de la facturación mensual por cada 30 minutos de caída no programada.\n- Notificación de incidentes de seguridad en un plazo máximo de 4 horas hábiles.`;

    const doc1: Document = {
      id: doc1Id,
      titulo: 'Plan Estratégico Q3-Q4 2026.md',
      descripcion: 'Lineamientos operativos, presupuestos y metas estratégicas para el segundo semestre.',
      categoria: 'Estrategia',
      ruta_archivo: `/vault/${doc1Id}/v1.md`,
      mime_type: 'text/markdown',
      tamano_bytes: Buffer.byteLength(contentDoc1),
      version_actual: 1,
      created_by: adminId,
      created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    };

    const doc2: Document = {
      id: doc2Id,
      titulo: 'Manual de Políticas de Seguridad ISO 27001.md',
      descripcion: 'Controles normativos, políticas de acceso y directrices criptográficas obligatorias.',
      categoria: 'Seguridad',
      ruta_archivo: `/vault/${doc2Id}/v2.md`,
      mime_type: 'text/markdown',
      tamano_bytes: Buffer.byteLength(contentDoc2),
      version_actual: 2,
      created_by: adminId,
      created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    };

    const doc3: Document = {
      id: doc3Id,
      titulo: 'Auditoría Financiera Confidencial 2026.md',
      descripcion: 'Dictamen de balance y estados contables para junta directiva.',
      categoria: 'Finanzas',
      ruta_archivo: `/vault/${doc3Id}/v1.md`,
      mime_type: 'text/markdown',
      tamano_bytes: Buffer.byteLength(contentDoc3),
      version_actual: 1,
      created_by: adminId,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    };

    const doc4: Document = {
      id: doc4Id,
      titulo: 'Arquitectura de Sistemas y Cloud v2.md',
      descripcion: 'Topología de red, gateway perimetral y mecanismos de resiliencia.',
      categoria: 'Tecnología',
      ruta_archivo: `/vault/${doc4Id}/v1.md`,
      mime_type: 'text/markdown',
      tamano_bytes: Buffer.byteLength(contentDoc4),
      version_actual: 1,
      created_by: adminId,
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    };

    const doc5: Document = {
      id: doc5Id,
      titulo: 'Borrador Contrato de Proveedores.md',
      descripcion: 'Documento en borrador no asignado a ningún usuario general.',
      categoria: 'Legal',
      ruta_archivo: `/vault/${doc5Id}/v1.md`,
      mime_type: 'text/markdown',
      tamano_bytes: Buffer.byteLength(contentDoc5),
      version_actual: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    };

    this.documents.set(doc1.id, doc1);
    this.documents.set(doc2.id, doc2);
    this.documents.set(doc3.id, doc3);
    this.documents.set(doc4.id, doc4);
    this.documents.set(doc5.id, doc5);

    // 3. Versiones de Documentos
    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000001',
      document_id: doc1Id,
      numero_version: 1,
      ruta_archivo: `/vault/${doc1Id}/v1.md`,
      contenido: contentDoc1,
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Versión inicial aprobada por dirección',
      created_at: doc1.created_at,
    });

    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000002',
      document_id: doc2Id,
      numero_version: 1,
      ruta_archivo: `/vault/${doc2Id}/v1.md`,
      contenido: '# Manual de Seguridad preliminar...',
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Borrador preliminar',
      created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    });

    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000003',
      document_id: doc2Id,
      numero_version: 2,
      ruta_archivo: `/vault/${doc2Id}/v2.md`,
      contenido: contentDoc2,
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Actualización con controles ISO 27001 y políticas anti-IDOR',
      created_at: doc2.updated_at,
    });

    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000004',
      document_id: doc3Id,
      numero_version: 1,
      ruta_archivo: `/vault/${doc3Id}/v1.md`,
      contenido: contentDoc3,
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Informe auditado',
      created_at: doc3.created_at,
    });

    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000005',
      document_id: doc4Id,
      numero_version: 1,
      ruta_archivo: `/vault/${doc4Id}/v1.md`,
      contenido: contentDoc4,
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Especificación inicial',
      created_at: doc4.created_at,
    });

    this.versions.push({
      id: 'f1000000-0000-0000-0000-000000000006',
      document_id: doc5Id,
      numero_version: 1,
      ruta_archivo: `/vault/${doc5Id}/v1.md`,
      contenido: contentDoc5,
      editado_por: adminId,
      editor_nombre: 'Dra. Elena Vega',
      nota_cambio: 'Borrador inicial confidencial',
      created_at: doc5.created_at,
    });

    // 4. Asignaciones de Control de Acceso (RBAC + Anti-IDOR)
    // Carlos Mendoza:
    // - Doc 1: EDIT (puede ver y editar con control optimista)
    // - Doc 2: READ (solo lectura, intento de guardar devuelve 403)
    // - Doc 3: NO ASIGNADO (intento de acceso devuelve 404 anti-IDOR)
    const assign1: Assignment = {
      id: 'g1000000-0000-0000-0000-000000000001',
      user_id: user1Id,
      user_nombre: carlosUser.nombre,
      user_email: carlosUser.email,
      document_id: doc1Id,
      document_titulo: doc1.titulo,
      permiso: 'EDIT',
      assigned_by: adminId,
      created_at: now,
      updated_at: now,
    };

    const assign2: Assignment = {
      id: 'g1000000-0000-0000-0000-000000000002',
      user_id: user1Id,
      user_nombre: carlosUser.nombre,
      user_email: carlosUser.email,
      document_id: doc2Id,
      document_titulo: doc2.titulo,
      permiso: 'READ',
      assigned_by: adminId,
      created_at: now,
      updated_at: now,
    };

    // Sofía Valdez:
    // - Doc 2: READ
    // - Doc 3: EDIT (Confidencial, solo Sofía)
    // - Doc 4: READ
    const assign3: Assignment = {
      id: 'g1000000-0000-0000-0000-000000000003',
      user_id: user2Id,
      user_nombre: sofiaUser.nombre,
      user_email: sofiaUser.email,
      document_id: doc2Id,
      document_titulo: doc2.titulo,
      permiso: 'READ',
      assigned_by: adminId,
      created_at: now,
      updated_at: now,
    };

    const assign4: Assignment = {
      id: 'g1000000-0000-0000-0000-000000000004',
      user_id: user2Id,
      user_nombre: sofiaUser.nombre,
      user_email: sofiaUser.email,
      document_id: doc3Id,
      document_titulo: doc3.titulo,
      permiso: 'EDIT',
      assigned_by: adminId,
      created_at: now,
      updated_at: now,
    };

    const assign5: Assignment = {
      id: 'g1000000-0000-0000-0000-000000000005',
      user_id: user2Id,
      user_nombre: sofiaUser.nombre,
      user_email: sofiaUser.email,
      document_id: doc4Id,
      document_titulo: doc4.titulo,
      permiso: 'READ',
      assigned_by: adminId,
      created_at: now,
      updated_at: now,
    };

    this.assignments.set(assign1.id, assign1);
    this.assignments.set(assign2.id, assign2);
    this.assignments.set(assign3.id, assign3);
    this.assignments.set(assign4.id, assign4);
    this.assignments.set(assign5.id, assign5);

    // 5. Registros de Auditoría Iniciales
    this.recordAuditLog(adminId, 'SYSTEM_INIT', 'system', 'root', '127.0.0.1', {
      message: 'Plataforma DocuGuard inicializada con políticas de seguridad OWASP',
    });
    this.recordAuditLog(adminId, 'DOCUMENT_ASSIGNED', 'assignments', assign1.id, '127.0.0.1', {
      user: carlosUser.email,
      document: doc1.titulo,
      permiso: 'EDIT',
    });
    this.recordAuditLog(adminId, 'DOCUMENT_ASSIGNED', 'assignments', assign4.id, '127.0.0.1', {
      user: sofiaUser.email,
      document: doc3.titulo,
      permiso: 'EDIT',
    });
  }

  public recordAuditLog(
    userId: string | null,
    accion: string,
    entidad: string,
    entidadId: string | null,
    ip: string,
    metadata: Record<string, unknown> = {}
  ): AuditLog {
    const user = userId ? this.users.get(userId) : null;
    const log: AuditLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      user_email: user?.email,
      user_nombre: user?.nombre,
      accion,
      entidad,
      entidad_id: entidadId,
      ip,
      metadata,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log); // Lo más reciente primero
    return log;
  }

  // Búsqueda de asignación por usuario y documento
  public findAssignment(userId: string, documentId: string): Assignment | undefined {
    for (const assignment of this.assignments.values()) {
      if (assignment.user_id === userId && assignment.document_id === documentId) {
        return assignment;
      }
    }
    return undefined;
  }

  // Obtener la versión más reciente o específica de un documento
  public getLatestContent(documentId: string): { content: string; version: number } {
    const docVersions = this.versions
      .filter((v) => v.document_id === documentId)
      .sort((a, b) => b.numero_version - a.numero_version);

    if (docVersions.length === 0) {
      return { content: '', version: 0 };
    }

    return {
      content: docVersions[0].contenido,
      version: docVersions[0].numero_version,
    };
  }
}

export const db = new DataStore();
