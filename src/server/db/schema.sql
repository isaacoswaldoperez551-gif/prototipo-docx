-- ==============================================================================
-- DOCUGUARD - ESQUEMA DE BASE DE DATOS POSTGRESQL 16 (DDL)
-- Arquitectura de Seguridad RBAC, Anti-IDOR, Versionado y Auditoría
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipos ENUM personalizados
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assignment_permission AS ENUM ('READ', 'EDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol user_role NOT NULL DEFAULT 'USER',
    activo BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) NOT NULL DEFAULT 'General',
    ruta_archivo VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL DEFAULT 0,
    version_actual INT NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE RESTRICT
);

-- 5. Tabla: document_versions
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    numero_version INT NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    editado_por UUID NOT NULL,
    nota_cambio VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_versions_document FOREIGN KEY (document_id) 
        REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_versions_user FOREIGN KEY (editado_por) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_document_version UNIQUE (document_id, numero_version)
);

-- 6. Tabla: assignments (Permisos por usuario y documento)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_id UUID NOT NULL,
    permiso assignment_permission NOT NULL DEFAULT 'READ',
    assigned_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_document FOREIGN KEY (document_id) 
        REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_user_document_assignment UNIQUE (user_id, document_id)
);

-- 7. Tabla: refresh_tokens (Tokens de refresco rotativos y revocables)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 del token opaco
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Tabla: audit_logs (Bitácora de seguridad inmutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(64) NULL,
    ip VARCHAR(45) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- ==============================================================================
-- ÍNDICES ESTRATÉGICOS PARA RENDIMIENTO Y SEGURIDAD ANTI-IDOR
-- ==============================================================================

-- 1. Búsqueda y verificación ultrarrápida de asignaciones (Clave en middleware Anti-IDOR)
CREATE INDEX IF NOT EXISTS idx_assignments_user_doc_perm 
    ON assignments (user_id, document_id, permiso);

CREATE INDEX IF NOT EXISTS idx_assignments_document_id 
    ON assignments (document_id);

-- 2. Filtrado y ordenación de documentos por usuario y estado
CREATE INDEX IF NOT EXISTS idx_documents_categoria 
    ON documents (categoria);

CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON documents (created_at DESC);

-- 3. Historial de versiones ordenado
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_ver 
    ON document_versions (document_id, numero_version DESC);

-- 4. Validación rápida de refresh tokens activos
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash_active 
    ON refresh_tokens (token_hash) 
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
    ON refresh_tokens (user_id);

-- 5. Búsqueda y filtrado de auditoría forense
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_accion 
    ON audit_logs (user_id, accion);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entidad 
    ON audit_logs (entidad, entidad_id);

-- 6. Trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
