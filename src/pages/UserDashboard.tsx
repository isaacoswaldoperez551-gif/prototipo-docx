import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Lock, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { DocumentViewer } from '../components/DocumentViewer.tsx';
import { DocumentEditor } from '../components/DocumentEditor.tsx';

interface AssignedDocument {
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
}

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<AssignedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPermission, setSelectedPermission] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Estados modales / editor activo
  const [viewingDoc, setViewingDoc] = useState<AssignedDocument | null>(null);
  const [viewingContent, setViewingContent] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Cargar documentos asignados desde el servidor
  const fetchAssignedDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '6',
      });
      if (search) params.append('q', search);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedPermission !== 'ALL') params.append('permission', selectedPermission);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalDocs(data.pagination.total);
        setCategories(data.categories || []);
      }
    } catch {
      // Error de conexión
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedDocuments();
  }, [page, search, selectedCategory, selectedPermission]);

  const handleOpenViewer = async (doc: AssignedDocument) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/content`);
      if (res.ok) {
        const data = await res.json();
        setViewingContent(data.content);
        setViewingDoc(doc);
      }
    } catch {
      // Error
    }
  };

  // Simulación de prueba Anti-IDOR en vivo
  const handleTestIdor = async () => {
    // Si Carlos pide el documento de Sofía (doc3)
    const fakeOrForeignDocId = 'e5000000-0000-0000-0000-000000000003';
    try {
      const res = await fetch(`/api/documents/${fakeOrForeignDocId}/content`);
      const data = await res.json();
      if (res.status === 404) {
        setNotification(`[Blindaje Anti-IDOR Verificado] El servidor respondió HTTP 404 Not Found al intentar acceder al ID "${fakeOrForeignDocId}". El sistema ocultó la existencia del documento no asignado.`);
      } else {
        setNotification(`Respuesta inesperada: ${res.status}`);
      }
    } catch {
      setNotification('Error de red');
    }
    setTimeout(() => setNotification(null), 8000);
  };

  if (editingDocId) {
    return (
      <div className="py-6">
        <DocumentEditor
          documentId={editingDocId}
          onBack={() => {
            setEditingDocId(null);
            fetchAssignedDocuments();
          }}
          onSavedNotification={() => {
            setNotification('Documento guardado con nueva versión e informado al administrador.');
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      
      {/* Saludo Personalizado Requerido */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-mono text-slate-500 uppercase">Panel de Colaboración</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bienvenido/a, {user?.nombre}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Solo puedes acceder a los documentos que la administración te ha asignado expresamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestIdor}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            title="Prueba forzar URL con ID ajeno para verificar respuesta 404"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Simular Ataque IDOR (Verificar 404)</span>
          </button>
          
          <button
            onClick={fetchAssignedDocuments}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global alert banner */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-mono">{notification}</div>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por título, categoría..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-800"
          />
        </div>

        {/* Filter segment controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Categoría */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:outline-hidden"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Permiso */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
            <span>Permiso:</span>
            <select
              value={selectedPermission}
              onChange={(e) => {
                setSelectedPermission(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:outline-hidden"
            >
              <option value="ALL">Todos los permisos</option>
              <option value="READ">Solo Lectura (READ)</option>
              <option value="EDIT">Edición (EDIT)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Lista de Documentos Asignados */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <p className="text-xs">Consultando asignaciones autorizadas...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
          <FileText className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">No se encontraron documentos asignados</h3>
          <p className="text-xs max-w-sm mx-auto text-slate-500">
            No tienes documentos asignados con los filtros seleccionados, o el administrador aún no te ha concedido permisos sobre ningún archivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                
                {/* Clean unboxed metadata with bullet separators (Zero-pill discipline) */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{doc.categoria}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-medium">v{doc.version_actual}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      doc.permiso === 'EDIT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {doc.permiso === 'EDIT' ? 'Lectura y Edición' : 'Solo Lectura'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 hover:text-slate-800 transition-colors line-clamp-1">
                    {doc.titulo}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {doc.descripcion || 'Sin descripción adicional.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{(doc.tamano_bytes / 1024).toFixed(1)} KB</span>
                  <span>Modif: {new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>

              </div>

              {/* Card Actions */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenViewer(doc)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Visualizar</span>
                </button>

                {doc.permiso === 'EDIT' ? (
                  <button
                    onClick={() => setEditingDocId(doc.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Editar</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Solo Lectura</span>
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          <span>
            Mostrando <strong>{documents.length}</strong> de <strong>{totalDocs}</strong> documentos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Visor Modal */}
      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          content={viewingContent}
          onClose={() => setViewingDoc(null)}
          onEdit={() => {
            const id = viewingDoc.id;
            setViewingDoc(null);
            setEditingDocId(id);
          }}
        />
      )}

    </div>
  );
};
