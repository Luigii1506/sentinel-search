/**
 * PublicOnlyRoute — mirror of <RoleGate redirectOnDenied>.
 *
 * Wraps routes that should ONLY be visible to anonymous visitors:
 *   /login, /signup, /forgot-password, etc.
 *
 * If the user already has a valid session, redirect to the intended
 * destination (passed via location.state.from) or to "/" as a fallback.
 * This prevents the awkward UX of an authenticated user landing on the
 * login form, filling it in, and getting "Bienvenido" while they were
 * already logged in.
 *
 * Why a dedicated component instead of inlining the redirect in each
 * page: keeps the auth invariant in ONE place. If we later add another
 * guest-only route (forgot-password, magic-link verify, sso-redirect)
 * it inherits the behavior for free.
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PublicOnlyRouteProps {
  children: ReactNode;
  /** Fallback path when location.state.from isn't set. */
  redirectTo?: string;
}

export function PublicOnlyRoute({
  children,
  redirectTo = '/',
}: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While AuthContext is rehydrating from localStorage, render nothing
  // (rather than flashing the login form for a frame before the
  // redirect kicks in).
  if (isLoading) return null;

  if (isAuthenticated) {
    const intended =
      (location.state as { from?: { pathname?: string } })?.from?.pathname ?? redirectTo;
    return <Navigate to={intended} replace />;
  }

  return <>{children}</>;
}
