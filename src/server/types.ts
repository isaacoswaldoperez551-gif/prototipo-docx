import type { Request } from 'express';

export type UserRole = 'ADMIN' | 'USER';
export type AssignmentPermission = 'READ' | 'EDIT';

export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: UserRole;
  activo: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  ruta_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  version_actual: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  numero_version: number;
  ruta_archivo: string;
  contenido: string;
  editado_por: string;
  editor_nombre?: string;
  nota_cambio?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  user_nombre?: string;
  user_email?: string;
  document_id: string;
  document_titulo?: string;
  permiso: AssignmentPermission;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  ip?: string;
  user_agent?: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email?: string;
  user_nombre?: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  ip: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  documentAccess?: {
    document: Document;
    assignment?: Assignment;
    permiso: AssignmentPermission | 'ADMIN';
  };
}
