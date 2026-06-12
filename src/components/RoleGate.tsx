import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { usePermissions, type Role } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGateProps {
  /** User must hold one of these roles to see the children. */
  allow?: Role[];
  /** User must have role >= this minimum. Overrides `allow` if both are passed. */
  minimumRole?: Role;
  /** What to render when the user lacks permission. Defaults to a 403 panel. */
  fallback?: ReactNode;
  /** If true, redirect to login on missing permission instead of showing fallback. */
  redirectOnDenied?: boolean;
  children: ReactNode;
}

/**
 * Wrapper that hides children when the current user lacks the required role.
 * Use it for route content (with the default 403 fallback) and for hiding
 * action buttons inline. For pure styling / disabled-state UX, prefer
 * usePermissions().can.* directly.
 */
export function RoleGate({
  allow,
  minimumRole,
  fallback,
  redirectOnDenied,
  children,
}: RoleGateProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { atLeast, has } = usePermissions();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return redirectOnDenied
      ? <Navigate to="/login" replace />
      : <>{fallback ?? <ForbiddenPanel reason="login_required" />}</>;
  }

  const allowed = minimumRole ? atLeast(minimumRole) : (allow ? has(...allow) : true);
  if (!allowed) {
    return <>{fallback ?? <ForbiddenPanel />}</>;
  }

  return <>{children}</>;
}

function ForbiddenPanel({ reason }: { reason?: 'login_required' }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="glass rounded-xl p-8 max-w-md text-center">
        <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          {reason === 'login_required' ? 'Inicia sesión' : 'Acceso restringido'}
        </h2>
        <p className="text-sm text-gray-400 mb-2">
          {reason === 'login_required'
            ? 'Esta vista requiere una sesión activa.'
            : 'Tu rol actual no permite ver esta sección.'}
        </p>
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Contacta a un administrador si crees que es un error.
        </p>
      </div>
    </div>
  );
}
