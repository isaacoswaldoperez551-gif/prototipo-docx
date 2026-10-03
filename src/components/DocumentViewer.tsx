import React from 'react';
import { X, FileText, Calendar, HardDrive, Shield, Edit3, ArrowLeft } from 'lucide-react';
import { simpleMarkdownToHtml } from '../utils/sanitize.ts';

interface DocumentViewerProps {
  document: {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: string;
    version_actual: number;
    tamano_bytes: number;
    updated_at: string;
    permiso: 'READ' | 'EDIT';
  } | null;
  content: string;
  onClose: () => void;
  onEdit?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  content,
  onClose,
  onEdit,
}) => {
  if (!document) return null;

  const htmlContent = simpleMarkdownToHtml(content);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{document.titulo}</h3>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                  v{document.version_actual}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>{document.categoria}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{(document.tamano_bytes / 1024).toFixed(1)} KB</span>
                <span aria-hidden="true">·</span>
                <span>Actualizado: {new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.permiso === 'EDIT' && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Abrir en Editor</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-8 overflow-y-auto flex-1 prose prose-slate max-w-none bg-white">
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Permiso asignado: <strong>{document.permiso === 'EDIT' ? 'Lectura y Edición (EDIT)' : 'Solo Lectura (READ)'}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium"
          >
            Cerrar Visor
          </button>
        </div>

      </div>
    </div>
  );
};
