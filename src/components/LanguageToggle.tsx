/**
 * Language toggle — flips the UI between Spanish (default) and English.
 *
 * Writes through react-i18next (persisted to localStorage "sentinel-lang"
 * by the LanguageDetector). The active language is also sent to the API on
 * every request, so switching re-localizes both UI strings and backend data.
 */
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { currentLang, type AppLang } from '@/i18n';

export function LanguageToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { i18n } = useTranslation();
  const lang = currentLang();
  const next: AppLang = lang === 'es' ? 'en' : 'es';
  const label = lang === 'es' ? 'Español' : 'English';

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={`${label} (cambiar a ${next.toUpperCase()})`}
      title={label}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        collapsed && 'justify-center px-0',
      )}
    >
      <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && (
        <span className="text-xs font-mono uppercase text-muted-foreground">{lang}</span>
      )}
    </button>
  );
}
