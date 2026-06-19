/**
 * "Continue with Google" button.
 *
 * Two responsibilities:
 *   1. Ask the backend whether Google OAuth is configured at all
 *      (GET /api/v1/auth/google/config → { enabled }). If not enabled,
 *      render nothing — no point showing a button that 503s on click.
 *   2. On click, navigate the WHOLE WINDOW to /api/v1/auth/google/login
 *      so the backend can set its `oauth_state` cookie and 302 us off to
 *      Google. We can't do this with axios — the browser needs to follow
 *      cross-origin redirects natively.
 *
 * The `next` query param echoes the originally-intended destination so
 * users who deep-linked to /admin/users, got bounced to /login, and
 * chose Google end up at /admin/users — not the homepage.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/services/api';

interface GoogleSignInButtonProps {
  /** "Iniciar sesión con Google" | "Registrarse con Google" — caller picks the copy. */
  label?: string;
  /** Hide the divider above the button (e.g., when it's the only auth option visible). */
  hideDivider?: boolean;
}

// Mirror of api.ts — same env var, same fallback. Inlined so this
// component doesn't have to import-and-re-export the constant just to
// reach the bare-host backend URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function GoogleSignInButton({
  label = 'Continuar con Google',
  hideDivider = false,
}: GoogleSignInButtonProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/v1/auth/google/config')
      .then((r) => {
        if (!cancelled) setEnabled(Boolean(r.data?.enabled));
      })
      .catch(() => {
        // Backend down or endpoint missing — fail closed (hide the
        // button) rather than show a control that won't work.
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (enabled === null) {
    // First paint: render a placeholder block of the same height so the
    // form doesn't shift when the config call lands.
    return <div className="h-[42px]" />;
  }
  if (!enabled) return null;

  const next =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';
  const loginUrl = `${API_BASE_URL}/api/v1/auth/google/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="space-y-3">
      {!hideDivider && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wider">
          <div className="flex-1 h-px bg-foreground/10" />
          <span>o</span>
          <div className="flex-1 h-px bg-foreground/10" />
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          // Full-page navigation, not router push — the backend needs
          // to set an HttpOnly cookie before bouncing to Google.
          window.location.href = loginUrl;
        }}
        className="w-full inline-flex items-center justify-center gap-3 rounded-md border border-foreground/15 bg-white hover:bg-gray-50 text-gray-800 font-medium px-4 py-2.5 transition-colors"
      >
        <GoogleGlyph className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </div>
  );
}

/** Google's official "G" mark, inlined to avoid pulling in a brand-icon dep. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.97h3.86c2.26-2.09 3.56-5.17 3.56-8.79z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.94l-3.86-2.97c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.64H1.29C.47 8.27 0 10.08 0 12s.47 3.73 1.29 5.36l3.98-3.07z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.64l3.98 3.07C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default GoogleSignInButton;
