import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Verificar sesión existente al cargar la aplicación
  const refreshProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Credenciales inválidas' };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión con el servidor de autenticación.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.rol === 'ADMIN';
  const isUser = user?.rol === 'USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshProfile,
        isAdmin,
        isUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
