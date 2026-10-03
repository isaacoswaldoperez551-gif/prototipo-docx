import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (role: 'ADMIN' | 'USER') => void;
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBackToLanding }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor ingresa tanto el correo electrónico como la contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Determinar redirección por rol
      if (email.toLowerCase().includes('admin')) {
        onSuccess('ADMIN');
      } else {
        onSuccess('USER');
      }
    } else {
      setErrorMessage(result.error || 'Credenciales inválidas.');
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="p-8 pb-6 text-center bg-slate-900 text-white relative">
          <button
            onClick={onBackToLanding}
            className="absolute top-4 left-4 text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Volver
          </button>
          
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Acceso Seguro DocuGuard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Autenticación protegida con Hash Argon2/PBKDF2 y JWT en Cookies HttpOnly
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Correo Electrónico Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 block">
                Contraseña
              </label>
              <span className="text-[11px] text-slate-400">Min. 8 caracteres</span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión Segura</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill Buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">
              Rellenar credenciales de prueba:
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillCredentials('admin@docuguard.com', 'Admin123!*')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-400 rounded-lg text-left text-slate-800 transition-colors shadow-2xs"
            >
              <span className="block font-bold text-slate-900">Admin</span>
              <span className="text-[10px] text-slate-500 truncate block">admin@docuguard.com</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('carlos.mendoza@empresa.com', 'User123!*')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-400 rounded-lg text-left text-slate-800 transition-colors shadow-2xs"
            >
              <span className="block font-bold text-slate-900">Carlos (User A)</span>
              <span className="text-[10px] text-slate-500 truncate block">carlos.mendoza@...</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('sofia.valdez@empresa.com', 'User123!*')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-400 rounded-lg text-left text-slate-800 transition-colors shadow-2xs"
            >
              <span className="block font-bold text-slate-900">Sofía (User B)</span>
              <span className="text-[10px] text-slate-500 truncate block">sofia.valdez@...</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('pedro.inactivo@empresa.com', 'User123!*')}
              className="p-2 bg-white border border-red-200 hover:border-red-400 rounded-lg text-left text-red-900 transition-colors shadow-2xs"
            >
              <span className="block font-bold text-red-700">Pedro (Inactivo)</span>
              <span className="text-[10px] text-red-500 truncate block">Prueba bloqueo 401</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Rate limiting activo: 5 intentos fallidos bloquean por 15 min.</span>
          </div>

        </div>

      </div>

    </div>
  );
};
