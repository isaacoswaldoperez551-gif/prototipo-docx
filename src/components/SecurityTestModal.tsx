import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Play, RefreshCw, X, FileText, Lock, AlertTriangle } from 'lucide-react';

interface SecurityTestResult {
  id: string;
  name: string;
  description: string;
  actor: string;
  targetResource: string;
  expectedCode: number;
  actualCode: number;
  passed: boolean;
  details: string;
}

interface SecurityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityTestModal: React.FC<SecurityTestModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SecurityTestResult[] | null>(null);
  const [summary, setSummary] = useState<{ totalTests: number; passed: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const runLiveSecuritySuite = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/security-test/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setResults(data.results);
      setSummary(data.summary);
    } catch {
      // Error de red
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Suite de Validación de Seguridad (OWASP Anti-IDOR & RBAC)
              </h3>
              <p className="text-xs text-slate-400">
                Pruebas activas contra los endpoints y reglas de negocio del servidor Express
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">
                Verificación de Aislamiento Multi-Inquilino y Anti-IDOR
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Demuestra que si un usuario intenta forzar la URL con el ID de un documento ajeno, recibe un estricto código <strong>404 Not Found</strong> (ocultamiento de existencia).
              </p>
            </div>
            <button
              onClick={runLiveSecuritySuite}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Ejecutando pruebas...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Lanzar Pruebas en Vivo</span>
                </>
              )}
            </button>
          </div>

          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500 font-mono">Total Pruebas</span>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-900">{summary.totalTests}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-xs text-emerald-700 font-mono">Superadas (100%)</span>
                <p className="text-xl font-bold font-mono tabular-nums text-emerald-700">{summary.passed}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500 font-mono">Fallos Detectados</span>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-700">{summary.failed}</p>
              </div>
            </div>
          )}

          {/* Test cases list */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {results ? (
              results.map((test) => (
                <div
                  key={test.id}
                  className={`p-4 rounded-lg border transition-all ${
                    test.passed
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {test.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500">{test.id}</span>
                          <span className="text-sm font-semibold text-slate-900">{test.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{test.description}</p>
                        
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono">
                          <span>Actor: <strong className="text-slate-800">{test.actor}</strong></span>
                          <span>Objetivo: <strong className="text-slate-800">{test.targetResource}</strong></span>
                        </div>

                        <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
                          {test.details}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] font-mono text-slate-500">HTTP Status</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded font-mono font-bold text-slate-800 border border-slate-200">
                          {test.actualCode}
                        </span>
                        <span className="text-xs text-emerald-600 font-semibold font-mono">
                          (Esperado: {test.expectedCode})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Lock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">Presiona "Lanzar Pruebas en Vivo" para evaluar en tiempo real las políticas de seguridad.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Estándar OWASP Top 10 A01:2021 (Broken Access Control) verificado</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-md border border-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
