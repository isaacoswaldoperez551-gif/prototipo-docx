import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Users, 
  FileText, 
  Shield, 
  History, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Edit, 
  Lock, 
  Key, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  Eye, 
  CheckCircle2,
  FileCheck2,
  UserPlus
} from 'lucide-react';
import { DocumentViewer } from '../components/DocumentViewer.tsx';

interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'USER';
  activo: boolean;
  createdAt: string;
  assignedCount: number;
}

interface AdminDoc {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  mime_type: string;
  tamano_bytes: number;
  version_actual: number;
  created_at: string;
  updated_at: string;
  assignments: Array<{
    id: string;
    userId: string;
    userNombre: string;
    userEmail: string;
    permiso: 'READ' | 'EDIT';
  }>;
}

interface AssignmentItem {
  id: string;
  user_id: string;
  user_nombre?: string;
  user_email?: string;
  document_id: string;
  document_titulo?: string;
  permiso: 'READ' | 'EDIT';
  created_at: string;
}

interface AuditLogItem {
  id: string;
  user_email?: string;
  user_nombre?: string;
  accion: string;
  entidad: string;
  entidad_id: string;
  ip: string;
  metadata: Record<string, any>;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'documents' | 'assignments' | 'audit'>('users');
  
  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<AdminDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modales
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState<AdminUser | null>(null);

  // Form states: Create User
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');

  // Form states: Create Document
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Estrategia');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  // Form states: Assignment
  const [selectedAssignUser, setSelectedAssignUser] = useState('');
  const [selectedAssignDoc, setSelectedAssignDoc] = useState('');
  const [selectedAssignPerm, setSelectedAssignPerm] = useState<'READ' | 'EDIT'>('READ');

