import { useAuth } from '@/contexts/AuthContext';

export type Role = 'admin' | 'analyst' | 'reviewer' | 'viewer' | 'readonly';

// Hierarchy: each role inherits the permissions of every role below it.
const ROLE_RANK: Record<Role, number> = {
  admin: 100,
  analyst: 50,
  reviewer: 40,
  viewer: 20,
  readonly: 10,
};

/**
 * RBAC helpers backed by AuthContext.user.role. Falls back to "readonly"
 * when no user is loaded so the UI never grants access by accident while
 * AuthContext is still rehydrating.
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role ?? 'readonly') as Role;

  const has = (...allowed: Role[]) => allowed.includes(role);

  const atLeast = (minimum: Role) =>
    (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimum] ?? 0);

  return {
    role,
    isAdmin: role === 'admin',
    isAnalyst: role === 'analyst',
    isReviewer: role === 'reviewer',
    isViewer: role === 'viewer' || role === 'readonly',
    /** Strict membership check: user must be one of the listed roles. */
    has,
    /** Hierarchical check: user role >= the given minimum. */
    atLeast,
    /**
     * Common permission predicates so callers don't repeat role logic.
     * Add new ones here as the product grows.
     */
    can: {
      manageApiKeys: role === 'admin',
      manageSources: role === 'admin',
      reviewMerges: role === 'admin' || role === 'reviewer',
      viewAuditTrail: role === 'admin' || role === 'reviewer',
      runSync: role === 'admin',
      seeOperations: role === 'admin' || role === 'reviewer',
      bulkScreen: role !== 'viewer' && role !== 'readonly',
    },
  };
}
