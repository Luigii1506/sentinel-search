import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, type SignupCredentials } from '@/services/auth';
import type { User, LoginCredentials } from '@/types/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      await authService.login(credentials);
      const userData = await authService.getCurrentUser();
      if (!userData) {
        throw new Error('Failed to load user profile after login');
      }
      setUser(userData);
      toast.success(`Bienvenido${userData.first_name ? `, ${userData.first_name}` : ''}`);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const friendly =
        typeof detail === 'string' ? detail : 'Credenciales inválidas. Intenta nuevamente.';
      toast.error(friendly);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      setIsLoading(true);
      await authService.signup(credentials);
      const userData = await authService.getCurrentUser();
      if (!userData) {
        throw new Error('Failed to load user profile after signup');
      }
      setUser(userData);
      toast.success('Cuenta creada. ¡Bienvenido!');
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'No se pudo crear la cuenta');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      if (!userData) {
        throw new Error('No active session');
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

export default AuthContext;
