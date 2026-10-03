import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { UserDashboard } from './pages/UserDashboard.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { SecurityTestModal } from './components/SecurityTestModal.tsx';

function MainApp() {
  const { user, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<'landing' | 'login' | 'dashboard' | 'admin'>('landing');
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Redirección inteligente al iniciar sesión
  useEffect(() => {
    if (user) {
      if (activeView === 'login' || activeView === 'landing') {
        setActiveView(isAdmin ? 'admin' : 'dashboard');
      }
    } else {
      if (activeView === 'dashboard' || activeView === 'admin') {
        setActiveView('landing');
      }
    }
  }, [user, isAdmin]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      
      {/* Top Bar Header Contract */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSecurityTests={() => setShowSecurityModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        
        {activeView === 'landing' && (
          <LandingPage
            onLoginClick={() => setActiveView('login')}
            onOpenSecurityTests={() => setShowSecurityModal(true)}
          />
        )}

        {activeView === 'login' && (
          <LoginPage
            onSuccess={(role) => setActiveView(role === 'ADMIN' ? 'admin' : 'dashboard')}
            onBackToLanding={() => setActiveView('landing')}
          />
        )}

        {activeView === 'dashboard' && (
          <ProtectedRoute fallbackToLogin={() => setActiveView('login')}>
            <UserDashboard />
          </ProtectedRoute>
        )}

        {activeView === 'admin' && (
          <ProtectedRoute requiredRole="ADMIN" fallbackToLogin={() => setActiveView('login')}>
            <AdminDashboard />
          </ProtectedRoute>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">DocuGuard</span>
            <span aria-hidden="true">·</span>
            <span>Sistema de Gestión Documental Seguro con RBAC y Mitigación IDOR</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>PostgreSQL 16</span>
            <span aria-hidden="true">·</span>
            <span>JWT HttpOnly</span>
            <span aria-hidden="true">·</span>
            <span>OWASP Top 10 A01 Enforced</span>
          </div>
        </div>
      </footer>

      {/* Modal de Validación de Seguridad Anti-IDOR en Vivo */}
      <SecurityTestModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
