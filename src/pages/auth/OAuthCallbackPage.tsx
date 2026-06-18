/**
 * OAuth callback landing page.
 *
 * Backend now owns the Google handshake and sets same-site session
 * cookies before redirecting the browser back to the SPA. This route
 * only hydrates /me and redirects to the destination.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
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
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
      return;
    }

    const next = params.get('next') || '/';

    if (raw) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    refreshUser()
      .then(() => {
        toast.success('Bienvenido');
        navigate(next, { replace: true });
      })
      .catch(() => {
        setError('No pudimos cargar tu perfil. Intenta de nuevo.');
        window.setTimeout(() => navigate('/login', { replace: true }), 1500);
      });
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
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
