import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  KeyRound, 
  Users, 
  GitBranch, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  Clock, 
  FileCode2, 
  Database 
} from 'lucide-react';
import heroVaultImage from '../assets/images/docuguard_hero_vault_1791063457580.jpg';

interface LandingPageProps {
  onLoginClick: () => void;
  onOpenSecurityTests: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onOpenSecurityTests }) => {
  return (
    <div className="space-y-16 py-8">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          
          <div className="p-8 sm:p-12 lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="font-semibold text-slate-900">DocuGuard Vault</span>
              <span aria-hidden="true">·</span>
              <span>ISO/IEC 27001</span>
              <span aria-hidden="true">·</span>
              <span>OWASP Top 10 A01 Enforced</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Gestión Documental con Acceso Controlado por Roles y Blindaje Anti-IDOR
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Plataforma empresarial de almacenamiento confidencial donde los usuarios únicamente pueden visualizar y editar los documentos expresamente asignados por el administrador. Protegida contra referencias directas a objetos inseguras, colisiones de concurrencia y fugas de datos.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
              >
                <span>Acceder a la Plataforma</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={onOpenSecurityTests}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors"
              >
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Auditar Anti-IDOR (Live)</span>
              </button>
            </div>

            {/* Proof metrics adjacent to claims */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-left">
              <div>
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">404</span>
                <p className="text-xs text-slate-500 mt-0.5">Ocultamiento de recursos no asignados (Anti-IDOR)</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">15 min</span>
                <p className="text-xs text-slate-500 mt-0.5">Vida corta de JWT con rotación estricta de cookies</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">100%</span>
                <p className="text-xs text-slate-500 mt-0.5">Trazabilidad inmutable de auditoría y versiones</p>
              </div>
            </div>

          </div>

          <div className="lg:col-span-5 h-72 sm:h-96 lg:h-full min-h-[380px] relative overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src={heroVaultImage}
              alt="Bóveda de seguridad criptográfica y gestión documental DocuGuard"
              className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700 text-white text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-mono">Vault Storage: PostgreSQL 16 + MinIO S3</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Activo</span>
            </div>
          </div>

        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Pilares de Seguridad y Arquitectura de Datos
          </h2>
          <p className="text-sm text-slate-600">
            Diseñado bajo el principio de privilegio mínimo y defensa en profundidad de acuerdo al estándar OWASP Top 10.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Autorización a Nivel de Objeto (Anti-IDOR)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada petición a un documento verifica la existencia de una asignación en base de datos para el usuario solicitante. Si el recurso no está asignado, el servidor responde con <strong>HTTP 404 (Not Found)</strong> y jamás 403, impidiendo a cualquier atacante deducir qué identificadores existen.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
              <GitBranch className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Control de Concurrencia Optimista (409)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El editor integrado envía la versión base que el usuario está editando. Si otro usuario con permisos de edición modificó el documento entretanto, el servidor detecta la colisión y devuelve <strong>HTTP 409 Conflict</strong>, preservando ambas copias sin pérdida de datos.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
              <KeyRound className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Autenticación Segura en Cookies HttpOnly
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tokens JWT de vida corta (15 min) y tokens de refresco rotativos (7 días) emitidos en cookies con directivas <code>HttpOnly</code>, <code>Secure</code> y <code>SameSite=Strict</code>. Ningún token se almacena en <code>localStorage</code>, mitigando ataques de secuestro XSS.
            </p>
          </div>

        </div>
      </section>

      {/* Demo Quick Access Credentials */}
      <section className="p-8 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
              Entorno Demostrativo Pre-Cargado
            </span>
            <h3 className="text-xl sm:text-2xl font-bold">
              Cuentas de Prueba Pre-Configuradas
            </h3>
            <p className="text-xs text-slate-400">
              Haz clic en "Iniciar sesión" o utiliza los siguientes perfiles para verificar el comportamiento de roles y aislamiento:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>Rol ADMIN</span>
                <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300">Total</span>
              </div>
              <p className="text-slate-300">Dra. Elena Vega</p>
              <div className="pt-2 border-t border-slate-700/60 text-slate-400 space-y-0.5">
                <div>Email: <strong className="text-white">admin@docuguard.com</strong></div>
                <div>Pass: <strong className="text-white">Admin123!*</strong></div>
              </div>
              <span className="block text-[11px] text-slate-500 font-sans pt-1">
                CRUD de usuarios, documentos, asignación de permisos READ/EDIT y auditoría.
              </span>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-blue-400 font-bold">
                <span>Rol USER (A)</span>
                <span className="text-[10px] bg-blue-950 px-2 py-0.5 rounded text-blue-300">Asignado</span>
              </div>
              <p className="text-slate-300">Ing. Carlos Mendoza</p>
              <div className="pt-2 border-t border-slate-700/60 text-slate-400 space-y-0.5">
                <div>Email: <strong className="text-white">carlos.mendoza@empresa.com</strong></div>
                <div>Pass: <strong className="text-white">User123!*</strong></div>
              </div>
              <span className="block text-[11px] text-slate-500 font-sans pt-1">
                Tiene asignado Doc 1 (EDIT) y Doc 2 (READ). NO tiene Doc 3 (recibe 404 al pedirlo).
              </span>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-purple-400 font-bold">
                <span>Rol USER (B)</span>
                <span className="text-[10px] bg-purple-950 px-2 py-0.5 rounded text-purple-300">Asignado</span>
              </div>
              <p className="text-slate-300">Lic. Sofía Valdez</p>
              <div className="pt-2 border-t border-slate-700/60 text-slate-400 space-y-0.5">
                <div>Email: <strong className="text-white">sofia.valdez@empresa.com</strong></div>
                <div>Pass: <strong className="text-white">User123!*</strong></div>
              </div>
              <span className="block text-[11px] text-slate-500 font-sans pt-1">
                Tiene asignado Doc 3 "Auditoría Financiera" (EDIT) que Carlos NO puede ver.
              </span>
            </div>

          </div>

          <div className="text-center pt-2">
            <button
              onClick={onLoginClick}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs"
            >
              Ir al Formulario de Autenticación
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
