/**
 * Theme toggle — flips between the principal dark mode and light mode.
 *
 * Reads/writes through next-themes (storageKey "sentinel-theme"). The
 * `.dark` class on <html> drives the whole palette via CSS variables, so
 * this component only has to call setTheme().
 *
 * Renders nothing meaningful until mounted to avoid an icon/label that
 * mismatches the pre-paint theme set by the inline script in index.html.
 */
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const label = isDark ? t('common.theme.toLight') : t('common.theme.toDark');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        collapsed && 'justify-center px-0',
      )}
    >
      {/* Icon shows the action's target, the common convention: sun while in
          dark (tap → go light), moon while in light. */}
      {isDark ? (
        <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      {!collapsed && <span className="truncate">{isDark ? t('common.theme.light') : t('common.theme.dark')}</span>}
    </button>
  );
}
