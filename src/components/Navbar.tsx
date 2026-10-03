import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, LogOut, User as UserIcon, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  onOpenSecurityTests?: () => void;
  activeView: 'landing' | 'login' | 'dashboard' | 'admin';
  setActiveView: (view: 'landing' | 'login' | 'dashboard' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSecurityTests, activeView, setActiveView }) => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    setActiveView('landing');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark with brand identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(user ? (isAdmin ? 'admin' : 'dashboard') : 'landing')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-colors">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-slate-800 transition-colors">
                DocuGuard
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono text-slate-500">
                RBAC Vault
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {!user ? (
            <>
              <button
                onClick={() => setActiveView('landing')}
                className={`hover:text-slate-900 transition-colors ${activeView === 'landing' ? 'text-slate-900 font-semibold' : ''}`}
              >
                Inicio
              </button>
              <button
                onClick={onOpenSecurityTests}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditoría Anti-IDOR</span>
              </button>
            </>
          ) : (
            <>
              {isAdmin ? (
                <>
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`hover:text-slate-900 transition-colors ${activeView === 'admin' ? 'text-slate-900 font-semibold' : ''}`}
                  >
                    Panel Administrador
                  </button>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`hover:text-slate-900 transition-colors ${activeView === 'dashboard' ? 'text-slate-900 font-semibold' : ''}`}
                  >
                    Vista Documentos
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`hover:text-slate-900 transition-colors ${activeView === 'dashboard' ? 'text-slate-900 font-semibold' : ''}`}
                >
                  Mis Documentos Asignados
                </button>
              )}
              <button
                onClick={onOpenSecurityTests}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verificar Seguridad (Live)</span>
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Primary actions & User status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.nombre}
                </span>
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  {user.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión segura"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setActiveView('login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
              >
                Acceder al Portal
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
