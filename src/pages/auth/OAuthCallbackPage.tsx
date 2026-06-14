/**
 * OAuth callback landing page — receives the tokens the backend hands
 * off in the URL fragment after a successful Google login, persists
 * them, hydrates AuthContext, and navigates the user to `next`.
 *
 * URL shapes we handle:
 *   /auth/callback#access_token=…&refresh_token=…&role=admin&next=/
 *   /auth/callback#error=access_denied
 *
 * We use the fragment (not the query string) because it never crosses
 * the wire — the access token only lives in the browser.
 *
 * After processing we clean the URL with replaceState so a refresh
 * doesn't try to re-import an already-consumed (and now bogus, since
 * we set it as the active session) token. We do NOT depend on
 * window.location.hash for routing — `useEffect` parses it once on
 * mount, then we're done with it.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { tokenManager } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // StrictMode mounts effects twice in dev. The token-consume is
  // idempotent in practice (same tokens land twice) but the toast
  // would also fire twice — gate it.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const raw = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(raw);

    const oauthError = params.get('error');
    if (oauthError) {
      const friendly =
        oauthError === 'access_denied'
          ? 'Cancelaste el inicio de sesión con Google.'
          : `Error de Google: ${oauthError}`;
      setError(friendly);
      toast.error(friendly);
      // Give the user a chance to read the message before bouncing.
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const next = params.get('next') || '/';

    if (!accessToken || !refreshToken) {
      setError('Respuesta de autenticación incompleta.');
      toast.error('Respuesta de autenticación incompleta.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
      return;
    }

    // Wipe the fragment so the access token never survives a refresh
    // (or a "copy current URL" gesture by the user).
    window.history.replaceState(null, '', window.location.pathname);

    tokenManager.setToken(accessToken);
    tokenManager.setRefreshToken(refreshToken);

    // Hydrate AuthContext from /me so the rest of the app sees the
    // user immediately. We don't `await login()` — the tokens are
    // already in place; we just need to fetch the profile.
    refreshUser()
      .then(() => {
        toast.success('Bienvenido');
        navigate(next, { replace: true });
      })
      .catch(() => {
        setError('No pudimos cargar tu perfil. Intenta de nuevo.');
        tokenManager.clearTokens();
        window.setTimeout(() => navigate('/login', { replace: true }), 1500);
      });
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-brand-carbon flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 px-6"
      >
        {error ? (
          <>
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-red-300">{error}</p>
            <p className="text-sm text-gray-500">Te enviaremos al login…</p>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-electric-400 mx-auto animate-spin" />
            <p className="text-gray-300">Validando sesión con Google…</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default OAuthCallbackPage;
