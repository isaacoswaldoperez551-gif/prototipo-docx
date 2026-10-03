import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER';
  fallbackToLogin: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallbackToLogin,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Autenticación Requerida</h2>
        <p className="text-sm text-slate-600 max-w-sm mx-auto">
          Debes iniciar sesión con una cuenta autorizada para acceder a los documentos protegidos.
        </p>
        <button
          onClick={fallbackToLogin}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
        >
          Ir al Inicio de Sesión
        </button>
      </div>
    );
  }

  if (requiredRole && user.rol !== requiredRole) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-red-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acceso Denegado (RBAC)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Tu rol actual (<strong>{user.rol}</strong>) no posee privilegios para visualizar esta sección. Se requiere el rol <strong>{requiredRole}</strong>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
