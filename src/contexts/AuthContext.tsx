import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, type SignupCredentials } from '@/services/auth';
import { tokenManager } from '@/services/api';
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

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getToken();
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to get current user:', error);
          tokenManager.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);
      setUser(response.user);
      toast.success(`Bienvenido, ${response.user.first_name}`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Credenciales inválidas. Intenta nuevamente.');
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
      // Still clear local state even if server fails
      setUser(null);
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      setIsLoading(true);
      await authService.signup(credentials);
      // Backend returned tokens — fetch the freshly created user so the
      // rest of the app sees the right role + permissions immediately.
      const userData = await authService.getCurrentUser();
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
    } catch (error) {
      console.error('Failed to refresh user:', error);
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