  // Form states: Reset Password
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Visor
  const [previewDoc, setPreviewDoc] = useState<AdminDoc | null>(null);
  const [previewContent, setPreviewContent] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {}
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch {}
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/admin/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } catch {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch {}
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchDocuments(), fetchAssignments(), fetchAuditLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Acciones de Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          rol: newUserRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Usuario creado exitosamente');
        setShowCreateUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers();
        fetchAuditLogs();
      } else {
        alert(data.error || 'Error al crear usuario');
      }
    } catch {}
  };

  const handleToggleUserActive = async (targetUser: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !targetUser.activo }),
      });
      if (res.ok) {
        showNotification(`Estado de ${targetUser.nombre} actualizado.`);
        fetchUsers();
        fetchAuditLogs();
      }
    } catch {}
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPassModal) return;
    try {
      const res = await fetch(`/api/admin/users/${showResetPassModal.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordVal }),
      });
      if (res.ok) {
        showNotification(`Contraseña restablecida para ${showResetPassModal.email}`);
        setShowResetPassModal(null);
        setNewPasswordVal('');
        fetchAuditLogs();
      }
    } catch {}
  };

  // Acciones de Documento
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: newDocTitle,
          descripcion: newDocDesc,
          categoria: newDocCategory,
          contenido: newDocContent || '# Documento Nuevo\n\nContenido confidencial inicial.',
          mimeType: 'text/markdown',
        }),
      });
      if (res.ok) {
        showNotification('Documento guardado y versionado en la bóveda.');
        setShowCreateDocModal(false);
        setNewDocTitle('');
        setNewDocDesc('');
        setNewDocContent('');
        fetchDocuments();
        fetchAuditLogs();
      }
    } catch {}
  };

  // Acciones de Asignación
  const handleAssignDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignUser || !selectedAssignDoc) return;
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAssignUser,
          documentId: selectedAssignDoc,
          permiso: selectedAssignPerm,
        }),
      });
      if (res.ok) {
        showNotification('Permiso de documento asignado exitosamente.');
        setShowAssignModal(false);
        fetchAssignments();
        fetchDocuments();
        fetchUsers();
        fetchAuditLogs();
      }
    } catch {}
  };

  const handleRevokeAssignment = async (id: string) => {
    if (!confirm('¿Seguro que deseas revocar el acceso a este documento para este usuario?')) return;
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Asignación revocada.');
        fetchAssignments();
        fetchDocuments();
        fetchUsers();
        fetchAuditLogs();
      }
    } catch {}
  };

  const handlePreview = async (doc: AdminDoc) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/content`);
      if (res.ok) {
        const data = await res.json();
        setPreviewContent(data.content);
        setPreviewDoc(doc);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 py-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-mono text-slate-500 uppercase">Administración Central</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Panel de Seguridad y Gestión Documental (RBAC)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Gestión centralizada de identidades, almacenamiento seguro, permisos granulares y auditoría forense.
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar Datos</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
            activeTab === 'users'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-slate-500" />
          <span>Usuarios ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
            activeTab === 'documents'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Documentos ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
            activeTab === 'assignments'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-slate-500" />
          <span>Asignaciones y Permisos ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
            activeTab === 'audit'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Bitácora de Auditoría ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USUARIOS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Directorio de Usuarios Corporativos</h3>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo Electrónico</th>
                  <th className="px-4 py-3">Rol RBAC</th>
                  <th className="px-4 py-3">Docs Asignados</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${u.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                      {u.assignedCount} docs
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${u.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.activo ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setShowResetPassModal(u)}
                        title="Resetear contraseña"
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        title={u.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
                        className={`p-1 rounded ${u.activo ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {u.activo ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTOS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Repositorio Central de Archivos Cifrados</h3>
            <button
              onClick={() => setShowCreateDocModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subir Documento</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Tamaño</th>
                  <th className="px-4 py-3">Usuarios Asignados</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                      {d.titulo}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{d.categoria}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">v{d.version_actual}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {(d.tamano_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.assignments.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Sin asignaciones</span>
                        ) : (
                          d.assignments.map((a) => (
                            <span
                              key={a.id}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                a.permiso === 'EDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {a.userNombre.split(' ')[0]} ({a.permiso})
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handlePreview(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASIGNACIONES */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Control de Asignaciones por Archivo</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Regla Anti-IDOR: Si un usuario no está explícitamente listado aquí para un documento, su consulta devolverá 404 Not Found.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Asignar Permiso</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                <tr>
                  <th className="px-4 py-3">Usuario Asignado</th>
                  <th className="px-4 py-3">Documento Autorizado</th>
                  <th className="px-4 py-3">Nivel de Permiso</th>
                  <th className="px-4 py-3">Fecha de Asignación</th>
                  <th className="px-4 py-3 text-right">Revocar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{a.user_nombre}</div>
                      <div className="font-mono text-[11px] text-slate-500">{a.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {a.document_titulo}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          a.permiso === 'EDIT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {a.permiso === 'EDIT' ? 'Lectura y Edición (EDIT)' : 'Solo Lectura (READ)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeAssignment(a.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Revocar asignación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITORÍA */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <h3 className="text-sm font-bold text-slate-900">Registro de Auditoría de Seguridad (Audit Logs)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro inmutable de transacciones, aperturas, modificaciones, bloqueos IDOR e inicios de sesión.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono sticky top-0">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Acción Registrada</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">Dirección IP</th>
                  <th className="px-4 py-3">Metadatos / Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        log.accion.includes('BLOCKED') || log.accion.includes('DENIED')
                          ? 'bg-red-100 text-red-800'
                          : log.accion.includes('CONFLICT')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.user_email || 'Sistema'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.entidad}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {log.ip}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Crear Usuario */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Crear Nuevo Usuario</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej. Ing. Roberto Sánchez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Corporativo</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="roberto.sanchez@empresa.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rol RBAC</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-slate-50"
                >
                  <option value="USER">USER (Acceso restringido por asignación)</option>
                  <option value="ADMIN">ADMIN (Acceso total y configuración)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Subir Documento */}
      {showCreateDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Subir / Crear Documento en Bóveda</h3>
              <button onClick={() => setShowCreateDocModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDoc} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Título del Archivo</label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Ej. Análisis de Riesgos 2026.md"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    placeholder="Seguridad, Legal, Finanzas..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Límite Permitido</label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono">
                    25 MB (PDF, DOCX, MD)
                  </div>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  placeholder="Propósito y alcance del documento"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contenido Inicial (Markdown / Texto)</label>
                <textarea
                  rows={5}
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="# Título del documento..."
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDocModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Almacenar en Bóveda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Asignar Documento */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Asignar Permiso de Documento</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignDocument} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Seleccionar Usuario</label>
                <select
                  required
                  value={selectedAssignUser}
                  onChange={(e) => setSelectedAssignUser(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="">-- Elige un usuario --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Seleccionar Documento</label>
                <select
                  required
                  value={selectedAssignDoc}
                  onChange={(e) => setSelectedAssignDoc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="">-- Elige un documento --</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.titulo} ({d.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nivel de Permiso</label>
                <select
                  value={selectedAssignPerm}
                  onChange={(e) => setSelectedAssignPerm(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="READ">READ (Solo lectura)</option>
                  <option value="EDIT">EDIT (Lectura y modificación con versionado)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {showResetPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Resetear Contraseña</h3>
              <button onClick={() => setShowResetPassModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Restablecerás la clave de acceso de <strong>{showResetPassModal.email}</strong> y se revocarán todas sus sesiones activas.
              </p>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Guardar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor de Documento */}
      {previewDoc && (
        <DocumentViewer
          document={{
            id: previewDoc.id,
            titulo: previewDoc.titulo,
            descripcion: previewDoc.descripcion,
            categoria: previewDoc.categoria,
            version_actual: previewDoc.version_actual,
            tamano_bytes: previewDoc.tamano_bytes,
            updated_at: previewDoc.updated_at,
            permiso: 'EDIT',
          }}
          content={previewContent}
          onClose={() => setPreviewDoc(null)}
        />
      )}

    </div>
  );
};
