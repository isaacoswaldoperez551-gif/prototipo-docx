import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Clock, 
  AlertTriangle, 
  Check, 
  ArrowLeft, 
  History, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Quote, 
  Code, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

interface VersionItem {
  id: string;
  numeroVersion: number;
  editadoPor: string;
  notaCambio?: string;
  createdAt: string;
  tamanoBytes: number;
}

interface DocumentEditorProps {
  documentId: string;
  onBack: () => void;
  onSavedNotification?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentId,
  onBack,
  onSavedNotification,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState<number>(1);
  const [permiso, setPermiso] = useState<'READ' | 'EDIT'>('READ');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [changeNote, setChangeNote] = useState('');
  const [conflictData, setConflictData] = useState<{
    serverVersion: number;
    latestContent: string;
  } | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // 1. Cargar contenido inicial y versiones
  const fetchDocument = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/content`);
      if (res.status === 404) {
        setErrorMessage('Documento no encontrado o no tiene permisos asignados (404 Anti-IDOR).');
        return;
      }
      if (!res.ok) {
        setErrorMessage('Error al cargar el documento.');
        return;
      }

      const data = await res.json();
      setTitle(data.titulo);
      setContent(data.content);
      setVersion(data.version);
      setPermiso(data.permiso);
      lastSavedContentRef.current = data.content;

      // Cargar historial de versiones
      fetchVersions();
    } catch {
      setErrorMessage('Error de conexión al cargar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
      }
    } catch {
      // Ignorar fallo secundario de versiones
    }
  };

  useEffect(() => {
    fetchDocument();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [documentId]);

  // 2. Guardado manual y con control de concurrencia optimista
  const handleSave = async (isAutoSave = false) => {
    if (permiso !== 'EDIT') {
      setErrorMessage('No tienes permiso de edición para este documento (solo lectura).');
      return;
    }

    if (content === lastSavedContentRef.current && isAutoSave) {
      return;
    }

    if (!isAutoSave) setSaving(true);
    else setAutoSaveStatus('saving');

    setErrorMessage(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          version, // Versión base enviada para verificar optimismo
          changeNote: changeNote.trim() || (isAutoSave ? 'Autoguardado automático' : 'Actualización manual'),
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // CONFLICTO DETECTADO: Concurrencia Optimista
        setConflictData({
          serverVersion: data.serverVersion,
          latestContent: data.latestContent,
        });
        setAutoSaveStatus('error');
        setErrorMessage('Conflicto de concurrencia detectado (HTTP 409): Otro usuario actualizó este documento.');
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Error al guardar el documento.');
        setAutoSaveStatus('error');
        return;
      }

      // Guardado exitoso: actualizar versión local
      setVersion(data.version);
      lastSavedContentRef.current = content;
      setChangeNote('');
      setConflictData(null);
      setAutoSaveStatus('saved');
      fetchVersions();

      if (onSavedNotification) onSavedNotification();

      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch {
      setErrorMessage('Error de red al guardar el documento.');
      setAutoSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // 3. Autoguardado con debounce (3 segundos de inactividad)
  const handleContentChange = (newText: string) => {
    setContent(newText);

    if (permiso !== 'EDIT') return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 3000);
  };

  // 4. Inserción de formato Markdown rápido
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
    }, 50);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
        <p className="text-sm font-medium">Cargando documento y verificando permisos en servidor...</p>
      </div>
    );
  }

  if (errorMessage && !title) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <ShieldAlert className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-900 mb-1">Acceso Restringido</h3>
        <p className="text-sm text-red-700 mb-4">{errorMessage}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          Volver a Mis Documentos
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col min-h-[750px]">
      
      {/* Top action bar */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                Versión actual: v{version}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                  permiso === 'EDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {permiso === 'EDIT' ? 'Modo Edición Habilitado' : 'Solo Lectura'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Control de Concurrencia Optimista Activo</span>
              <span aria-hidden="true">·</span>
              {autoSaveStatus === 'saving' && (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Autoguardando...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cambios sincronizados
                </span>
              )}
              {autoSaveStatus === 'idle' && <span>Autoguardado cada 3 segundos tras editar</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Versiones ({versions.length})</span>
          </button>

          {permiso === 'EDIT' && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guardar Versión</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* CONFLICT 409 BANNER (Concurrencia Optimista) */}
      {conflictData && (
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-amber-900">
                ¡Conflicto de Concurrencia Optimista Detectado (HTTP 409)!
              </h4>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Mientras editabas la versión <strong>v{version}</strong>, otro usuario guardó cambios y actualizó el documento a la versión <strong>v{conflictData.serverVersion}</strong> en el servidor.
                Para evitar sobrescrituras destructivas accidentales, el servidor rechazó el guardado automático.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setContent(conflictData.latestContent);
                    setVersion(conflictData.serverVersion);
                    setConflictData(null);
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-xs"
                >
                  Cargar y Fusionar Versión más Reciente (v{conflictData.serverVersion})
                </button>
                <button
                  onClick={() => {
                    // Forzar sobrescritura actualizando la versión base al número nuevo del servidor
                    setVersion(conflictData.serverVersion);
                    setConflictData(null);
                  }}
                  className="px-3 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold rounded"
                >
                  Continuar con mi versión (Aceptar v{conflictData.serverVersion} como base)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && !conflictData && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs text-red-700 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Markdown formatting toolbar (if EDIT permission) */}
      {permiso === 'EDIT' && (
        <div className="px-6 py-2 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => insertFormatting('**', '**')}
            title="Negrita"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*')}
            title="Cursiva"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <button
            onClick={() => insertFormatting('# ')}
            title="Encabezado 1"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('## ')}
            title="Encabezado 2"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <button
            onClick={() => insertFormatting('- ')}
            title="Lista con viñetas"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('> ')}
            title="Cita"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('```\n', '\n```')}
            title="Bloque de código"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Nota de versión:</span>
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Ej. Revisión cláusula de seguridad..."
              className="px-2.5 py-1 text-xs border border-slate-200 rounded w-64 focus:outline-hidden focus:border-slate-400"
            />
          </div>
        </div>
      )}

      {/* Main editor split view */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Editor text area */}
        <div className="flex-1 flex flex-col p-6 border-r border-slate-200">
          <label className="text-xs font-semibold text-slate-500 mb-2 font-mono uppercase">
            {permiso === 'EDIT' ? 'Editor de Contenido (Markdown)' : 'Visor Solo Lectura'}
          </label>
          <textarea
            ref={textareaRef}
            readOnly={permiso !== 'EDIT'}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Escribe el contenido del documento en formato Markdown..."
            className={`flex-1 w-full p-4 font-mono text-sm leading-relaxed border rounded-lg focus:outline-hidden resize-none ${
              permiso === 'EDIT'
                ? 'bg-slate-50/50 border-slate-200 focus:border-slate-400 focus:bg-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
            }`}
          />
        </div>

        {/* History drawer sidebar */}
        {showHistory && (
          <div className="w-80 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">
                Historial de Versiones
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Inmutable</span>
            </div>

            <div className="space-y-3">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className={`p-3 rounded-lg border text-xs ${
                    ver.numeroVersion === version
                      ? 'bg-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 font-mono">v{ver.numeroVersion}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(ver.createdAt).toLocaleDateString()} {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 italic text-[11px] mb-1">
                    "{ver.notaCambio || 'Sin notas de cambio'}"
                  </p>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Editor: <strong>{ver.editadoPor}</strong></span>
                    <span className="font-mono tabular-nums">{(ver.tamanoBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
